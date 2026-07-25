-- ============================================================================
-- Migration 002: numeric transfer-speed field
-- ============================================================================
-- transfer_time (text) stays for display ("instant", "~1 day", "≤6 wks").
-- transfer_time_max_days (int) is what the path-ranking code actually sorts
-- on — always populate both when you add/update a transfer_partners row.
-- ============================================================================

alter table public.transfer_partners
  add column transfer_time_max_days integer not null default 0;

comment on column public.transfer_partners.transfer_time_max_days is
  'Worst-case days for this transfer to post, used for "fastest path" ranking. 0 = instant.';
