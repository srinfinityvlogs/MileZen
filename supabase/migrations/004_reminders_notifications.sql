-- ============================================================================
-- Migration 004: reminder notifications + auto-synced annual fee reminders
-- ============================================================================
-- Design: user_cards.annual_fee_date is the single source of truth for a
-- card's fee due date. A trigger keeps a matching `reminders` row in sync
-- automatically whenever that date is set or changed — so app code never
-- has to remember to separately touch the reminders table when adding a
-- card, and the cron "roll forward to next year" job only ever needs to
-- update user_cards, never the reminders table directly.
-- ============================================================================

alter table public.reminders
  add column notified_at timestamptz;

-- One annual-fee reminder per card, always — enforced at the DB level so
-- the trigger below can safely upsert without ever creating duplicates.
create unique index reminders_one_annual_fee_per_card
  on public.reminders (user_card_id)
  where reminder_type = 'annual_fee';

create function public.sync_annual_fee_reminder()
returns trigger as $$
begin
  if new.annual_fee_date is null then
    delete from public.reminders
      where user_card_id = new.id and reminder_type = 'annual_fee';
    return new;
  end if;

  insert into public.reminders (user_id, user_card_id, reminder_type, due_date, message)
  values (new.user_id, new.id, 'annual_fee', new.annual_fee_date, 'Annual fee due')
  on conflict (user_card_id) where reminder_type = 'annual_fee'
  do update set
    due_date     = excluded.due_date,
    is_dismissed = false,      -- new cycle — surface it again
    notified_at  = null;       -- reset so the notify job sends a fresh email

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_sync_annual_fee_reminder
  after insert or update of annual_fee_date on public.user_cards
  for each row execute procedure public.sync_annual_fee_reminder();
