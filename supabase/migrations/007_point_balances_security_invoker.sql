-- ============================================================================
-- Migration 007: fix point_balances view to actually respect RLS
-- ============================================================================
-- IMPORTANT SECURITY FIX: Postgres views run with the permissions of their
-- OWNER by default (typically the `postgres` superuser in Supabase), not
-- the querying user — which means they silently BYPASS Row Level Security
-- on the underlying table unless created with `security_invoker = true`
-- (available since Postgres 15). The original point_balances view in
-- schema.sql was missing this, meaning it may have been able to return
-- every user's point_ledger sums, not just the caller's own — directly
-- undermining the RLS-based multi-user isolation this schema is built
-- around. This recreates the view correctly.
--
-- To verify the fix worked: sign in as one user, query `point_balances`,
-- and confirm you only ever see your own programme_id rows, never another
-- user's, even though the view has no explicit WHERE user_id = ... clause
-- — the RLS policy on point_ledger should now be doing that filtering
-- automatically, the same way it does for direct table queries.
-- ============================================================================

drop view if exists public.point_balances;

create view public.point_balances
with (security_invoker = true)
as
  select user_id, programme_id, sum(points) as balance
  from public.point_ledger
  group by user_id, programme_id;
