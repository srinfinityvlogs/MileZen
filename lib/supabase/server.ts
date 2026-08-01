import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Plain anon-key client — no cookies, no session, no auth. Every page and
// tool in this app reads only public reference data (card_products,
// mcc_rules, award_charts, award_route_charts, transfer_partners,
// programmes, issuers), all granted SELECT to the `anon` role with
// explicit RLS read policies (see schema.sql section 5 and migration 010).
// There's no signed-in user anywhere in this app, so there's nothing for
// a cookie-based session client to do that this doesn't already cover.
export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Copy .env.local.example to .env.local, fill in your Supabase project values, and restart the dev server.'
    );
  }

  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey);
}
