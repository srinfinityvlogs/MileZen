-- ============================================================================
-- Migration 010: enable RLS with explicit public-read policies on
-- reference tables (resolves Supabase's "RLS Disabled in Public" lint)
-- ============================================================================
-- These six tables (issuers, programmes, transfer_partners, card_products,
-- award_charts, mcc_rules) were originally built to rely on GRANT/REVOKE
-- alone, with RLS deliberately left off (see schema.sql section 5) —
-- everyone reads the same catalog, only the service role writes.
--
-- That worked, but proved fragile in practice: migration 005 exists
-- because Supabase's "Enable automatic RLS" project setting silently
-- force-enabled RLS on these same tables with ZERO policies, which made
-- every query against them return empty results until it was found and
-- disabled. Depending on RLS staying *off* turned out to be exactly the
-- kind of assumption that project-level settings outside this repo's own
-- SQL can quietly break.
--
-- The fix here is the more robust version of the same intent: RLS
-- properly ON, with an explicit "anyone can read" policy. Functionally
-- identical access (public read, write restricted to service_role, which
-- bypasses RLS entirely) — but this state is self-documenting and can't
-- silently regress into "RLS on with no policy" again, since the policy
-- is now part of the schema itself rather than an absence to protect.
-- This also resolves Supabase's database linter flagging these tables
-- as ERROR-level "RLS Disabled in Public".
-- ============================================================================

alter table public.issuers           enable row level security;
alter table public.programmes        enable row level security;
alter table public.transfer_partners enable row level security;
alter table public.card_products     enable row level security;
alter table public.award_charts      enable row level security;
alter table public.mcc_rules         enable row level security;

create policy "issuers_select_all" on public.issuers
  for select to anon, authenticated using (true);

create policy "programmes_select_all" on public.programmes
  for select to anon, authenticated using (true);

create policy "transfer_partners_select_all" on public.transfer_partners
  for select to anon, authenticated using (true);

create policy "card_products_select_all" on public.card_products
  for select to anon, authenticated using (true);

create policy "award_charts_select_all" on public.award_charts
  for select to anon, authenticated using (true);

create policy "mcc_rules_select_all" on public.mcc_rules
  for select to anon, authenticated using (true);

-- No insert/update/delete policies on any of these — combined with the
-- existing REVOKE in schema.sql section 5, this means only service_role
-- (which bypasses RLS entirely) can ever write to these six tables.
