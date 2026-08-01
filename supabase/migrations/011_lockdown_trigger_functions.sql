-- ============================================================================
-- Migration 011: tighten analytics insert policy + lock down trigger
-- functions from direct public RPC access
-- ============================================================================

-- --- 1. card_search_events: replace WITH CHECK (true) with a real check ---
-- The linter flags bare `true` INSERT policies as suspicious by pattern,
-- and it's right to ask the question even though this one really is
-- intentional (public write-only analytics — see migration 009). Rather
-- than just re-declaring the same permissiveness, this adds an actual
-- invariant: an apply_click event must always reference a real card, a
-- search event never should. Same practical openness (anyone can still
-- log a legitimate event), genuinely tighter than accepting anything.
drop policy if exists "card_search_events_insert_anyone" on public.card_search_events;

create policy "card_search_events_insert_anyone"
on public.card_search_events for insert
to anon, authenticated
with check (
  event_type in ('search', 'apply_click')
  and (event_type = 'apply_click') = (card_product_id is not null)
);

-- --- 2. Lock down trigger-only functions from direct public RPC calls ---
-- handle_new_user() and sync_annual_fee_reminder() are SECURITY DEFINER
-- functions meant to run ONLY as triggers (on auth.users insert, and on
-- user_cards insert/update respectively) — never meant to be called
-- directly. Postgres/PostgREST exposes every function in the `public`
-- schema as a callable RPC endpoint by default unless EXECUTE is
-- explicitly revoked, which is what the linter is flagging here.
--
-- This does NOT break the triggers themselves — trigger firing is an
-- internal Postgres execution path that doesn't go through the calling
-- role's EXECUTE privilege check, unlike a direct RPC call or SELECT
-- would. Only direct invocation (e.g. POST /rest/v1/rpc/handle_new_user)
-- is what gets blocked here.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.sync_annual_fee_reminder() from public, anon, authenticated;

-- --- Note on rls_auto_enable() ---
-- This function is NOT defined anywhere in this project's own schema.sql
-- or migrations — it's Supabase's own internal implementation of the
-- "Enable automatic RLS" project setting (Project Settings > Database).
-- Not something for this codebase to revoke/alter via a migration, since
-- it's platform-managed, not app-managed. If you want this lint to clear
-- too, the option is to turn that project setting off entirely in the
-- Supabase dashboard — this project no longer depends on it, since every
-- table's RLS state is now managed explicitly via schema.sql + these
-- migrations (see migrations 005 and 010, both of which exist specifically
-- because of surprises that setting caused).
