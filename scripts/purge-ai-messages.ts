/**
 * Purges ai_messages older than the retention window.
 *
 * Uses the SERVICE ROLE client deliberately — this needs to delete across
 * every user's messages, which RLS (by design) wouldn't allow a normal
 * session to do. Run this on a schedule (Vercel Cron, GitHub Actions cron,
 * or Supabase's pg_cron) — never expose it as a callable API route.
 */
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const RETENTION_DAYS = 30;

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

  const { error, count } = await supabase
    .from('ai_messages')
    .delete({ count: 'exact' })
    .lt('created_at', cutoff.toISOString());

  if (error) {
    console.error('Purge failed:', error.message);
    process.exit(1);
  }

  console.log(`Purged ${count ?? 0} ai_messages rows older than ${RETENTION_DAYS} days.`);
}

main();
