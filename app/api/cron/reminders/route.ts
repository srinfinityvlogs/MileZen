import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sendReminderEmail } from '@/lib/email/sendReminderEmail';

const NOTIFY_WINDOW_DAYS = 7;   // notify once a reminder is this close (or overdue)
const AUTO_DISMISS_GRACE_DAYS = 14; // one-off reminders past due by this long get auto-dismissed

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function addDaysIso(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// GET /api/cron/reminders — invoked daily by Vercel Cron (see vercel.json).
// Protected by CRON_SECRET, which Vercel automatically sends as a Bearer
// token on scheduled invocations — see README for the verification pattern.
// This is the ONE place in the app that legitimately needs the
// service-role client: it must read/notify across every user, which RLS
// (correctly) would never allow a normal session to do.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const today = todayIso();
  const summary = { notified: 0, emailFailures: 0, rolledForward: 0, autoDismissed: 0 };

  // --- 1. Notify on anything due within the window, not yet notified ----
  // Deliberately runs BEFORE the rollover step below. If an annual-fee
  // reminder is both overdue AND unnotified (e.g. this is the first cron
  // run since it lapsed), it must get its notification using the
  // CURRENT due date here first — otherwise step 2 would roll it forward
  // to next year and this cycle's notification would be silently skipped,
  // since the due date would no longer fall within the notify window.
  const windowEnd = addDaysIso(new Date(), NOTIFY_WINDOW_DAYS);
  const { data: toNotify } = await supabase
    .from('reminders')
    .select('id, user_id, reminder_type, due_date, message, user_cards(nickname), programmes(name)')
    .is('notified_at', null)
    .eq('is_dismissed', false)
    .lte('due_date', windowEnd);

  for (const reminder of toNotify ?? []) {
    const { data: authUser } = await supabase.auth.admin.getUserById(reminder.user_id);
    const email = authUser?.user?.email;
    if (!email) continue;

    const subject =
      reminder.reminder_type === 'annual_fee'
        ? `Annual fee due soon: ${(reminder as any).user_cards?.nickname ?? 'your card'}`
        : `MileZen reminder: ${reminder.message ?? (reminder as any).programmes?.name ?? 'upcoming'}`;

    const result = await sendReminderEmail(
      email,
      subject,
      `Due date: ${reminder.due_date}\n${reminder.message ?? ''}`
    );

    if (result.skipped) continue; // no email provider configured — don't mark as notified, retry next run
    if (result.ok) {
      await supabase.from('reminders').update({ notified_at: new Date().toISOString() }).eq('id', reminder.id);
      summary.notified++;
    } else {
      summary.emailFailures++;
    }
  }

  // --- 2. Roll forward past-due annual-fee reminders by one year --------
  // We update user_cards.annual_fee_date (the source of truth); the
  // sync_annual_fee_reminder() trigger then updates the reminders row
  // automatically (including resetting notified_at to null, so next
  // year's cycle gets its own fresh notification) — this route never
  // writes to `reminders` directly for this part.
  const { data: dueAnnualFees } = await supabase
    .from('reminders')
    .select('user_card_id, due_date')
    .eq('reminder_type', 'annual_fee')
    .lt('due_date', today);

  for (const row of dueAnnualFees ?? []) {
    if (!row.user_card_id || !row.due_date) continue;
    const nextDue = addDaysIso(new Date(row.due_date), 365);
    const { error } = await supabase
      .from('user_cards')
      .update({ annual_fee_date: nextDue })
      .eq('id', row.user_card_id);
    if (!error) summary.rolledForward++;
  }

  // --- 3. Auto-dismiss stale one-off reminders (not annual_fee, which
  //         auto-renews via the trigger and never needs this) -----------
  const staleCutoff = addDaysIso(new Date(), -AUTO_DISMISS_GRACE_DAYS);
  const { data: dismissed } = await supabase
    .from('reminders')
    .update({ is_dismissed: true })
    .neq('reminder_type', 'annual_fee')
    .lt('due_date', staleCutoff)
    .eq('is_dismissed', false)
    .select('id');
  summary.autoDismissed = dismissed?.length ?? 0;

  return NextResponse.json(summary);
}
