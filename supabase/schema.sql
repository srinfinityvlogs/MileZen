-- ============================================================================
-- MileZen — Database Schema (Postgres / Supabase)
-- ============================================================================
-- Design principles:
--   1. UUID primary keys everywhere (no sequential IDs to guess/enumerate)
--   2. Reference data (issuers, programmes, transfer ratios, award charts)
--      is global and has NO user_id — same for every user, written only by
--      the service role / an admin ingestion job, never by end users.
--   3. User data (cards, transactions, ledger, reminders) always carries
--      user_id and always has RLS enabled — enforced at the DB layer.
--   4. The points ledger is APPEND-ONLY. Never UPDATE a historical entry;
--      corrections are new reversing rows. This gives a full audit trail.
--   5. No full card numbers are ever stored — last 4 digits only.
--   6. Uploaded statement files live in object storage; DB stores metadata
--      + a storage pointer only, never raw file bytes or extracted PII blobs
--      longer than needed.
-- ============================================================================

create extension if not exists "pgcrypto";      -- for gen_random_uuid()

-- ============================================================================
-- 1. PROFILES  (extends Supabase's built-in auth.users)
-- ============================================================================
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  display_name    text,
  timezone        text default 'UTC',
  ai_context_opt_in boolean not null default true,  -- lets user disable AI concierge entirely
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
-- no insert/delete policy for users — row is created by a trigger on signup (see bottom)


-- ============================================================================
-- 2. GLOBAL REFERENCE DATA  (no RLS needed — public read, admin-only write)
-- ============================================================================

create table public.issuers (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,          -- 'HDFC Bank', 'Amex', 'Chase'
  country      text,
  logo_url     text
);

create table public.programmes (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,          -- 'Avios', 'SmartBuy Points', 'Qantas FF'
  type         text not null check (type in ('bank_currency','airline','hotel','other')),
  issuer_id    uuid references public.issuers(id),  -- null for airline/hotel programmes
  home_country text
);

create table public.card_products (
  id             uuid primary key default gen_random_uuid(),
  issuer_id      uuid not null references public.issuers(id),
  name           text not null,               -- 'Infinia', 'Platinum Card'
  network        text,                        -- 'Visa','Mastercard','Amex'
  annual_fee     numeric(10,2),
  currency       text default 'INR',
  earn_programme_id uuid references public.programmes(id),  -- points it earns into
  unique (issuer_id, name)
);

-- transfer partner graph: edges between programmes
create table public.transfer_partners (
  id                uuid primary key default gen_random_uuid(),
  from_programme_id uuid not null references public.programmes(id),
  to_programme_id   uuid not null references public.programmes(id),
  ratio_from        integer not null default 1,   -- e.g. 1000
  ratio_to          integer not null default 1,   -- e.g. 1000  -> 1:1
  transfer_time      text,                          -- 'instant', '~1 day', '≤6 wks'
  min_transfer       integer,
  is_active          boolean not null default true,
  unique (from_programme_id, to_programme_id)
);

-- award chart: what a redemption costs on a given programme/route/cabin
create table public.award_charts (
  id             uuid primary key default gen_random_uuid(),
  programme_id   uuid not null references public.programmes(id),
  origin_region  text not null,       -- 'North India', 'US East Coast' etc (region-level, not every airport)
  dest_region    text not null,
  cabin          text not null check (cabin in ('economy','premium_economy','business','first')),
  points_cost    integer not null,
  source_note    text,                -- 'published chart' / 'observed 2026-06'
  last_verified  date
);

-- MCC -> reward category mapping (for "which card should I swipe")
create table public.mcc_rules (
  id            uuid primary key default gen_random_uuid(),
  card_product_id uuid not null references public.card_products(id),
  mcc_code      text not null,
  mcc_label     text,                 -- 'Restaurants'
  reward_rate   numeric(6,2) not null,-- e.g. 10 (percent) or 5 (points/currency unit)
  reward_type   text not null check (reward_type in ('cashback_pct','points_per_unit'))
);


-- ============================================================================
-- 3. USER DATA  (RLS enforced on every table)
-- ============================================================================

-- A user's actual card (instance of a card_product)
create table public.user_cards (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  card_product_id  uuid not null references public.card_products(id),
  nickname         text,
  last4            text check (char_length(last4) = 4),   -- last 4 digits ONLY
  opened_date      date,
  annual_fee_date  date,             -- next fee due date, for reminders
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

alter table public.user_cards enable row level security;
create policy "user_cards_all_own" on public.user_cards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- Uploaded statement files — metadata only. Actual PDF bytes live in
-- Supabase Storage (private bucket), referenced by storage_path.
create table public.statements (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  user_card_id   uuid references public.user_cards(id) on delete set null,
  storage_path   text not null,        -- path in private bucket, never a public URL
  source         text not null check (source in ('upload','forwarded_email')),
  status         text not null default 'pending' check (status in ('pending','parsed','failed')),
  uploaded_at    timestamptz not null default now(),
  parsed_at      timestamptz
);

alter table public.statements enable row level security;
create policy "statements_all_own" on public.statements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- Card transactions, parsed from statements or entered manually
create table public.transactions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  user_card_id   uuid not null references public.user_cards(id) on delete cascade,
  statement_id   uuid references public.statements(id) on delete set null,
  txn_date       date not null,
  merchant       text not null,
  mcc_code       text,
  amount         numeric(12,2) not null,
  currency       text not null default 'INR',
  points_earned  numeric(12,2),
  category_note  text,
  created_at     timestamptz not null default now()
);

alter table public.transactions enable row level security;
create policy "transactions_all_own" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index on public.transactions (user_id, txn_date desc);


-- APPEND-ONLY points ledger. Never UPDATE a row here — corrections are
-- new reversing entries. Current balance = sum of entries per programme.
create table public.point_ledger (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  programme_id   uuid not null references public.programmes(id),
  entry_type     text not null check (entry_type in
                   ('earn','transfer_out','transfer_in','redeem','expire','adjustment','reversal')),
  points         numeric(14,2) not null,      -- positive or negative
  related_txn_id uuid references public.transactions(id) on delete set null,
  related_entry_id uuid references public.point_ledger(id), -- links a reversal to original
  note           text,
  occurred_at    timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

alter table public.point_ledger enable row level security;
-- Only insert + select — no update/delete policy at all, enforcing append-only at the DB layer
create policy "point_ledger_select_own" on public.point_ledger
  for select using (auth.uid() = user_id);
create policy "point_ledger_insert_own" on public.point_ledger
  for insert with check (auth.uid() = user_id);

create index on public.point_ledger (user_id, programme_id);

-- Convenience view: current balance per user per programme
create view public.point_balances as
  select user_id, programme_id, sum(points) as balance
  from public.point_ledger
  group by user_id, programme_id;


-- Reminders (annual fee, point expiry, custom)
create table public.reminders (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  user_card_id   uuid references public.user_cards(id) on delete cascade,
  programme_id   uuid references public.programmes(id),
  reminder_type  text not null check (reminder_type in ('annual_fee','point_expiry','custom')),
  due_date       date not null,
  message        text,
  is_dismissed   boolean not null default false,
  created_at     timestamptz not null default now()
);

alter table public.reminders enable row level security;
create policy "reminders_all_own" on public.reminders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- AI concierge conversation log — short retention by design (see app-layer
-- cron that purges rows older than N days). Only minimal derived context
-- should ever be written here, never raw statement text.
create table public.ai_messages (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  role           text not null check (role in ('user','assistant')),
  content        text not null,
  created_at     timestamptz not null default now()
);

alter table public.ai_messages enable row level security;
create policy "ai_messages_all_own" on public.ai_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- Security audit log — records sensitive actions (login, export, delete).
-- Written only by backend/service role, readable only by the owning user.
create table public.audit_log (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete set null,
  action         text not null,        -- 'login','statement_upload','data_export','account_delete'
  ip_hash        text,                 -- store a hash, not the raw IP
  metadata       jsonb,
  created_at     timestamptz not null default now()
);

alter table public.audit_log enable row level security;
create policy "audit_log_select_own" on public.audit_log
  for select using (auth.uid() = user_id);
-- no insert policy for regular users — only service_role (bypasses RLS) writes here


-- ============================================================================
-- 4. AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================================
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ============================================================================
-- 5. LOCK DOWN REFERENCE TABLES
-- ============================================================================
-- Reference tables have no RLS (they're public read for any authenticated
-- user), but must NOT be writable by the anon/authenticated role — only
-- your service_role (used by an admin/ingestion script) can INSERT/UPDATE.
-- In Supabase this means: do NOT grant insert/update/delete to `authenticated`
-- on issuers, programmes, card_products, transfer_partners, award_charts, mcc_rules.
revoke insert, update, delete on
  public.issuers, public.programmes, public.card_products,
  public.transfer_partners, public.award_charts, public.mcc_rules
from authenticated, anon;

grant select on
  public.issuers, public.programmes, public.card_products,
  public.transfer_partners, public.award_charts, public.mcc_rules
to authenticated, anon;
