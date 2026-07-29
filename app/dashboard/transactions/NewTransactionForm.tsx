'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../dashboard.module.css';

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

const COMMON_CATEGORIES = ['Dining', 'Groceries', 'Travel', 'Fuel', 'Online Shopping', 'Utilities', 'Entertainment', 'Other'];

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
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="userCard">Card</label>
        <select id="userCard" value={userCardId} onChange={(e) => setUserCardId(e.target.value)} className={styles.select}>
          {cards.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="txnDate">Date</label>
        <input
          id="txnDate"
          type="date"
          value={txnDate}
          onChange={(e) => setTxnDate(e.target.value)}
          required
          className={styles.input}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="merchant">Merchant</label>
        <input
          id="merchant"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          placeholder="e.g. Starbucks"
          required
          className={styles.input}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="amount">Amount</label>
        <input
          id="amount"
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          className={styles.input}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="category">Category</label>
        <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} className={styles.select}>
          {COMMON_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="pointsEarned">
          Points earned
        </label>
        <input
          id="pointsEarned"
          type="number"
          value={displayedPoints}
          onChange={(e) => {
            setPointsTouchedByUser(true);
            setPointsEarned(e.target.value);
          }}
          placeholder="0"
          className={styles.input}
        />
        <span className={styles.helpText}>
          {suggestedPoints !== null && !pointsTouchedByUser ? 'Auto-suggested — edit if needed' : 'Optional'}
        </span>
      </div>

      {error && <p className={styles.errorText}>{error}</p>}

      <button type="submit" disabled={saving || !userCardId || !merchant || !amount} className={styles.button}>
        {saving ? 'Saving…' : 'Add transaction'}
      </button>
    </form>
  );
}
