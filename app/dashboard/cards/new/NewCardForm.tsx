'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <label>
        Card
        <select
          value={cardProductId}
          onChange={(e) => setCardProductId(e.target.value)}
          style={{ display: 'block', width: '100%', padding: 8 }}
        >
          {cardProducts.map((cp) => (
            <option key={cp.id} value={cp.id}>
              {cp.label} (₹{cp.annualFee}/yr)
            </option>
          ))}
        </select>
      </label>

      <label>
        Nickname (optional)
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="e.g. My travel card"
          style={{ display: 'block', width: '100%', padding: 8 }}
        />
      </label>

      <label>
        Last 4 digits
        <input
          value={last4}
          onChange={(e) => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="1234"
          inputMode="numeric"
          maxLength={4}
          required
          style={{ display: 'block', width: '100%', padding: 8 }}
        />
      </label>

      <label>
        Annual fee due date (optional - sets a reminder automatically)
        <input
          type="date"
          value={annualFeeDate}
          onChange={(e) => setAnnualFeeDate(e.target.value)}
          style={{ display: 'block', width: '100%', padding: 8 }}
        />
      </label>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <button type="submit" disabled={saving || !cardProductId || last4.length !== 4}>
        {saving ? 'Adding…' : 'Add card'}
      </button>
    </form>
  );
}
