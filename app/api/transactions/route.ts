import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/transactions
// body: { userCardId, txnDate, merchant, amount, currency?, categoryNote?, pointsEarned? }
//
// This is the ONE place a transaction can create its matching point_ledger
// entry automatically — if pointsEarned is provided, we look up which
// programme the card earns into (card_products.earn_programme_id) and
// insert an 'earn' row, linked back via related_txn_id. Without this,
// transactions would sit disconnected from the actual points ledger the
// rest of the app (balances, award search, concierge) reads from.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const { userCardId, txnDate, merchant, amount, currency, categoryNote, mccCode, pointsEarned } = body as {
    userCardId?: string;
    txnDate?: string;
    merchant?: string;
    amount?: number;
    currency?: string;
    categoryNote?: string;
    mccCode?: string;
    pointsEarned?: number;
  };

  if (!userCardId) return NextResponse.json({ error: 'userCardId is required' }, { status: 400 });
  if (!txnDate || Number.isNaN(Date.parse(txnDate))) {
    return NextResponse.json({ error: 'A valid txnDate is required' }, { status: 400 });
  }
  if (!merchant?.trim()) return NextResponse.json({ error: 'merchant is required' }, { status: 400 });
  if (typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
  }

  // Look up the card's earn programme — needed to know which ledger the
  // points belong to. RLS-scoped: this also implicitly confirms the card
  // belongs to the caller, since a mismatched id simply returns no row.
  const { data: card, error: cardError } = await supabase
    .from('user_cards')
    .select('id, card_products(earn_programme_id)')
    .eq('id', userCardId)
    .single();
  if (cardError || !card) {
    return NextResponse.json({ error: 'Unknown or inaccessible userCardId' }, { status: 400 });
  }

  const { data: txn, error: txnError } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      user_card_id: userCardId,
      txn_date: txnDate,
      merchant: merchant.trim(),
      amount,
      currency: currency ?? 'INR',
      category_note: categoryNote ?? null,
      mcc_code: mccCode ?? null,
      points_earned: pointsEarned ?? null,
    })
    .select('id')
    .single();

  if (txnError || !txn) {
    console.error('Failed to create transaction', { userId: user.id, message: txnError?.message });
    return NextResponse.json({ error: 'Failed to save transaction' }, { status: 500 });
  }

  // Bridge to the points ledger — only if points were actually earned and
  // the card's product has a known earn programme.
  const earnProgrammeId = (card as any).card_products?.earn_programme_id;
  if (pointsEarned && pointsEarned > 0 && earnProgrammeId) {
    const { error: ledgerError } = await supabase.from('point_ledger').insert({
      user_id: user.id,
      programme_id: earnProgrammeId,
      entry_type: 'earn',
      points: pointsEarned,
      related_txn_id: txn.id,
      note: `Earned from ${merchant.trim()}`,
    });
    if (ledgerError) {
      // The transaction itself already saved successfully — log this but
      // don't fail the whole request over it; the ledger entry can be
      // added later if needed. Never silently pretend it worked though.
      console.error('Transaction saved but point_ledger entry failed', {
        userId: user.id,
        txnId: txn.id,
        message: ledgerError.message,
      });
    }
  }

  return NextResponse.json({ id: txn.id }, { status: 201 });
}
