import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/reminders — list the caller's own upcoming reminders
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data, error } = await supabase
    .from('reminders')
    .select('id, reminder_type, due_date, message, is_dismissed, user_cards(nickname), programmes(name)')
    .order('due_date', { ascending: true });

  if (error) return NextResponse.json({ error: 'Failed to load reminders' }, { status: 500 });
  return NextResponse.json({ reminders: data });
}

// POST /api/reminders — create a point_expiry or custom reminder.
// 'annual_fee' reminders are intentionally NOT creatable here — they're
// auto-managed by a DB trigger off user_cards.annual_fee_date (see
// supabase/migrations/004_reminders_notifications.sql), so there's a
// single source of truth and no risk of the two drifting apart.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const { reminderType, dueDate, message, programmeId, userCardId } = body as {
    reminderType?: string;
    dueDate?: string;
    message?: string;
    programmeId?: string;
    userCardId?: string;
  };

  if (!['point_expiry', 'custom'].includes(reminderType ?? '')) {
    return NextResponse.json(
      { error: "reminderType must be 'point_expiry' or 'custom' (annual_fee is auto-managed)" },
      { status: 400 }
    );
  }
  if (!dueDate || Number.isNaN(Date.parse(dueDate))) {
    return NextResponse.json({ error: 'A valid dueDate is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('reminders')
    .insert({
      user_id: user.id,
      reminder_type: reminderType,
      due_date: dueDate,
      message: message ?? null,
      programme_id: programmeId ?? null,
      user_card_id: userCardId ?? null,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: 'Failed to create reminder' }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
