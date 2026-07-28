import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { NewTransactionForm } from './NewTransactionForm';

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
    <main style={{ padding: 40, fontFamily: 'system-ui', maxWidth: 640 }}>
      <h1>Transactions</h1>
      <p style={{ color: '#666', fontSize: 14 }}>
        Manual entry is the primary way to log spending - statement upload (under{' '}
        <a href="/dashboard/statements">Statements</a>) is available too, but only recognizes a
        couple of bank formats so far.
      </p>

      {!cards || cards.length === 0 ? (
        <p>
          Add a card first - <a href="/dashboard/cards/new">add one here</a>.
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

      <h2 style={{ marginTop: 32, fontSize: 18 }}>Recent</h2>
      {!transactions || transactions.length === 0 ? (
        <p>No transactions logged yet.</p>
      ) : (
        <ul>
          {transactions.map((t: any) => (
            <li key={t.id} style={{ marginBottom: 6 }}>
              {t.txn_date} - {t.merchant} - {t.currency} {t.amount}
              {t.category_note ? ` (${t.category_note})` : ''}
              {t.points_earned ? ` - ${t.points_earned} pts` : ''}
              {t.user_cards ? ` - ${t.user_cards.nickname ?? ''} •••• ${t.user_cards.last4}` : ''}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
