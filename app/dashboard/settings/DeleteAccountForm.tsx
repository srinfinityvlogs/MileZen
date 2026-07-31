'use client';

import { useState } from 'react';
import styles from '../dashboard.module.css';

export function DeleteAccountForm({ userEmail }: { userEmail: string }) {
  const [step, setStep] = useState<'idle' | 'confirming' | 'deleting' | 'error'>('idle');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const canConfirm = confirmText.trim().toLowerCase() === 'delete';

  async function handleDelete() {
    setStep('deleting');
    setError(null);

    const res = await fetch('/api/account/delete', { method: 'POST' });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Something went wrong.');
      setStep('error');
      return;
    }

    // Account (and session) is gone server-side — send them to a plain
    // confirmation destination. A full page navigation, not router.push,
    // since client-side state for a now-nonexistent session shouldn't
    // stick around.
    window.location.href = '/';
  }

  if (step === 'idle') {
    return (
      <button className={styles.buttonSecondary} style={{ color: '#a33b3b', borderColor: '#a33b3b' }} onClick={() => setStep('confirming')}>
        Delete my account
      </button>
    );
  }

  return (
    <div style={{ border: '1px solid #a33b3b', borderRadius: 4, padding: 20, maxWidth: 420 }}>
      <p style={{ fontSize: 14, marginBottom: 12 }}>
        Signed in as <strong>{userEmail}</strong>. Type <strong>DELETE</strong> below to confirm —
        this takes effect immediately and cannot be reversed.
      </p>
      <input
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder="Type DELETE to confirm"
        className={styles.input}
        style={{ marginBottom: 12 }}
        disabled={step === 'deleting'}
      />
      {error && <p className={styles.errorText}>{error}</p>}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          className={styles.button}
          style={{ background: '#a33b3b' }}
          disabled={!canConfirm || step === 'deleting'}
          onClick={handleDelete}
        >
          {step === 'deleting' ? 'Deleting…' : 'Permanently delete my account'}
        </button>
        <button
          className={styles.buttonSecondary}
          onClick={() => {
            setStep('idle');
            setConfirmText('');
            setError(null);
          }}
          disabled={step === 'deleting'}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
