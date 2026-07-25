import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runConciergeTurn } from '@/lib/ai-concierge/callModel';

const MAX_MESSAGE_LENGTH = 2000;
const HISTORY_TURNS = 6;          // how much prior context we feed back to the model
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_MESSAGES = 8; // basic abuse/cost guard, tune as needed

// POST /api/concierge   body: { message: string }
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Respect the user's own opt-out — set on their profile, never assume.
  const { data: profile } = await supabase.from('profiles').select('ai_context_opt_in').eq('id', user.id).single();
  if (profile && profile.ai_context_opt_in === false) {
    return NextResponse.json(
      { error: 'The AI concierge is turned off for this account. Enable it in Settings to use it.' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const message = typeof body?.message === 'string' ? body.message.trim() : '';

  if (!message) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: `message exceeds ${MAX_MESSAGE_LENGTH} characters` }, { status: 413 });
  }

  // Basic per-user rate limit — bounds cost and abuse. For real production
  // traffic, move this to a shared store (Upstash Redis, etc.) since this
  // per-request DB count doesn't hold up under high concurrency; it's
  // sufficient for a free-tier / early-stage deployment.
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString();
  const { count } = await supabase
    .from('ai_messages')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'user')
    .gte('created_at', windowStart);
  if ((count ?? 0) >= RATE_LIMIT_MAX_MESSAGES) {
    return NextResponse.json({ error: 'Too many messages — try again in a minute.' }, { status: 429 });
  }

  // Recent history only — bounds token cost and limits how much
  // conversation content sits in ai_messages / gets resent per turn.
  const { data: historyRows } = await supabase
    .from('ai_messages')
    .select('role, content')
    .order('created_at', { ascending: false })
    .limit(HISTORY_TURNS);
  const history = (historyRows ?? []).reverse() as { role: 'user' | 'assistant'; content: string }[];

  let reply: string;
  try {
    reply = await runConciergeTurn(supabase, history, message);
  } catch (err) {
    console.error('Concierge turn failed', { userId: user.id, message: (err as Error).message });
    return NextResponse.json({ error: 'The concierge is unavailable right now.' }, { status: 502 });
  }

  // Persist only the distilled text exchange — never tool inputs/outputs,
  // never anything beyond what's shown to the user.
  await supabase.from('ai_messages').insert([
    { user_id: user.id, role: 'user', content: message },
    { user_id: user.id, role: 'assistant', content: reply },
  ]);

  return NextResponse.json({ reply });
}
