/**
 * MileZen reference-data staleness report.
 *
 * Award charts and transfer ratios change — banks adjust ratios, airlines
 * revalue charts. A row nobody has re-checked in months is a silent
 * correctness bug (MileZen would confidently tell a user a wrong price).
 * This script surfaces that instead of letting it rot invisibly.
 *
 * Run this periodically (manually, or on a schedule via GitHub Actions —
 * see .github/workflows/stale-reference-data.yml) and turn its output into
 * a checklist of what to go re-verify.
 *
 * Read-only: uses the anon key, not the service role, since it only needs
 * SELECT on public reference tables.
 */
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const STALE_AFTER_DAYS = 90;

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - STALE_AFTER_DAYS);
  const cutoffIso = cutoff.toISOString().slice(0, 10);

  const { data: staleCharts, error: chartError } = await supabase
    .from('award_charts')
    .select('origin_region, dest_region, cabin, last_verified, programmes(name)')
    .or(`last_verified.is.null,last_verified.lt.${cutoffIso}`)
    .order('last_verified', { ascending: true, nullsFirst: true });

  const { data: staleEdges, error: edgeError } = await supabase
    .from('transfer_partners')
    .select('ratio_from, ratio_to, last_verified, from:from_programme_id(name), to:to_programme_id(name)')
    .or(`last_verified.is.null,last_verified.lt.${cutoffIso}`)
    .order('last_verified', { ascending: true, nullsFirst: true });

  if (chartError || edgeError) {
    console.error(chartError?.message ?? edgeError?.message);
    process.exit(1);
  }

  console.log(`# Stale reference data (not verified in ${STALE_AFTER_DAYS}+ days)\n`);

  console.log(`## Award chart entries (${staleCharts?.length ?? 0})`);
  for (const row of staleCharts ?? []) {
    const programmeName = (row as any).programmes?.name ?? 'unknown';
    console.log(
      `- ${programmeName}: ${row.origin_region} -> ${row.dest_region} (${row.cabin}) ` +
        `— last verified: ${row.last_verified ?? 'never'}`
    );
  }

  console.log(`\n## Transfer-partner edges (${staleEdges?.length ?? 0})`);
  for (const row of staleEdges ?? []) {
    const from = (row as any).from?.name ?? 'unknown';
    const to = (row as any).to?.name ?? 'unknown';
    console.log(`- ${from} -> ${to} — last verified: ${row.last_verified ?? 'never'}`);
  }

  const totalStale = (staleCharts?.length ?? 0) + (staleEdges?.length ?? 0);
  console.log(`\nTotal stale rows: ${totalStale}`);

  // Non-zero exit when stale rows exist, so this can gate a CI job or
  // trigger a scheduled GitHub Action to open a tracking issue.
  if (totalStale > 0) process.exit(1);
}

main();
