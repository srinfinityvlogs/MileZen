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
// Design principle: every tool is READ-ONLY and returns only small,
// structured, already-aggregated data — never a full statement dump, never
// another user's data (every handler below uses the caller's own
// RLS-scoped Supabase client, passed in from the route handler). The model
// decides which of these it needs per question; it does not get a raw
// database connection or a "run arbitrary query" tool.
export const CONCIERGE_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'get_point_balances',
      description: "Get the user's current point/mile balance in every loyalty programme they hold.",
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_upcoming_reminders',
      description: "Get the user's upcoming card annual fees and point-expiry reminders.",
      parameters: {
        type: 'object',
        properties: {
          daysAhead: { type: 'number', description: 'How many days ahead to look. Default 60.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_award_options',
      description:
        'Find which loyalty programmes can book a given route/cabin, the points cost, and the best transfer paths from currencies the user already holds.',
      parameters: {
        type: 'object',
        properties: {
          originRegion: { type: 'string', description: "e.g. 'North India'" },
          destRegion: { type: 'string', description: "e.g. 'UK'" },
          cabin: { type: 'string', enum: ['economy', 'premium_economy', 'business', 'first'] },
          strategy: { type: 'string', enum: ['fewest_hops', 'best_value', 'fastest'] },
        },
        required: ['originRegion', 'destRegion', 'cabin'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_card_recommendation',
      description:
        "Given a spend category or merchant type, return the user's own cards ranked by reward rate for that category — answers 'which card should I swipe'. Common categories: Dining, Groceries, Travel, Fuel, Online Shopping, Utilities, Entertainment.",
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: "e.g. 'dining', 'groceries', 'travel'" },
        },
        required: ['category'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_recent_spending_summary',
      description:
        "Get the user's spending grouped by category over a recent period — for 'where did my money go' type questions. Aggregated only, not itemized.",
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'number', description: 'Lookback window in days. Default 30.' },
        },
        required: [],
      },
    },
  },
];

// ============================================================================
// Tool executors
// ============================================================================
// `supabase` here MUST be the caller's own RLS-scoped client from
// lib/supabase/server.ts. Never pass the service-role client into these —
// they intentionally rely on RLS to make cross-user leakage structurally
// impossible, not just "handled in application logic."
export async function executeTool(supabase: SupabaseClient, toolName: string, input: any) {
  switch (toolName) {
    case 'get_point_balances': {
      const { data, error } = await supabase.from('point_balances').select('programme_id, balance, programmes(name)');
      if (error) return { error: error.message };
      return {
        balances: (data ?? []).map((b: any) => ({
          programme: b.programmes?.name ?? 'Unknown',
          balance: b.balance,
        })),
      };
    }

    case 'get_upcoming_reminders': {
      const daysAhead = typeof input?.daysAhead === 'number' ? input.daysAhead : 60;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + daysAhead);
      const { data, error } = await supabase
        .from('reminders')
        .select('reminder_type, due_date, message, user_cards(nickname), programmes(name)')
        .eq('is_dismissed', false)
        .lte('due_date', cutoff.toISOString().slice(0, 10))
        .order('due_date', { ascending: true });
      if (error) return { error: error.message };
      return {
        reminders: (data ?? []).map((r: any) => ({
          type: r.reminder_type,
          dueDate: r.due_date,
          message: r.message,
          card: r.user_cards?.nickname,
          programme: r.programmes?.name,
        })),
      };
    }

    case 'search_award_options': {
      const result = await searchAwardOptions(supabase, {
        originRegion: input.originRegion,
        destRegion: input.destRegion,
        cabin: input.cabin,
        strategy: input.strategy,
      });
      return result;
    }

    case 'get_card_recommendation': {
      // Joins the user's own cards against the global mcc_rules reference
      // table, filtered by a fuzzy label match on the category the model asked about.
      const { data, error } = await supabase
        .from('user_cards')
        .select('id, nickname, last4, card_products(id, name, mcc_rules(mcc_label, reward_rate, reward_type))')
        .eq('is_active', true);
      if (error) return { error: error.message };

      const categoryLc = normalizeCategory(String(input?.category ?? ''));
      const recommendations = (data ?? [])
        .flatMap((card: any) => {
          const rules = card.card_products?.mcc_rules ?? [];
          const match = rules.find((r: any) => {
            const labelLc = normalizeCategory(r.mcc_label ?? '');
            // Bidirectional substring match — a one-directional check only
            // catches cases where the model's word happens to be a
            // substring of our label (or vice versa), and misses realistic
            // phrasing like "restaurants" for a label of "Dining".
            return labelLc.includes(categoryLc) || categoryLc.includes(labelLc);
          });
          if (!match) return [];
          return [
            {
              card: card.nickname ?? card.card_products?.name,
              last4: card.last4,
              rewardRate: match.reward_rate,
              rewardType: match.reward_type,
            },
          ];
        })
        .sort((a, b) => b.rewardRate - a.rewardRate);

      return { category: input?.category, recommendations };
    }

    case 'get_recent_spending_summary': {
      const days = typeof input?.days === 'number' ? input.days : 30;
      const since = new Date();
      since.setDate(since.getDate() - days);
      const { data, error } = await supabase
        .from('transactions')
        .select('amount, category_note, mcc_code')
        .gte('txn_date', since.toISOString().slice(0, 10));
      if (error) return { error: error.message };

      // Aggregate server-side before it ever reaches the model — the LLM
      // never sees individual merchant names/line items for this tool,
      // only category totals.
      const totals = new Map<string, number>();
      for (const t of data ?? []) {
        const key = t.category_note ?? t.mcc_code ?? 'Uncategorized';
        totals.set(key, (totals.get(key) ?? 0) + Number(t.amount));
      }
      return {
        periodDays: days,
        byCategory: Array.from(totals.entries()).map(([category, total]) => ({ category, total })),
      };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
