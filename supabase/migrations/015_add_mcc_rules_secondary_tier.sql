-- supabase/migrations/015_add_mcc_rules_secondary_tier.sql
ALTER TABLE mcc_rules
  ADD COLUMN IF NOT EXISTS secondary_reward_rate numeric,
  ADD COLUMN IF NOT EXISTS secondary_reward_note text;

ALTER TABLE card_products
  ADD COLUMN IF NOT EXISTS reward_point_value_inr numeric;
