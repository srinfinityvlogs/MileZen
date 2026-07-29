'use client';

import { useState } from 'react';
import styles from '../dashboard.module.css';

interface AwardOption {
  programmeId: string;
  programmeName: string;
  pointsCost: number;
  alreadyBookable: boolean;
  paths: Array<{
    sourceProgrammeName: string;
    hopCount: number;
    totalMaxDays: number;
    sourcePointsNeeded: number;
    hops: Array<{ toProgrammeName: string; transferTimeLabel: string }>;
  }>;
}

const CABINS = ['economy', 'premium_economy', 'business', 'first'];
const STRATEGIES: { value: string; label: string }[] = [
  { value: 'best_value', label: 'Best value' },
  { value: 'fewest_hops', label: 'Fewest hops' },
  { value: 'fastest', label: 'Fastest' },
];

export function AwardSearchForm({
  originRegions,
  destRegions,
}: {
  originRegions: string[];
  destRegions: string[];
}) {
  const [originRegion, setOriginRegion] = useState(originRegions[0] ?? '');
  const [destRegion, setDestRegion] = useState(destRegions[0] ?? '');
  const [cabin, setCabin] = useState('business');
  const [strategy, setStrategy] = useState('best_value');
  const [options, setOptions] = useState<AwardOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setOptions(null);

    const res = await fetch('/api/award-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ originRegion, destRegion, cabin, strategy }),
    });
    const data = await res.json();

    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? 'Something went wrong.');
      return;
    }
    setOptions(data.options);
  }

  return (
    <>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="originRegion">From</label>
          <input
            id="originRegion"
            list="origin-regions"
            value={originRegion}
            onChange={(e) => setOriginRegion(e.target.value)}
            placeholder="e.g. North India"
            required
            className={styles.input}
          />
          <datalist id="origin-regions">
            {originRegions.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="destRegion">To</label>
          <input
            id="destRegion"
            list="dest-regions"
            value={destRegion}
            onChange={(e) => setDestRegion(e.target.value)}
            placeholder="e.g. UK"
            required
            className={styles.input}
          />
          <datalist id="dest-regions">
            {destRegions.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="cabin">Cabin</label>
          <select id="cabin" value={cabin} onChange={(e) => setCabin(e.target.value)} className={styles.select}>
            {CABINS.map((c) => (
              <option key={c} value={c}>
                {c.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Rank paths by</span>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {STRATEGIES.map((s) => (
              <label key={s.value} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                <input
                  type="radio"
                  name="strategy"
                  value={s.value}
                  checked={strategy === s.value}
                  onChange={() => setStrategy(s.value)}
                />
                {s.label}
              </label>
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading} className={styles.button}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && <p className={styles.errorText}>{error}</p>}

      {options && (
        <>
          <h2 className={styles.sectionTitle}>Results</h2>
          {options.length === 0 ? (
            <p className={styles.empty}>No programmes have a chart for this exact route/cabin yet.</p>
          ) : (
            <ul className={styles.list}>
              {options.map((opt) => (
                <li key={opt.programmeId} className={styles.row} style={{ display: 'block' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <p className={styles.rowTitle}>{opt.programmeName}</p>
                    <span className={styles.rowValue}>{opt.pointsCost.toLocaleString()} pts</span>
                  </div>
                  {opt.alreadyBookable && (
                    <span className={`${styles.badge} ${styles.badgeSuccess}`}>You can book this now</span>
                  )}

                  {opt.paths.length === 0 ? (
                    <p className={styles.rowMeta} style={{ marginTop: 8 }}>
                      No path found from currencies you currently hold.
                    </p>
                  ) : (
                    <ul style={{ marginTop: 8, paddingLeft: 0, listStyle: 'none' }}>
                      {opt.paths.map((p, i) => (
                        <li key={i} className={styles.rowMeta} style={{ marginBottom: 4 }}>
                          From <strong style={{ color: 'var(--dz-ink, #14213d)' }}>{p.sourceProgrammeName}</strong>:
                          need {p.sourcePointsNeeded.toLocaleString()} pts
                          {p.hopCount > 0 && (
                            <>
                              {' '}
                              via {p.hops.map((h) => h.toProgrammeName).join(' → ')} ({p.hopCount} hop
                              {p.hopCount > 1 ? 's' : ''}, ~{p.totalMaxDays} days)
                            </>
                          )}
                          {p.hopCount === 0 && ' (already held directly)'}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
