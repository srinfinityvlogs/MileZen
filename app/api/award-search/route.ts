import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchAwardOptions } from '@/lib/award-engine/searchAwards';

// POST /api/award-search
// body: { originRegion, destRegion, cabin, strategy }
//
// Thin wrapper around lib/award-engine/searchAwards.ts — the same core
// function is also called directly (in-process, no HTTP hop) by the AI
// concierge's search_award_options tool, so both surfaces share one
// implementation and one set of RLS guarantees.
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const { originRegion, destRegion, cabin, strategy } = body;

  if (!originRegion || !destRegion || !cabin) {
    return NextResponse.json({ error: 'originRegion, destRegion, and cabin are required' }, { status: 400 });
  }

  const result = await searchAwardOptions(supabase, { originRegion, destRegion, cabin, strategy });
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json(result);
}
