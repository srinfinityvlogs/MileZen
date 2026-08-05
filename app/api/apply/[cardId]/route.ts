import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request, { params }: { params: Promise<{ cardId: string }> }) {
  const { cardId } = await params;
  const { searchParams, origin } = new URL(request.url);
  const category = searchParams.get('category');
  const feeTier = searchParams.get('feeTier');

  const supabase = await createClient();

  const { data: card, error } = await supabase
    .from('card_products')
    .select('affiliate_link')
    .eq('id', cardId)
    .single();

  if (error || !card?.affiliate_link) {
    return NextResponse.redirect(`${origin}/find-a-card`);
  }

  try {
    await supabase.from('card_search_events').insert({
      event_type: 'apply_click',
      category,
      fee_tier: feeTier,
      card_product_id: cardId,
    });
  } catch (err) {
    console.error('Failed to log apply_click event', (err as Error).message);
  }

  return NextResponse.redirect(card.affiliate_link);
}
