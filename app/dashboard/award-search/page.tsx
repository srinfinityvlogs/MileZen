import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AwardSearchForm } from './AwardSearchForm';
import styles from '../dashboard.module.css';

export default async function AwardSearchPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // award_charts is global reference data (no RLS — public read, see
  // schema.sql section 5). Pulling distinct regions here just to power
  // <datalist> suggestions — the form still accepts free text, since the
  // seeded chart coverage is intentionally small right now.
  const { data: chartRows } = await supabase.from('award_charts').select('origin_region, dest_region');

  const originRegions = Array.from(new Set((chartRows ?? []).map((r) => r.origin_region))).sort();
  const destRegions = Array.from(new Set((chartRows ?? []).map((r) => r.dest_region))).sort();

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Award search</h1>
      <p className={styles.subtitle}>
        Pick a route and cabin to see which programmes can book it, and the best way to get the
        points there from what you already hold.
      </p>
      {originRegions.length === 0 ? (
        <p className={styles.empty}>
          No award charts seeded yet — see <code>data/award-charts/</code> in the README's data
          pipeline section.
        </p>
      ) : (
        <AwardSearchForm originRegions={originRegions} destRegions={destRegions} />
      )}
    </main>
  );
}
