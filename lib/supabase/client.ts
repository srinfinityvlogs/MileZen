import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

// Client-side Supabase instance. Uses the PUBLIC anon key only.
// All queries made through this client are subject to Row Level Security —
// this is safe to ship to the browser precisely because RLS enforces
// per-user isolation at the database layer, not in application code.
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Copy .env.local.example to .env.local, fill in your Supabase project values, and restart the dev server.'
    );
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
