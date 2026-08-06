-- supabase/migrations/014_add_card_lounge_access.sql
ALTER TABLE card_products
  ADD COLUMN IF NOT EXISTS lounge_access boolean NOT NULL DEFAULT false;
