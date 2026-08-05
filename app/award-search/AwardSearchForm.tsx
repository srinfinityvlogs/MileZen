'use client';

import { useState } from 'react';
import styles from '../theme.module.css';

interface ProgrammeOption {
  id: string;
  name: string;
  type: string;
}

interface AwardOption {
  programmeId: string;
  programmeName: string;
  pointsCost: number;
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
  programmes,
}: {
  originRegions: string[];
  destRegions: string[];
  programmes: ProgrammeOption[];
}) {
  const [originRegion, setOriginRegion] = useState(originRegions[0] ?? '');
  const [destRegion, setDestRegion] = useState(destRegions[0] ?? '');
  const [cabin, setCabin] = useState('business');
  const [strategy, setStrategy] = useState('best_value');
  const [heldIds, setHeldIds] = useState<Set<string>>(new Set());
  const [options, setOptions] = useState<AwardOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleHeld(id: string) {
    setHeldIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setOptions(null);

    const res = await fetch('/api/award-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originRegion,
        destRegion,
        cabin,
        strategy,
        heldProgrammeIds: Array.from(heldIds),
      }),
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
            {originRegions.map((r) => <option key={r} value={r} />)}
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
            {destRegions.map((r) => <option key={r} value={r} />)}
          </datalist>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="cabin">Cabin</label>
          <select id="cabin" value={cabin} onChange={(e) => setCabin(e.target.value)} className={styles.select}>
            {CABINS.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
          </select>
        </div>

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Rank paths by</legend>
          <div className={styles.checkboxRow}>
            {STRATEGIES.map((s) => (
              <label key={s.value} className={styles.checkboxLabel}>
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
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Which currencies do you already hold? (optional)</legend>
          <div className={styles.checkboxRow}>
            {programmes.map((p) => (
              <label key={p.id} className={styles.checkboxLabel}>
                <input type="checkbox" checked={heldIds.has(p.id)} onChange={() => toggleHeld(p.id)} />
                {p.name}
              </label>
            ))}
          </div>
        </fieldset>

        <button type="submit" disabled={loading} className={styles.buttonPrimary} style={{ alignSelf: 'flex-start', border: 'none' }}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && <p className={styles.errorText}>{error}</p>}

      {options && (
        <div style={{ marginTop: 24 }}>
          <p className={styles.resultsHeading}>Results</p>
          {options.length === 0 ? (
            <p className={styles.empty}>No programmes have a chart for this exact route/cabin yet.</p>
          ) : (
            options.map((opt) => (
              <div key={opt.programmeId} className={styles.card}>
                <p className={styles.cardTitle}>
                  {opt.programmeName} — {opt.pointsCost.toLocaleString()} pts
                </p>

                {opt.paths.length === 0 ? (
                  <p className={styles.empty} style={{ padding: 0 }}>
                    No path found from the currencies you selected.
                  </p>
                ) : (
                  <ul className={styles.pathList}>
                    {opt.paths.map((p, i) => (
                      <li key={i}>
                        From <strong style={{ color: '#14213d' }}>{p.sourceProgrammeName}</strong>: need{' '}
                        {p.sourcePointsNeeded.toLocaleString()} pts
                        {p.hopCount > 0 && (
                          <>
                            {' '}via {p.hops.map((h) => h.toProgrammeName).join(' → ')} ({p.hopCount} hop
                            {p.hopCount > 1 ? 's' : ''}, ~{p.totalMaxDays} days)
                          </>
                        )}
                        {p.hopCount === 0 && ' (already held directly)'}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}
