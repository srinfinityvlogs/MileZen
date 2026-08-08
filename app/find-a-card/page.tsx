import { createClient } from '@/lib/supabase/server';
import styles from './find-a-card.module.css';

// Prevents Next.js's fetch cache from serving stale Supabase results.
// The page already renders dynamically because it reads searchParams,
// but that alone doesn't stop individual fetch() calls (which the
// Supabase client makes under the hood) from being cached separately.
export const dynamic = 'force-dynamic';

const CATEGORIES = ['Dining', 'Groceries', 'Travel', 'Fuel', 'Online Shopping', 'Utilities', 'Entertainment'];

const FEE_TIERS = [
  { value: 'lifetime_free', label: 'Lifetime Free', min: 0, max: 0 },
  { value: 'below_500', label: 'Below \u20b9500', min: 1, max: 499 },
  { value: '500_1000', label: '\u20b9500 - \u20b91,000', min: 500, max: 1000 },
  { value: '1000_5000', label: '\u20b91,000 - \u20b95,000', min: 1001, max: 5000 },
  { value: 'above_5000', label: 'Above \u20b95,000', min: 5001, max: null as number | null },
];

const SORTS = [
  { value: 'reward', label: 'Best reward rate' },
  { value: 'fee_asc', label: 'Annual fee: Low to High' },
  { value: 'fee_desc', label: 'Annual fee: High to Low' },
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
  secondaryRewardRate: number | null;
  secondaryRewardNote: string | null;
}

// Public page — no auth. Server-rendered (not a client fetch) so results
// are a real, bookmarkable, shareable, crawlable URL like
// /find-a-card?category=Dining&feeTier=below_500&sort=fee_asc
export default async function FindACardPage({
  searchParams,
}: {
  searchParams: { category?: string; feeTier?: string; sort?: string };
}) {
  const supabase = await createClient();
  const category = searchParams.category ?? '';
  const selectedTier = FEE_TIERS.find((t) => t.value === searchParams.feeTier);
  const sort = SORTS.find((s) => s.value === searchParams.sort) ? searchParams.sort! : 'reward';

  let results: CardResult[] = [];
  const searched = category.length > 0;

  if (searched) {
    let query = supabase
      .from('card_products')
      .select(
        'id, name, annual_fee, currency, affiliate_link, tagline, fee_waiver_note, issuers(name), mcc_rules(mcc_label, reward_rate, reward_type, secondary_reward_rate, secondary_reward_note)'
      )
      .not('affiliate_link', 'is', null);

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
            secondaryRewardRate: rule.secondary_reward_rate ?? null,
            secondaryRewardNote: rule.secondary_reward_note ?? null,
          },
        ];
      })
      .sort((a, b) => {
        if (sort === 'fee_asc') return a.annualFee - b.annualFee;
        if (sort === 'fee_desc') return b.annualFee - a.annualFee;
        return b.rewardRate - a.rewardRate;
      })
      .slice(0, 5);
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Find a card</h1>
        <p className={styles.intro}>
          Tell us what you spend on, your annual fee budget, and how to sort — we'll show the
          best cards for that category.
        </p>

        <form method="get" className={styles.form}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="category">Category</label>
            <select id="category" name="category" defaultValue={category} required className={styles.select}>
              <option value="" disabled>Choose one</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="feeTier">Annual fee</label>
            <select id="feeTier" name="feeTier" defaultValue={searchParams.feeTier ?? ''} className={styles.select}>
              <option value="">Any</option>
              {FEE_TIERS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="sort">Sort by</label>
            <select id="sort" name="sort" defaultValue={sort} className={styles.select}>
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <button type="submit" className={styles.button}>Search</button>
        </form>

        {searched && (
          <>
            <p className={styles.resultsHeading}>
              Top picks for {category}
              {selectedTier ? ` \u00b7 ${selectedTier.label}` : ''}
              {' \u00b7 '}{SORTS.find((s) => s.value === sort)?.label}
            </p>

            {results.length === 0 ? (
              <p className={styles.empty}>No cards match that yet. Try a different fee range or category.</p>
            ) : (
              results.map((card, i) => (
                <div key={card.id} className={styles.row}>
                  <span className={styles.rank}>{String(i + 1).padStart(2, '0')}</span>
                  <div className={styles.cardInfo}>
                    {i === 0 && sort === 'reward' && <span className={styles.topPickBadge}>Top Pick</span>}
                    <p className={styles.cardName}>
                      {card.issuerName} {card.name}
                    </p>
                    {card.tagline && <p className={styles.tagline}>{card.tagline}</p>}
                    {card.annualFee === 0 && card.feeWaiverNote && (
                      <p className={styles.feeNote}>{card.feeWaiverNote}</p>
                    )}
                    {card.secondaryRewardRate !== null && (
                      <p className={styles.feeNote}>
                        {card.rewardRate}
                        {card.rewardType === 'cashback_pct' ? '%' : '\u00d7'} on {category}
                        {' \u00b7 '}
                        {card.secondaryRewardRate}
                        {card.rewardType === 'cashback_pct' ? '%' : '\u00d7'} elsewhere
                        {card.secondaryRewardNote ? ` \u00b7 ${card.secondaryRewardNote}` : ''}
                      </p>
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
                    href={`/api/apply/${card.id}?category=${encodeURIComponent(category)}&feeTier=${searchParams.feeTier ?? ''}`}
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
              {' \u00b7 '}
              <a href="/terms" style={{ color: 'inherit' }}>Terms of Service</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
