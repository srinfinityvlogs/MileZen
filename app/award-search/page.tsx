import { createClient } from '@/lib/supabase/server';
import { AwardSearchForm } from './AwardSearchForm';
import styles from '../theme.module.css';

export default async function AwardSearchPage() {
  const supabase = await createClient();

  const [{ data: chartRows }, { data: programmes }] = await Promise.all([
    supabase.from('award_charts').select('origin_region, dest_region'),
    supabase.from('programmes').select('id, name, type').order('name'),
  ]);

  const originRegions = Array.from(new Set((chartRows ?? []).map((r) => r.origin_region))).sort();
  const destRegions = Array.from(new Set((chartRows ?? []).map((r) => r.dest_region))).sort();

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Award search</h1>
        <p className={styles.intro}>
          Pick a route and cabin to see which programmes can book it, and the best transfer path
          — tell us which currencies you already hold below, or leave it blank to see every
          possible way to get there.
        </p>
        {originRegions.length === 0 ? (
          <p className={styles.empty}>
            No award charts seeded yet — see <code>data/award-charts/</code> in the README's data
            pipeline section.
          </p>
        ) : (
          <AwardSearchForm
            originRegions={originRegions}
            destRegions={destRegions}
            programmes={(programmes ?? []).map((p) => ({ id: p.id, name: p.name, type: p.type }))}
          />
        )}
      </div>
    </div>
  );
}
