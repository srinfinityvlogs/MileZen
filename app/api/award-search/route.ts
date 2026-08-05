import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchAwardOptions } from '@/lib/award-engine/searchAwards';

export async function POST(request: Request) {
  const supabase = await createClient();

  const body = await request.json();
  const { originRegion, destRegion, cabin, strategy, heldProgrammeIds } = body;

  if (!originRegion || !destRegion || !cabin) {
    return NextResponse.json({ error: 'originRegion, destRegion, and cabin are required' }, { status: 400 });
  }

  const result = await searchAwardOptions(supabase, {
    originRegion,
    destRegion,
    cabin,
    strategy,
    heldProgrammeIds: Array.isArray(heldProgrammeIds) ? heldProgrammeIds : undefined,
  });
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json(result);
}
