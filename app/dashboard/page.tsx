import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import styles from './dashboard.module.css';

// Server Component — data is fetched on the server, using the signed-in
// user's own session (not the service role). Notice there is NO manual
// `.eq('user_id', user.id)` filter below on user_cards — that's intentional:
// Row Level Security on the `user_cards` table already guarantees this
// query can only ever return rows belonging to the signed-in user, even
// if this code had a bug. Defense lives in the database, not just here.
export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [{ data: cards, error }, { data: balances, error: balancesError }] = await Promise.all([
    supabase
      .from('user_cards')
      .select('id, nickname, last4, annual_fee_date, card_products(name, issuers(name))')
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    // point_balances is a view over point_ledger — RLS on point_ledger
    // still applies here (see migration 007: the view must be created
    // WITH security_invoker = true for that to actually be true, since
    // Postgres views bypass RLS by default otherwise).
    supabase
      .from('point_balances')
      .select('programme_id, balance, programmes(name, type)')
      .order('balance', { ascending: false }),
  ]);

  if (error) {
    // Log server-side only — never surface raw DB error details to the client
    console.error('Failed to load user_cards', error.message);
  }
  if (balancesError) {
    console.error('Failed to load point_balances', balancesError.message);
  }

  const positiveBalances = (balances ?? []).filter((b: any) => b.balance && b.balance > 0);

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Your balances</h1>
      <p className={styles.subtitle}>Every card, point, and mile — in one ledger.</p>

      {positiveBalances.length === 0 ? (
        <p className={styles.empty}>No points logged yet — log a transaction with points earned to see balances here.</p>
      ) : (
        <div className={styles.statGrid}>
          {positiveBalances.map((b: any) => (
            <div key={b.programme_id} className={styles.statTile}>
              <p className={styles.statLabel}>{b.programmes?.name ?? 'Unknown programme'}</p>
              <p className={styles.statValue}>{b.balance.toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      <h2 className={styles.sectionTitle}>Your cards</h2>
      {!cards || cards.length === 0 ? (
        <p className={styles.empty}>No cards yet. Add your first card to start the ledger.</p>
      ) : (
        <ul className={styles.list}>
          {cards.map((c: any) => (
            <li key={c.id} className={styles.row}>
              <div className={styles.rowMain}>
                <p className={styles.rowTitle}>
                  {c.nickname ?? c.card_products?.name ?? 'Card'} •••• {c.last4}
                </p>
                {c.annual_fee_date && (
                  <p className={styles.rowMeta}>Annual fee due {c.annual_fee_date}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link href="/dashboard/cards/new" className={styles.linkButton}>
        + Add a card
      </Link>
    </main>
  );
}
