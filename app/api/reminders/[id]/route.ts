import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// PATCH /api/reminders/:id  body: { isDismissed: true }
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();

  // RLS scopes this update to rows the caller owns — a mismatched id
  // (someone else's reminder) simply matches zero rows, never errors
  // with information about whether it exists.
  const { error } = await supabase
    .from('reminders')
    .update({ is_dismissed: Boolean(body.isDismissed) })
    .eq('id', id);

  if (error) return NextResponse.json({ error: 'Failed to update reminder' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/reminders/:id
// Note: deleting an 'annual_fee' reminder here won't stick — the trigger
// will recreate it next time annual_fee_date is touched. To actually
// remove it, clear the card's annual_fee_date instead (see
// sync_annual_fee_reminder() in migration 004).
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { error } = await supabase.from('reminders').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Failed to delete reminder' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
