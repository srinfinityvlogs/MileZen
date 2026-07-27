-- ============================================================================
-- Migration 008: affiliate/marketing fields on card_products
-- ============================================================================
-- Supports the public "find a card" search — no auth required, since the
-- target user hasn't signed up yet. card_products already has a public
-- SELECT grant for both `authenticated` AND `anon` roles (schema.sql
-- section 5), so no RLS/grant changes are needed here — only new columns.
-- ============================================================================

alter table public.card_products
  add column affiliate_link  text,   -- "Apply Now" destination; null = not yet available to recommend
  add column tagline         text,   -- short marketing line, e.g. "Best for frequent flyers"
  add column fee_waiver_note text;   -- e.g. "Waived on ₹3L+ annual spend" — shown alongside the fee
