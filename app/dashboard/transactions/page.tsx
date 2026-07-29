import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { NewTransactionForm } from './NewTransactionForm';
import styles from '../dashboard.module.css';

export default async function TransactionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: cards }, { data: transactions, error: txnError }] = await Promise.all([
    supabase
      .from('user_cards')
      .select('id, nickname, last4, card_products(name, mcc_rules(mcc_label, reward_rate, reward_type))')
      .eq('is_active', true),
    supabase
      .from('transactions')
      .select('id, txn_date, merchant, amount, currency, category_note, points_earned, user_cards(nickname, last4)')
      .order('txn_date', { ascending: false })
      .limit(25),
  ]);

  if (txnError) console.error('Failed to load transactions', txnError.message);

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Transactions</h1>
      <p className={styles.subtitle}>
        Manual entry is the primary way to log spending — statement upload (under{' '}
        <a href="/dashboard/statements" className={styles.linkButton} style={{ marginTop: 0 }}>
          Statements
        </a>
        ) is available too, but only recognizes a couple of bank formats so far.
      </p>

      {!cards || cards.length === 0 ? (
        <p className={styles.empty}>
          Add a card first —{' '}
          <a href="/dashboard/cards/new" className={styles.linkButton} style={{ marginTop: 0 }}>
            add one here
          </a>
          .
        </p>
      ) : (
        <NewTransactionForm
          cards={cards.map((c: any) => ({
            id: c.id,
            label: `${c.nickname ?? c.card_products?.name ?? 'Card'} •••• ${c.last4}`,
            mccRules: (c.card_products?.mcc_rules ?? []).map((r: any) => ({
              label: r.mcc_label,
              rewardRate: r.reward_rate,
              rewardType: r.reward_type,
            })),
          }))}
        />
      )}

      <h2 className={styles.sectionTitle}>Recent</h2>
      {!transactions || transactions.length === 0 ? (
        <p className={styles.empty}>No transactions logged yet.</p>
      ) : (
        <ul className={styles.list}>
          {transactions.map((t: any) => (
            <li key={t.id} className={styles.row}>
              <div className={styles.rowMain}>
                <p className={styles.rowTitle}>{t.merchant}</p>
                <p className={styles.rowMeta}>
                  {t.txn_date}
                  {t.category_note ? ` · ${t.category_note}` : ''}
                  {t.user_cards ? ` · ${t.user_cards.nickname ?? ''} •••• ${t.user_cards.last4}` : ''}
                </p>
              </div>
              <div className={styles.rowValue}>
                {t.currency} {t.amount}
                {t.points_earned ? (
                  <div style={{ fontSize: 12, fontWeight: 400, color: '#17543f' }}>
                    +{t.points_earned} pts
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
