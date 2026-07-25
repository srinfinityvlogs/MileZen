-- ============================================================================
-- Migration 006: mcc_rules unique constraint
-- ============================================================================
-- Needed so the ingestion script can upsert by natural key (card + MCC
-- code) instead of duplicating rows on every re-run.
-- ============================================================================

alter table public.mcc_rules
  add constraint mcc_rules_unique_card_mcc
  unique (card_product_id, mcc_code);
