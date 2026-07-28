import { createClient } from '@/lib/supabase/server';

const CATEGORIES = ['Dining', 'Groceries', 'Travel'];

// Bucketed fee tiers instead of a free-text "max fee" number — easier for
// a visitor to pick from than guessing/typing an exact rupee figure.
// Ranges are non-overlapping and cover every possible annual_fee value:
//   lifetime_free: exactly 0
//   below_500:     1 - 499
//   500_1000:      500 - 1000
//   1000_5000:     1001 - 5000
//   above_5000:    5001+
const FEE_TIERS = [
  { value: 'lifetime_free', label: 'Lifetime Free', min: 0, max: 0 },
  { value: 'below_500', label: 'Below \u20b9500', min: 1, max: 499 },
  { value: '500_1000', label: '\u20b9500 - \u20b91,000', min: 500, max: 1000 },
  { value: '1000_5000', label: '\u20b91,000 - \u20b95,000', min: 1001, max: 5000 },
  { value: 'above_5000', label: 'Above \u20b95,000', min: 5001, max: null as number | null },
];

interface CardResult {
  id: string;
  name: string;
  issuerName: string;
  annualFee: number;
  currency: string;
  affiliateLink: string;
  tagline: string | null;
  feeWaiverNote: string | null;
  rewardRate: number;
  rewardType: 'cashback_pct' | 'points_per_unit';
}

// Public page — deliberately no auth check. The whole point is reaching
// someone who hasn't signed up for MileZen yet: "which card should I
// even get," not "help me track cards I already have." Server-rendered
// (not a client fetch) so results are crawlable — matters for the SEO
// work planned later, and costs nothing to do correctly now.
export default async function FindACardPage({
  searchParams,
}: {
  searchParams: { category?: string; feeTier?: string };
}) {
  const supabase = await createClient();
  const category = searchParams.category;
  const selectedTier = FEE_TIERS.find((t) => t.value === searchParams.feeTier);

  let results: CardResult[] = [];
  let searched = false;

  if (category) {
    searched = true;
    // card_products has a public SELECT grant for the `anon` role too
    // (see schema.sql section 5) — this works whether or not the visitor
    // is signed in.
    let query = supabase
      .from('card_products')
      .select(
        'id, name, annual_fee, currency, affiliate_link, tagline, fee_waiver_note, issuers(name), mcc_rules(mcc_label, reward_rate, reward_type)'
      )
      .not('affiliate_link', 'is', null); // only ever recommend cards we can actually link to

    if (selectedTier) {
      query = query.gte('annual_fee', selectedTier.min);
      if (selectedTier.max !== null) {
        query = query.lte('annual_fee', selectedTier.max);
      }
    }

    const { data } = await query;

    results = (data ?? [])
      .flatMap((card: any) => {
        const rule = card.mcc_rules?.find((r: any) => r.mcc_label?.toLowerCase() === category.toLowerCase());
        if (!rule) return [];
        return [
          {
            id: card.id,
            name: card.name,
            issuerName: card.issuers?.name ?? '',
            annualFee: card.annual_fee,
            currency: card.currency,
            affiliateLink: card.affiliate_link,
            tagline: card.tagline,
            feeWaiverNote: card.fee_waiver_note,
            rewardRate: rule.reward_rate,
            rewardType: rule.reward_type,
          },
        ];
      })
      .sort((a, b) => b.rewardRate - a.rewardRate)
      .slice(0, 5);
  }

  return (
    <main style={{ padding: 40, fontFamily: 'system-ui', maxWidth: 640 }}>
      <h1>Find a card</h1>
      <p style={{ color: '#666', fontSize: 14 }}>
        Tell us what you spend on and your annual fee budget - we'll show the best-earning cards
        for that category.
      </p>

      {/* Plain GET form — works with JS disabled, and results are a real,
          bookmarkable, shareable, crawlable URL like
          /find-a-card?category=Dining&feeTier=below_500 */}
      <form method="get" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
        <label>
          Category
          <select name="category" defaultValue={category ?? ''} required style={{ display: 'block', padding: 8 }}>
            <option value="" disabled>
              Choose one
            </option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          Annual fee
          <select
            name="feeTier"
            defaultValue={searchParams.feeTier ?? ''}
            style={{ display: 'block', padding: 8 }}
          >
            <option value="">Any</option>
            {FEE_TIERS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" style={{ alignSelf: 'flex-end', height: 38 }}>
          Search
        </button>
      </form>

      {searched && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 18 }}>
            Top picks for {category}
            {selectedTier ? ` (${selectedTier.label})` : ''}
          </h2>

          {results.length === 0 ? (
            <p>No cards match that yet - try a different fee range or category.</p>
          ) : (
            results.map((card) => (
              <div key={card.id} style={{ border: '1px solid #eee', padding: 16, marginBottom: 12 }}>
                <strong>
                  {card.issuerName} {card.name}
                </strong>
                {card.tagline && <p style={{ margin: '4px 0', color: '#555' }}>{card.tagline}</p>}
                <p style={{ margin: '4px 0' }}>
                  {card.annualFee === 0 ? 'Lifetime free' : `${card.currency} ${card.annualFee.toLocaleString()}/yr`}
                  {card.feeWaiverNote ? ` - ${card.feeWaiverNote}` : ''}
                </p>
                <p style={{ margin: '4px 0' }}>
                  Earns <strong>{card.rewardRate}</strong>{' '}
                  {card.rewardType === 'cashback_pct' ? '% cashback' : 'points per \u20b91'} on {category}
                </p>
                <a
                  href={card.affiliateLink}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  style={{
                    display: 'inline-block',
                    marginTop: 8,
                    padding: '8px 16px',
                    background: '#111',
                    color: '#fff',
                    textDecoration: 'none',
                  }}
                >
                  Apply Now
                </a>
              </div>
            ))
          )}

          <p style={{ fontSize: 12, color: '#999', marginTop: 24 }}>
            MileZen may earn a commission if you apply for a card through these links, at no cost
            to you. This never affects which cards are shown or how they're ranked.
          </p>
        </div>
      )}
    </main>
  );
}
