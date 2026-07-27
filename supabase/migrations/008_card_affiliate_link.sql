-- ============================================================================
-- Migration 008: affiliate link field for public card discovery
-- ============================================================================
-- Supports a new PUBLIC (no-login) "find a card" search. card_products
-- already has everything else needed (annual_fee, and reward rates via
-- mcc_rules) — this just adds where "Apply Now" should point.
--
-- Nullable and separate from ranking logic on purpose: a card with no
-- affiliate_link yet should still show up in search results (ranked
-- purely on reward rate, per product decision), just with the Apply
-- button pointing somewhere honest instead — see the ingestion script
-- and search route for how a missing link is handled.
-- ============================================================================

alter table public.card_products
  add column affiliate_link text,
  add column tagline text,
  add column fee_waiver_note text;

comment on column public.card_products.tagline is
  'Short marketing blurb for public card-search results, e.g. "5X points on dining, no cap".';
comment on column public.card_products.fee_waiver_note is
  'e.g. "Fee waived on ₹3L+ annual spend" — display-only, not used in ranking logic.';
