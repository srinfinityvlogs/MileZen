import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

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

  return (
    <main style={{ padding: 40, fontFamily: 'system-ui' }}>
      <h1>Your balances</h1>
      {!balances || balances.length === 0 ? (
        <p>No points logged yet - log a transaction with points earned to see balances here.</p>
      ) : (
        <ul>
          {balances
            .filter((b: any) => b.balance && b.balance > 0)
            .map((b: any) => (
              <li key={b.programme_id}>
                <strong>{b.programmes?.name ?? 'Unknown programme'}</strong> - {b.balance.toLocaleString()} pts
              </li>
            ))}
        </ul>
      )}

      <h1 style={{ marginTop: 32 }}>Your cards</h1>
      {!cards || cards.length === 0 ? (
        <p>No cards yet. Add your first card to start the ledger.</p>
      ) : (
        <ul>
          {cards.map((c: any) => (
            <li key={c.id}>
              {c.nickname ?? c.card_products?.name ?? 'Card'} •••• {c.last4}
              {c.annual_fee_date ? ` - annual fee due ${c.annual_fee_date}` : ''}
            </li>
          ))}
        </ul>
      )}
      <p style={{ marginTop: 16 }}>
        <Link href="/dashboard/cards/new">+ Add a card</Link>
      </p>
      <p>
        <Link href="/dashboard/transactions">+ Log a transaction</Link>
      </p>
      <p>
        <Link href="/dashboard/concierge">Ask the concierge</Link>
      </p>
      <p>
        <Link href="/dashboard/statements">Statements (optional PDF import)</Link>
      </p>
      <p>
        <Link href="/dashboard/award-search">Award search</Link>
      </p>
    </main>
  );
}
