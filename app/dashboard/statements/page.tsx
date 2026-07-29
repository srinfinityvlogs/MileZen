import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { UploadStatementForm } from './UploadStatementForm';
import styles from '../dashboard.module.css';

export default async function StatementsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Both queries are RLS-scoped to the signed-in user automatically.
  const [{ data: statements, error: statementsError }, { data: cards }] = await Promise.all([
    supabase
      .from('statements')
      .select('id, source, status, uploaded_at, parsed_at, user_cards(nickname, last4)')
      .order('uploaded_at', { ascending: false }),
    supabase.from('user_cards').select('id, nickname, last4, card_products(name)').eq('is_active', true),
  ]);

  if (statementsError) {
    console.error('Failed to load statements', statementsError.message);
  }

  function statusBadgeClass(status: string) {
    if (status === 'parsed') return `${styles.badge} ${styles.badgeSuccess}`;
    if (status === 'failed') return `${styles.badge} ${styles.badgeDanger}`;
    return `${styles.badge} ${styles.badgeMuted}`;
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Statements</h1>
      <p className={styles.subtitle}>
        Optional PDF import — text-layer extraction + regex only, nothing sent to any AI model.
      </p>

      {!cards || cards.length === 0 ? (
        <p className={styles.empty}>
          Add a card first before uploading a statement —{' '}
          <a href="/dashboard/cards/new" className={styles.linkButton} style={{ marginTop: 0 }}>
            add one here
          </a>
          .
        </p>
      ) : (
        <UploadStatementForm
          cards={cards.map((c: any) => ({
            id: c.id,
            label: `${c.nickname ?? c.card_products?.name ?? 'Card'} •••• ${c.last4}`,
          }))}
        />
      )}

      <h2 className={styles.sectionTitle}>History</h2>
      {!statements || statements.length === 0 ? (
        <p className={styles.empty}>No statements uploaded yet.</p>
      ) : (
        <ul className={styles.list}>
          {statements.map((s: any) => (
            <li key={s.id} className={styles.row}>
              <div className={styles.rowMain}>
                <p className={styles.rowTitle}>
                  {s.user_cards ? `${s.user_cards.nickname ?? ''} •••• ${s.user_cards.last4}` : 'No card linked'}
                </p>
                <p className={styles.rowMeta}>{new Date(s.uploaded_at).toLocaleDateString()}</p>
              </div>
              <span className={statusBadgeClass(s.status)}>{s.status}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
