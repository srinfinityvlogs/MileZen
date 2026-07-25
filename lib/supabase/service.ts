import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// ============================================================================
// DANGER ZONE — SERVICE ROLE CLIENT
// ============================================================================
// This client BYPASSES Row Level Security entirely. It has full read/write
// access to every user's data.
//
// Rules for using this file:
//   1. Only import this in server-only code: scheduled jobs (reminders,
//      ledger reconciliation), admin scripts that write reference data
//      (issuers/programmes/award_charts), and the inbound-email webhook
//      handler (which must look up a user by their unique inbound address
//      before switching back to scoped queries).
//   2. NEVER import this inside a Server Action or Route Handler that
//      responds to an ordinary authenticated user's request unless you
//      manually re-check auth.uid() yourself in the query.
//   3. NEVER import this in any file under app/**/page.tsx or any client
//      component. It will crash on the client anyway (no `window`), but
//      don't rely on that — keep it out of the client bundle entirely.
// ============================================================================
export function createServiceClient() {
  if (typeof window !== 'undefined') {
    throw new Error('createServiceClient() must never be called from the browser.');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. " +
        "Set both in .env.local (local) or your deployment platform's env vars (production)."
    );
  }

  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
