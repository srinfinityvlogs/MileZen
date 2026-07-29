'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../dashboard.module.css';

interface CardOption {
  id: string;
  label: string;
}

type Phase = 'idle' | 'uploading' | 'parsing' | 'done' | 'error';

export function UploadStatementForm({ cards }: { cards: CardOption[] }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [userCardId, setUserCardId] = useState(cards[0]?.id ?? '');
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setMessage(null);

    // Step 1: upload the raw PDF (validated server-side — real PDF magic
    // bytes, 10MB cap, stored under the user's own storage folder).
    setPhase('uploading');
    const formData = new FormData();
    formData.append('file', file);
    if (userCardId) formData.append('userCardId', userCardId);

    const uploadRes = await fetch('/api/statements/upload', { method: 'POST', body: formData });
    const uploadData = await uploadRes.json();

    if (!uploadRes.ok) {
      setPhase('error');
      setMessage(uploadData.error ?? 'Upload failed.');
      return;
    }

    // Step 2: trigger parsing immediately — text-layer extraction + regex,
    // entirely server-side, nothing sent to any third party or LLM.
    setPhase('parsing');
    const parseRes = await fetch(`/api/statements/${uploadData.statementId}/parse`, { method: 'POST' });
    const parseData = await parseRes.json();

    if (!parseRes.ok) {
      setPhase('error');
      setMessage(
        parseData.error === 'Statement last-4 does not match the selected card.'
          ? 'This PDF\u2019s last-4 digits don\u2019t match the card you selected \u2014 double-check you picked the right card.'
          : (parseData.error ?? 'Could not parse this statement. It may be an unsupported bank format.')
      );
      router.refresh(); // still show it in history as "failed"
      return;
    }

    setPhase('done');
    setMessage(`Parsed ${parseData.parsedCount} transaction(s) using the "${parseData.issuerKey}" parser.`);
    setFile(null);
    router.refresh();
  }

  const busy = phase === 'uploading' || phase === 'parsing';

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="userCard">Card this statement belongs to</label>
        <select id="userCard" value={userCardId} onChange={(e) => setUserCardId(e.target.value)} className={styles.select}>
          {cards.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="file">Statement PDF (max 10 MB)</label>
        <input
          id="file"
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className={styles.input}
        />
      </div>

      <button type="submit" disabled={!file || busy} className={styles.button}>
        {phase === 'uploading' ? 'Uploading…' : phase === 'parsing' ? 'Parsing…' : 'Upload & parse'}
      </button>

      {message && <p className={phase === 'error' ? styles.errorText : styles.successText}>{message}</p>}

      <p className={styles.helpText}>
        Only text-layer extraction + pattern matching is used to read this file — nothing is sent
        to any AI model or third party during parsing.
      </p>
    </form>
  );
}
