import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { UploadStatementForm } from './UploadStatementForm';

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

  return (
    <main style={{ padding: 40, fontFamily: 'system-ui', maxWidth: 640 }}>
      <h1>Statements</h1>

      {!cards || cards.length === 0 ? (
        <p>
          Add a card first before uploading a statement — <a href="/dashboard/cards/new">add one here</a>.
        </p>
      ) : (
        <UploadStatementForm
          cards={cards.map((c: any) => ({
            id: c.id,
            label: `${c.nickname ?? c.card_products?.name ?? 'Card'} •••• ${c.last4}`,
          }))}
        />
      )}

      <h2 style={{ marginTop: 32, fontSize: 18 }}>History</h2>
      {!statements || statements.length === 0 ? (
        <p>No statements uploaded yet.</p>
      ) : (
        <ul>
          {statements.map((s: any) => (
            <li key={s.id} style={{ marginBottom: 8 }}>
              {new Date(s.uploaded_at).toLocaleDateString()} —{' '}
              {s.user_cards ? `${s.user_cards.nickname ?? ''} •••• ${s.user_cards.last4}` : 'No card linked'} —{' '}
              <strong
                style={{
                  color: s.status === 'parsed' ? 'seagreen' : s.status === 'failed' ? 'crimson' : '#999',
                }}
              >
                {s.status}
              </strong>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
