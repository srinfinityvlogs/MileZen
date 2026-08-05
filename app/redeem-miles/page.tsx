import { createClient } from '@/lib/supabase/server';
import styles from './redeem-miles.module.css';

interface RouteRow {
  fromAirport: string;
  toAirport: string;
  city: string;
  country: string;
  programmeName: string;
  pointsOnward: number;
  taxesOnward: number;
  pointsReturn: number;
  taxesReturn: number;
}

const SORTS = [
  { value: 'value', label: 'Best value (lowest tax difference)' },
  { value: 'points', label: 'Fewest points' },
  { value: 'az', label: 'City A-Z' },
];

export default async function RedeemMilesPage({
  searchParams,
}: {
  searchParams: { from?: string; country?: string; sort?: string };
}) {
  const supabase = await createClient();

  const { data } = await supabase
    .from('award_route_charts')
    .select(
      'from_airport, to_airport, city, country, points_onward, taxes_onward, points_return, taxes_return, programmes(name)'
    );

  const allRoutes: RouteRow[] = (data ?? []).map((r: any) => ({
    fromAirport: r.from_airport,
    toAirport: r.to_airport,
    city: r.city,
    country: r.country,
    programmeName: r.programmes?.name ?? '',
    pointsOnward: r.points_onward,
    taxesOnward: Number(r.taxes_onward),
    pointsReturn: r.points_return,
    taxesReturn: Number(r.taxes_return),
  }));

  const fromAirports = Array.from(new Set(allRoutes.map((r) => r.fromAirport))).sort();
  const countries = Array.from(new Set(allRoutes.map((r) => r.country))).sort();

  const sort = searchParams.sort ?? 'value';

  let filtered = allRoutes.filter((r) => {
    if (searchParams.from && r.fromAirport !== searchParams.from) return false;
    if (searchParams.country && r.country !== searchParams.country) return false;
    return true;
  });

  filtered = filtered.sort((a, b) => {
    if (sort === 'points') return a.pointsOnward - b.pointsOnward;
    if (sort === 'az') return a.city.localeCompare(b.city);
    return Math.abs(a.taxesOnward - a.taxesReturn) - Math.abs(b.taxesOnward - b.taxesReturn);
  });

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Redeem your miles</h1>
        <p className={styles.intro}>
          Real award charts — how many points and taxes it takes to fly each route, city to city,
          starting with Air India's Maharaja Club.
        </p>

        <form method="get" className={styles.form}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="from">From</label>
            <select id="from" name="from" defaultValue={searchParams.from ?? ''} className={styles.select}>
              <option value="">Any city</option>
              {fromAirports.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="country">Destination country</label>
            <select id="country" name="country" defaultValue={searchParams.country ?? ''} className={styles.select}>
              <option value="">Any country</option>
              {countries.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="sort">Sort by</label>
            <select id="sort" name="sort" defaultValue={sort} className={styles.select}>
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <button type="submit" className={styles.button}>Apply</button>
          {(searchParams.from || searchParams.country || searchParams.sort) && (
            <a href="/redeem-miles" className={styles.resetLink}>Reset</a>
          )}
        </form>

        <p className={styles.resultCount}>
          {filtered.length} route{filtered.length === 1 ? '' : 's'}
        </p>

        <div className={styles.tableWrap}>
          {filtered.length === 0 ? (
            <p className={styles.empty}>No routes match those filters.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Route</th>
                  <th>City</th>
                  <th className={styles.numHead}>Onward pts</th>
                  <th className={styles.numHead}>Onward tax</th>
                  <th className={styles.numHead}>Return pts</th>
                  <th className={styles.numHead}>Return tax</th>
                  <th className={styles.numHead}>Tax diff</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const diff = Math.abs(r.taxesOnward - r.taxesReturn);
                  return (
                    <tr key={`${r.fromAirport}-${r.toAirport}`}>
                      <td className={styles.route}>
                        {r.fromAirport}
                        <span className={styles.arrow}>→</span>
                        {r.toAirport}
                      </td>
                      <td className={styles.cityCell}>
                        {r.city}
                        <span className={styles.country}>{r.country}</span>
                      </td>
                      <td className={styles.num}>{r.pointsOnward.toLocaleString()}</td>
                      <td className={styles.num}>₹{r.taxesOnward.toLocaleString()}</td>
                      <td className={styles.num}>{r.pointsReturn.toLocaleString()}</td>
                      <td className={styles.num}>₹{r.taxesReturn.toLocaleString()}</td>
                      <td className={`${styles.num} ${diff < 1000 ? styles.diffGood : ''}`}>
                        ₹{diff.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <p className={styles.footnote}>
          Points and taxes shown are for economy class, one-way each direction, as published by
          the airline at the time this chart was last checked. Taxes and fuel surcharges change
          frequently — confirm current figures directly with the airline before redeeming.
        </p>
      </div>
    </div>
  );
}
