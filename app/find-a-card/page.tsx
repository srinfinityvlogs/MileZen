import { createClient } from '@/lib/supabase/server';
import styles from './find-a-card.module.css';

const CATEGORIES = ['Dining', 'Groceries', 'Travel', 'Fuel', 'Online Shopping', 'Utilities', 'Entertainment'];

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
  // Computed once, as a guaranteed string ('' when absent) — TypeScript
  // can't reliably narrow `searchParams.category` (string | undefined)
  // across the .map()/.flatMap() closures below, so this avoids fighting
  // that everywhere it's used instead of narrowing once and losing it.
  const category = searchParams.category ?? '';
  const selectedTier = FEE_TIERS.find((t) => t.value === searchParams.feeTier);

  let results: CardResult[] = [];
  const searched = category.length > 0;

  if (searched) {
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
            tagline: card.tagline,
            feeWaiverNote: card.fee_waiver_note,
            rewardRate: rule.reward_rate,
            rewardType: rule.reward_type,
          },
        ];
      })
      .sort((a, b) => b.rewardRate - a.rewardRate)
      .slice(0, 5);

    // Log the search — best-effort, never let this block or break the
    // page if it fails. Write-only table (see migration 009): nobody can
    // read this back through the public API, only a future service-role
    // analytics script.
    try {
      await supabase.from('card_search_events').insert({
        event_type: 'search',
        category,
        fee_tier: searchParams.feeTier ?? null,
      });
    } catch (err) {
      console.error('Failed to log search event', (err as Error).message);
    }
  }

  return (
    <div className={styles.page}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600&family=IBM+Plex+Sans:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500;700&display=swap"
      />
      <div className={styles.container}>
        <p className={styles.mark}>MileZen</p>
        <h1 className={styles.title}>Find a card</h1>
        <p className={styles.intro}>
          Tell us what you spend on and your annual fee budget. We'll show the best-earning cards
          for that category, ranked by reward rate.
        </p>

        {/* Plain GET form — works with JS disabled, and results are a real,
            bookmarkable, shareable, crawlable URL like
            /find-a-card?category=Dining&feeTier=below_500 */}
        <form method="get" className={styles.form}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="category">
              Category
            </label>
            <select
              id="category"
              name="category"
              defaultValue={category ?? ''}
              required
              className={styles.select}
            >
              <option value="" disabled>
                Choose one
              </option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="feeTier">
              Annual fee
            </label>
            <select
              id="feeTier"
              name="feeTier"
              defaultValue={searchParams.feeTier ?? ''}
              className={styles.select}
            >
              <option value="">Any</option>
              {FEE_TIERS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className={styles.button}>
            Search
          </button>
        </form>

        {searched && (
          <>
            <p className={styles.resultsHeading}>
              Top picks for {category}
              {selectedTier ? ` \u00b7 ${selectedTier.label}` : ''}
            </p>

            {results.length === 0 ? (
              <p className={styles.empty}>No cards match that yet. Try a different fee range or category.</p>
            ) : (
              results.map((card, i) => (
                <div key={card.id} className={styles.row}>
                  <span className={styles.rank}>{String(i + 1).padStart(2, '0')}</span>
                  <div className={styles.cardInfo}>
                    {i === 0 && <span className={styles.topPickBadge}>Top Pick</span>}
                    <p className={styles.cardName}>
                      {card.issuerName} {card.name}
                    </p>
                    {card.tagline && <p className={styles.tagline}>{card.tagline}</p>}
                    {card.annualFee === 0 && card.feeWaiverNote && (
                      <p className={styles.feeNote}>{card.feeWaiverNote}</p>
                    )}
                  </div>
                  <div className={styles.numbers}>
                    <div className={styles.feeCol}>
                      <span className={styles.rateValue}>
                        {card.annualFee === 0 ? 'Free' : `${card.currency}${card.annualFee.toLocaleString()}`}
                      </span>
                      <span className={styles.feeValue}>per year</span>
                    </div>
                    <div className={styles.rateCol}>
                      <span className={styles.rateValue}>
                        {card.rewardRate}
                        {card.rewardType === 'cashback_pct' ? '%' : '\u00d7'}
                      </span>
                      <span className={styles.rateLabel}>{category}</span>
                    </div>
                  </div>
                  <a
                    href={`/api/apply/${card.id}?category=${encodeURIComponent(category)}&feeTier=${
                      searchParams.feeTier ?? ''
                    }`}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className={styles.applyLink}
                  >
                    Apply Now
                  </a>
                </div>
              ))
            )}

            <p className={styles.disclosure}>
              MileZen may earn a commission if you apply for a card through these links, at no
              cost to you. This never affects which cards are shown or how they're ranked.
              {' '}
              <a href="/privacy" style={{ color: 'inherit' }}>Privacy Policy</a>
              {' · '}
              <a href="/terms" style={{ color: 'inherit' }}>Terms of Service</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
