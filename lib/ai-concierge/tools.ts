import type { SupabaseClient } from '@supabase/supabase-js';
import { searchAwardOptions } from '@/lib/award-engine/searchAwards';

// Small synonym table so a model saying "restaurants" or "eating out"
// still matches an mcc_label of "Dining" — free-text category matching
// between an LLM's phrasing and our seeded labels is inherently fuzzy,
// this just covers the most common real-world phrasings.
const CATEGORY_SYNONYMS: Record<string, string> = {
  restaurants: 'dining',
  restaurant: 'dining',
  'eating out': 'dining',
  food: 'dining',
  supermarket: 'groceries',
  supermarkets: 'groceries',
  grocery: 'groceries',
  flights: 'travel',
  airfare: 'travel',
  hotels: 'travel',
  hotel: 'travel',
  petrol: 'fuel',
  gas: 'fuel',
  'gas station': 'fuel',
  'petrol pump': 'fuel',
  shopping: 'online shopping',
  ecommerce: 'online shopping',
  amazon: 'online shopping',
  flipkart: 'online shopping',
  bills: 'utilities',
  'bill payment': 'utilities',
  electricity: 'utilities',
  movies: 'entertainment',
  streaming: 'entertainment',
  ott: 'entertainment',
};

function normalizeCategory(raw: string): string {
  const lc = raw.trim().toLowerCase();
  return CATEGORY_SYNONYMS[lc] ?? lc;
}

// ============================================================================
// Tool schemas (OpenAI/Groq function-calling format)
// ============================================================================
// This is a fully public concierge — there is no signed-in user, no
// account, nothing personal anywhere in this app. Every tool here reads
// only the shared public catalog (card_products, mcc_rules, award_charts,
// award_route_charts, transfer_partners, programmes) — the exact same
// data /find-a-card, /redeem-miles, and /award-search read from. The
// model decides which of these it needs per question; it does not get a
// raw database connection or a "run arbitrary query" tool.
export const CONCIERGE_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'search_cards_by_category',
      description:
        "Find the best-earning cards in the public catalog for a spend category, optionally under a max annual fee — answers 'which card should I get for dining'. Common categories: Dining, Groceries, Travel, Fuel, Online Shopping, Utilities, Entertainment.",
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: "e.g. 'dining', 'groceries', 'travel'" },
          maxAnnualFee: { type: 'number', description: 'Optional upper bound on annual fee (INR).' },
        },
        required: ['category'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_award_options',
      description:
        'Find which loyalty programmes can book a given route/cabin, the points cost, and the best transfer paths to get there.',
      parameters: {
        type: 'object',
        properties: {
          originRegion: { type: 'string', description: "e.g. 'North India'" },
          destRegion: { type: 'string', description: "e.g. 'UK'" },
          cabin: { type: 'string', enum: ['economy', 'premium_economy', 'business', 'first'] },
          strategy: { type: 'string', enum: ['fewest_hops', 'best_value', 'fastest'] },
          heldProgrammeNames: {
            type: 'array',
            items: { type: 'string' },
            description:
              "Currency/programme names the person says they hold, e.g. ['SmartBuy Points']. Omit to see paths from every possible source currency.",
          },
        },
        required: ['originRegion', 'destRegion', 'cabin'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_award_routes',
      description:
        "Look up a specific airline's published award chart by route (airport codes, city, or country) — points and taxes needed, onward and return. Use this for questions like 'how many Air India miles from Delhi to London'.",
      parameters: {
        type: 'object',
        properties: {
          fromAirport: { type: 'string', description: "3-letter IATA code, e.g. 'DEL'" },
          toAirport: { type: 'string', description: "3-letter IATA code, e.g. 'LHR'" },
          city: { type: 'string', description: "Destination city name, e.g. 'London'" },
          country: { type: 'string', description: "Destination country, e.g. 'UK'" },
        },
        required: [],
      },
    },
  },
];

// ============================================================================
// Tool executors
// ============================================================================
// `supabase` just needs read access to public reference data — no
// signed-in session involved anywhere in this app.
export async function executeTool(supabase: SupabaseClient, toolName: string, input: any) {
  switch (toolName) {
    case 'search_cards_by_category': {
      const categoryLc = normalizeCategory(String(input?.category ?? ''));
      const maxAnnualFee = typeof input?.maxAnnualFee === 'number' ? input.maxAnnualFee : null;

      let query = supabase
        .from('card_products')
        .select('id, name, annual_fee, tagline, affiliate_link, issuers(name), mcc_rules(mcc_label, reward_rate, reward_type)')
        .not('affiliate_link', 'is', null);
      if (maxAnnualFee !== null) query = query.lte('annual_fee', maxAnnualFee);

      const { data, error } = await query;
      if (error) return { error: error.message };

      const recommendations = (data ?? [])
        .flatMap((card: any) => {
          const rules = card.mcc_rules ?? [];
          const match = rules.find((r: any) => {
            const labelLc = normalizeCategory(r.mcc_label ?? '');
            return labelLc.includes(categoryLc) || categoryLc.includes(labelLc);
          });
          if (!match) return [];
          return [
            {
              card: `${card.issuers?.name ?? ''} ${card.name}`.trim(),
              annualFee: card.annual_fee,
              tagline: card.tagline,
              rewardRate: match.reward_rate,
              rewardType: match.reward_type,
              applyLink: card.affiliate_link,
            },
          ];
        })
        .sort((a, b) => b.rewardRate - a.rewardRate)
        .slice(0, 5);

      return { category: input?.category, recommendations };
    }

    case 'search_award_options': {
      let heldProgrammeIds: string[] | undefined;
      if (Array.isArray(input?.heldProgrammeNames) && input.heldProgrammeNames.length > 0) {
        const { data: matched } = await supabase
          .from('programmes')
          .select('id, name');
        const namesLc = input.heldProgrammeNames.map((n: string) => n.toLowerCase());
        heldProgrammeIds = (matched ?? [])
          .filter((p) => namesLc.some((n: string) => p.name.toLowerCase().includes(n) || n.includes(p.name.toLowerCase())))
          .map((p) => p.id);
      }

      const result = await searchAwardOptions(supabase, {
        originRegion: input.originRegion,
        destRegion: input.destRegion,
        cabin: input.cabin,
        strategy: input.strategy,
        heldProgrammeIds,
      });
      return result;
    }

    case 'search_award_routes': {
      let query = supabase
        .from('award_route_charts')
        .select('from_airport, to_airport, city, country, points_onward, taxes_onward, points_return, taxes_return, programmes(name)');

      if (input?.fromAirport) query = query.ilike('from_airport', input.fromAirport);
      if (input?.toAirport) query = query.ilike('to_airport', input.toAirport);
      if (input?.city) query = query.ilike('city', `%${input.city}%`);
      if (input?.country) query = query.ilike('country', `%${input.country}%`);

      const { data, error } = await query.limit(10);
      if (error) return { error: error.message };

      return {
        routes: (data ?? []).map((r: any) => ({
          programme: r.programmes?.name,
          from: r.from_airport,
          to: r.to_airport,
          city: r.city,
          country: r.country,
          pointsOnward: r.points_onward,
          taxesOnward: Number(r.taxes_onward),
          pointsReturn: r.points_return,
          taxesReturn: Number(r.taxes_return),
        })),
      };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
