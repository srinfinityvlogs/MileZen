'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../../dashboard.module.css';

interface CardProductOption {
  id: string;
  label: string;
  annualFee: number;
}

export function NewCardForm({ cardProducts }: { cardProducts: CardProductOption[] }) {
  const router = useRouter();
  const [cardProductId, setCardProductId] = useState(cardProducts[0]?.id ?? '');
  const [nickname, setNickname] = useState('');
  const [last4, setLast4] = useState('');
  const [annualFeeDate, setAnnualFeeDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const res = await fetch('/api/user-cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cardProductId,
        nickname: nickname || undefined,
        last4,
        annualFeeDate: annualFeeDate || undefined,
      }),
    });

    setSaving(false);
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong.');
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="cardProduct">Card</label>
        <select
          id="cardProduct"
          value={cardProductId}
          onChange={(e) => setCardProductId(e.target.value)}
          className={styles.select}
        >
          {cardProducts.map((cp) => (
            <option key={cp.id} value={cp.id}>
              {cp.label} (₹{cp.annualFee}/yr)
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="nickname">Nickname (optional)</label>
        <input
          id="nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="e.g. My travel card"
          className={styles.input}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="last4">Last 4 digits</label>
        <input
          id="last4"
          value={last4}
          onChange={(e) => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="1234"
          inputMode="numeric"
          maxLength={4}
          required
          className={styles.input}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="annualFeeDate">
          Annual fee due date
        </label>
        <input
          id="annualFeeDate"
          type="date"
          value={annualFeeDate}
          onChange={(e) => setAnnualFeeDate(e.target.value)}
          className={styles.input}
        />
        <span className={styles.helpText}>Optional — sets a reminder automatically</span>
      </div>

      {error && <p className={styles.errorText}>{error}</p>}

      <button type="submit" disabled={saving || !cardProductId || last4.length !== 4} className={styles.button}>
        {saving ? 'Adding…' : 'Add card'}
      </button>
    </form>
  );
}
