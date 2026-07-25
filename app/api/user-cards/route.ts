import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/user-cards
// body: { cardProductId, nickname?, last4, annualFeeDate? }
//
// Inserting annualFeeDate here automatically creates/updates the card's
// annual_fee reminder — see sync_annual_fee_reminder() trigger in
// supabase/migrations/004_reminders_notifications.sql. No extra code
// needed in this route for that to happen.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const { cardProductId, nickname, last4, annualFeeDate, openedDate } = body as {
    cardProductId?: string;
    nickname?: string;
    last4?: string;
    annualFeeDate?: string;
    openedDate?: string;
  };

  if (!cardProductId) {
    return NextResponse.json({ error: 'cardProductId is required' }, { status: 400 });
  }
  if (!last4 || !/^\d{4}$/.test(last4)) {
    return NextResponse.json({ error: 'last4 must be exactly 4 digits' }, { status: 400 });
  }
  if (annualFeeDate && Number.isNaN(Date.parse(annualFeeDate))) {
    return NextResponse.json({ error: 'annualFeeDate must be a valid date' }, { status: 400 });
  }

  // card_products is global reference data (no RLS, public read) — confirm
  // the id is real before inserting, so a bad id fails clearly here rather
  // than as an opaque foreign-key error.
  const { data: cardProduct, error: cardProductError } = await supabase
    .from('card_products')
    .select('id')
    .eq('id', cardProductId)
    .single();
  if (cardProductError || !cardProduct) {
    return NextResponse.json({ error: 'Unknown cardProductId' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('user_cards')
    .insert({
      user_id: user.id,
      card_product_id: cardProductId,
      nickname: nickname || null,
      last4,
      opened_date: openedDate || null,
      annual_fee_date: annualFeeDate || null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create user_card', { userId: user.id, message: error.message });
    return NextResponse.json({ error: 'Failed to add card' }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
