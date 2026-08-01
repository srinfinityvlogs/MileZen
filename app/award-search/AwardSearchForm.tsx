'use client';

import { useState } from 'react';

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
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label>
          From
          <input
            list="origin-regions"
            value={originRegion}
            onChange={(e) => setOriginRegion(e.target.value)}
            placeholder="e.g. North India"
            required
            style={{ display: 'block', width: '100%', padding: 8 }}
          />
          <datalist id="origin-regions">
            {originRegions.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </label>

        <label>
          To
          <input
            list="dest-regions"
            value={destRegion}
            onChange={(e) => setDestRegion(e.target.value)}
            placeholder="e.g. UK"
            required
            style={{ display: 'block', width: '100%', padding: 8 }}
          />
          <datalist id="dest-regions">
            {destRegions.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </label>

        <label>
          Cabin
          <select value={cabin} onChange={(e) => setCabin(e.target.value)} style={{ display: 'block', width: '100%', padding: 8 }}>
            {CABINS.map((c) => (
              <option key={c} value={c}>
                {c.replace('_', ' ')}
              </option>
            ))}
          </select>
        </label>

        <fieldset style={{ border: '1px solid #ddd', padding: 8 }}>
          <legend>Rank paths by</legend>
          {STRATEGIES.map((s) => (
            <label key={s.value} style={{ marginRight: 16 }}>
              <input
                type="radio"
                name="strategy"
                value={s.value}
                checked={strategy === s.value}
                onChange={() => setStrategy(s.value)}
              />{' '}
              {s.label}
            </label>
          ))}
        </fieldset>

        <fieldset style={{ border: '1px solid #ddd', padding: 8 }}>
          <legend>Which currencies do you already hold? (optional — leave blank to see everything)</legend>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {programmes.map((p) => (
              <label key={p.id} style={{ fontSize: 14 }}>
                <input type="checkbox" checked={heldIds.has(p.id)} onChange={() => toggleHeld(p.id)} /> {p.name}
              </label>
            ))}
          </div>
        </fieldset>

        <button type="submit" disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && <p style={{ color: 'crimson', marginTop: 16 }}>{error}</p>}

      {options && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 18 }}>Results</h2>
          {options.length === 0 ? (
            <p>No programmes have a chart for this exact route/cabin yet.</p>
          ) : (
            options.map((opt) => (
              <div key={opt.programmeId} style={{ border: '1px solid #eee', padding: 16, marginBottom: 12 }}>
                <strong>{opt.programmeName}</strong> — {opt.pointsCost.toLocaleString()} pts

                {opt.paths.length === 0 ? (
                  <p style={{ color: '#999', marginTop: 8 }}>
                    No path found from the currencies you selected.
                  </p>
                ) : (
                  <ul style={{ marginTop: 8 }}>
                    {opt.paths.map((p, i) => (
                      <li key={i}>
                        From <strong>{p.sourceProgrammeName}</strong>: need{' '}
                        {p.sourcePointsNeeded.toLocaleString()} pts
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
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}
