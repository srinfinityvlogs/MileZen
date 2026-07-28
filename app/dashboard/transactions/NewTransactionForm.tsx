'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

interface MccRule {
  label: string;
  rewardRate: number;
  rewardType: 'cashback_pct' | 'points_per_unit';
}
interface CardOption {
  id: string;
  label: string;
  mccRules: MccRule[];
}

const COMMON_CATEGORIES = ['Dining', 'Groceries', 'Travel', 'Other'];

export function NewTransactionForm({ cards }: { cards: CardOption[] }) {
  const router = useRouter();
  const [userCardId, setUserCardId] = useState(cards[0]?.id ?? '');
  const [txnDate, setTxnDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(COMMON_CATEGORIES[0]);
  const [pointsEarned, setPointsEarned] = useState('');
  const [pointsTouchedByUser, setPointsTouchedByUser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedCard = cards.find((c) => c.id === userCardId);

  // Auto-suggest points based on the selected card's actual MCC rules —
  // only while the user hasn't manually overridden the value themselves.
  const suggestedPoints = useMemo(() => {
    if (!selectedCard || !amount) return null;
    const rule = selectedCard.mccRules.find((r) => r.label.toLowerCase() === category.toLowerCase());
    if (!rule) return null;
    const amt = parseFloat(amount);
    if (Number.isNaN(amt)) return null;
    return rule.rewardType === 'points_per_unit' ? Math.round(amt * rule.rewardRate) : null;
  }, [selectedCard, category, amount]);

  const displayedPoints = pointsTouchedByUser ? pointsEarned : (suggestedPoints?.toString() ?? '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userCardId,
        txnDate,
        merchant,
        amount: parseFloat(amount),
        categoryNote: category,
        pointsEarned: displayedPoints ? parseFloat(displayedPoints) : undefined,
      }),
    });

    setSaving(false);
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong.');
      return;
    }

    setMerchant('');
    setAmount('');
    setPointsEarned('');
    setPointsTouchedByUser(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <label>
        Card
        <select
          value={userCardId}
          onChange={(e) => setUserCardId(e.target.value)}
          style={{ display: 'block', width: '100%', padding: 8 }}
        >
          {cards.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        Date
        <input
          type="date"
          value={txnDate}
          onChange={(e) => setTxnDate(e.target.value)}
          required
          style={{ display: 'block', width: '100%', padding: 8 }}
        />
      </label>

      <label>
        Merchant
        <input
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          placeholder="e.g. Starbucks"
          required
          style={{ display: 'block', width: '100%', padding: 8 }}
        />
      </label>

      <label>
        Amount
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          style={{ display: 'block', width: '100%', padding: 8 }}
        />
      </label>

      <label>
        Category
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{ display: 'block', width: '100%', padding: 8 }}
        >
          {COMMON_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label>
        Points earned {suggestedPoints !== null && !pointsTouchedByUser ? '(auto-suggested - edit if needed)' : '(optional)'}
        <input
          type="number"
          value={displayedPoints}
          onChange={(e) => {
            setPointsTouchedByUser(true);
            setPointsEarned(e.target.value);
          }}
          placeholder="0"
          style={{ display: 'block', width: '100%', padding: 8 }}
        />
      </label>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <button type="submit" disabled={saving || !userCardId || !merchant || !amount}>
        {saving ? 'Saving…' : 'Add transaction'}
      </button>
    </form>
  );
}
