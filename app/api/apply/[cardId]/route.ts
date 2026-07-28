import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/apply/:cardId?category=Dining&feeTier=below_500
//
// find-a-card's "Apply Now" buttons point HERE, not directly at the
// affiliate link — this is a standard affiliate-tracking pattern: a
// server-side redirect wrapper means the click is logged reliably
// (works with JS disabled, ad blockers, etc.) rather than depending on a
// client-side onClick handler that might not fire before navigation.
//
// Public route, no auth required — matches /find-a-card itself.
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

  // No card, or no affiliate link on file — send them somewhere sane
  // (back to the search page) instead of a broken redirect.
  if (error || !card?.affiliate_link) {
    return NextResponse.redirect(`${origin}/find-a-card`);
  }

  // Log the click — best-effort, never let a logging failure block the
  // actual redirect the visitor is waiting on.
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
