-- ============================================================================
-- Migration 009: card search / apply-click analytics
-- ============================================================================
-- Tracks the /find-a-card funnel: search events (category + fee tier) and
-- apply-click events (which card, from which search context). This is
-- deliberately NOT tied to any user_id — /find-a-card is a fully public,
-- unauthenticated page, so there's no user to attribute this to, and it
-- shouldn't try to fingerprint/identify visitors either.
--
-- Write-only from the client's perspective: anon and authenticated roles
-- can INSERT (so both signed-out visitors and logged-in users searching
-- this page can log events), but there is no SELECT policy at all — only
-- the service role can read this back (e.g. a future analytics script).
-- This prevents anyone from scraping aggregate search/click data through
-- the public API.
-- ============================================================================

create table public.card_search_events (
  id              uuid primary key default gen_random_uuid(),
  event_type      text not null check (event_type in ('search', 'apply_click')),
  category        text,
  fee_tier        text,
  card_product_id uuid references public.card_products(id) on delete set null,
  created_at      timestamptz not null default now()
);

alter table public.card_search_events enable row level security;

create policy "card_search_events_insert_anyone"
on public.card_search_events for insert
to anon, authenticated
with check (true);

-- No select policy — intentional. Only service_role (which bypasses RLS)
-- can read this table back, e.g. for a future analytics dashboard/script.

create index idx_card_search_events_created_at on public.card_search_events (created_at desc);
create index idx_card_search_events_card_product_id on public.card_search_events (card_product_id);
