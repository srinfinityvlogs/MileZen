-- ============================================================================
-- Migration 005: explicitly disable RLS on global reference tables
-- ============================================================================
-- These six tables are intentionally public-read via GRANT/REVOKE (see
-- schema.sql section 5), not RLS — everyone reads the same catalog data,
-- and writes are restricted to the service-role ingestion script.
--
-- If your Supabase project has the "Enable automatic RLS" project setting
-- turned on, it force-enables RLS on newly created tables — including
-- these — with zero policies, which makes every query against them
-- silently return zero rows (not an error). This migration corrects that
-- for these six tables specifically. Safe to run even if RLS was never
-- enabled on them — disabling already-disabled RLS is a no-op.
-- ============================================================================

alter table public.issuers            disable row level security;
alter table public.programmes         disable row level security;
alter table public.card_products      disable row level security;
alter table public.transfer_partners  disable row level security;
alter table public.award_charts       disable row level security;
alter table public.mcc_rules          disable row level security;
