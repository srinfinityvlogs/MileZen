-- ============================================================================
-- Migration 003: reference-data provenance + upsert constraints
-- ============================================================================
-- The ingestion pipeline upserts by natural key (not UUID) so maintainers
-- can write human-readable JSON without knowing database IDs. That requires
-- unique constraints to upsert against, and provenance fields so every
-- award-chart/transfer-partner entry can be traced back to where it came
-- from and when it was last checked.
-- ============================================================================

-- transfer_partners already has a unique constraint on
-- (from_programme_id, to_programme_id) from the original schema — add
-- provenance fields to match award_charts.
alter table public.transfer_partners
  add column source_url    text,
  add column last_verified date;

-- award_charts already had source_note + last_verified from the original
-- schema, but not a structured source_url — add it for consistency with
-- transfer_partners so every reference-data row can link to its source.
alter table public.award_charts
  add column source_url text;

-- award_charts had no unique constraint yet (a chart can be re-run safely
-- without creating duplicate rows once this exists).
alter table public.award_charts
  add constraint award_charts_unique_route
  unique (programme_id, origin_region, dest_region, cabin);

-- Fast lookup for the staleness-report script.
create index if not exists idx_award_charts_last_verified
  on public.award_charts (last_verified);
create index if not exists idx_transfer_partners_last_verified
  on public.transfer_partners (last_verified);
