-- ============================================================================
-- Migration 013: award_route_charts (airport-pair award chart with taxes)
-- ============================================================================
-- Different granularity than award_charts (which is region-based, e.g.
-- "North India" -> "UK"): this table holds specific airport pairs with
-- separate onward/return points and taxes, matching how real published
-- award charts (e.g. Air India's Maharaja Club chart) are actually laid
-- out. Powers the public /redeem-miles page.
--
-- Same RLS pattern as migration 010: enabled with an explicit
-- public-read policy from the start, not left RLS-off relying on grants
-- alone — that pattern already bit this project once (migration 005).
-- ============================================================================

create table public.award_route_charts (
  id             uuid primary key default gen_random_uuid(),
  programme_id   uuid not null references public.programmes(id),
  from_airport   text not null,
  to_airport     text not null,
  city           text not null,
  country        text not null,
  cabin          text not null default 'economy'
                   check (cabin in ('economy','premium_economy','business','first')),
  points_onward  integer not null,
  taxes_onward   numeric(10,2) not null,
  points_return  integer not null,
  taxes_return   numeric(10,2) not null,
  source_note    text,
  source_url     text,
  last_verified  date,
  unique (programme_id, from_airport, to_airport, cabin)
);

alter table public.award_route_charts enable row level security;

create policy "award_route_charts_select_all" on public.award_route_charts
  for select to anon, authenticated using (true);

create index idx_award_route_charts_from on public.award_route_charts (from_airport);
create index idx_award_route_charts_country on public.award_route_charts (country);
