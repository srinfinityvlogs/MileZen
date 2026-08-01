import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runConciergeTurn } from '@/lib/ai-concierge/callModel';

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_TURNS = 6; // bounds token cost regardless of what the client sends

// POST /api/concierge   body: { message: string, history?: { role, content }[] }
//
// Public route — no auth, no account, nothing persisted server-side.
// Conversation history lives only in the browser tab's own state and is
// sent back with each request so the model has context within a single
// session; nothing is written to a database anywhere in this flow.
export async function POST(request: Request) {
  const supabase = await createClient();

  const body = await request.json();
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  const clientHistory = Array.isArray(body?.history) ? body.history : [];

  if (!message) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: `message exceeds ${MAX_MESSAGE_LENGTH} characters` }, { status: 413 });
  }

  const history = clientHistory
    .filter((m: any) => (m?.role === 'user' || m?.role === 'assistant') && typeof m?.content === 'string')
    .slice(-MAX_HISTORY_TURNS);

  let reply: string;
  try {
    reply = await runConciergeTurn(supabase, history, message);
  } catch (err) {
    console.error('Concierge turn failed', (err as Error).message);
    return NextResponse.json({ error: 'The concierge is unavailable right now.' }, { status: 502 });
  }

  return NextResponse.json({ reply });
}
