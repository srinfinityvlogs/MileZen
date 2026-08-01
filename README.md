# MileZen

Free tools for finding the best credit card for your spending, and the smartest way to redeem
airline miles — **no login, no account, nothing personal stored anywhere.**

## What's here

- **`/find-a-card`** — search the card catalog by spend category and annual-fee budget, ranked by
  real reward rate, with affiliate "Apply Now" links.
- **`/redeem-miles`** — a real published award chart (starting with Air India's Maharaja Club) —
  points and taxes, city to city.
- **`/award-search`** — find which loyalty programme can book a route/cabin, and the best
  multi-hop transfer path to get the points there. You tell it which currencies you hold via
  checkboxes on the page itself — nothing is saved or remembered between visits.
- **`/concierge`** — an AI chat over the same catalog, for natural-language versions of the above
  ("which card is best for dining under ₹1,000," "how many Maharaja Club miles from Delhi to
  London"). Conversation lives only in your browser tab; nothing is stored server-side.

## Project history — a pivot happened here

MileZen originally started as a personal card/points ledger with login, manually-entered
transactions, statement PDF parsing, reminders, and account deletion. That entire layer has been
**removed** (not the underlying database tables, which were deliberately left in place in case
that direction is revisited later — just the app code that used them). The product is now
exclusively the four public, no-login tools above. If you're wondering why the schema still has
tables like `user_cards`, `transactions`, or `point_ledger` that nothing in the app touches
anymore — that's why.

## Stack

- **Next.js 14** — deployed on Vercel's free Hobby tier
- **Supabase** — Postgres database only now (no Auth, no Storage in active use) — anon-key reads
  of a public reference catalog
- **Groq** — free-tier, OpenAI-compatible inference API for the AI concierge (no data retention
  by default per their policy — verify current terms yourself)

## Quick start

1. Unzip the project.
2. `cp .env.local.example .env.local` and fill in your Supabase project's URL/anon key, and a
   Groq API key (console.groq.com/keys).
3. In Supabase's SQL editor: run `supabase/schema.sql`, then each file in `supabase/migrations/`
   in numeric order (002 through 013). Yes, this creates ledger/account tables the app no longer
   uses — see "Project history" above for why they're still part of the schema.
4. `npm install`
5. `npm run dev`

## Deploying to Vercel (free tier)

1. Push this repo to GitHub, import it in Vercel.
2. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `GROQ_API_KEY`, and optionally `CONCIERGE_MODEL` as environment variables.
3. Deploy. There's no cron job, no email provider, no auth redirect URL to configure — the whole
   reason those existed was the login/reminders system that's no longer part of the app.

## Security notes

- **Every reference table has RLS enabled with an explicit public-read policy**
  (`issuers`, `programmes`, `card_products`, `mcc_rules`, `transfer_partners`, `award_charts`,
  `award_route_charts`) — see migrations 010 and 013. This isn't about protecting personal data
  (there isn't any), it's simply the pattern Supabase's own linter expects, and it's more robust
  than relying on GRANT/REVOKE alone — see the git history around migration 005 for why that
  distinction mattered in this project's earlier ledger-app phase.
- **`SUPABASE_SERVICE_ROLE_KEY` is used in exactly one place**: the reference-data ingestion
  script (`npm run ingest:reference`), run by a trusted maintainer locally — never by the deployed
  app itself. There's no admin action, cron job, or user request anywhere in the live app that
  needs elevated privileges anymore.
- **The AI concierge sends your message to Groq's API.** Nothing else about your visit is sent —
  no IP-based tracking, no account, no history beyond that single request. Don't type anything
  into it you wouldn't want processed by a third-party AI service.
- **The public card-search tool logs anonymous, non-identifying usage** (which category/fee-tier
  was searched, which card was clicked) to a write-only table (`card_search_events`, migration
  009) — nobody can read it back through the public API, only a future service-role analytics
  script could.

## The reference-data pipeline

This is the actual product now — every tool above reads from the same curated catalog, kept as
human-editable JSON under `/data`, validated with Zod, and pushed to the database with one
script.

```
npm run ingest:reference:dry   # validate + preview, no writes, no DB credentials needed
npm run ingest:reference        # writes to the database (needs SUPABASE_SERVICE_ROLE_KEY)
```

- `data/issuers.json`, `data/programmes.json` — banks and loyalty programmes, referenced by name
  everywhere else (never by database UUID — a contributor never needs DB access to propose a
  change).
- `data/card-products.json` — the card catalog. Each entry needs `affiliateLink` to actually show
  up in `/find-a-card` results (cards without one are filtered out on purpose — MileZen only ever
  recommends a card it can actually link you to).
- `data/mcc-rules.json` — reward rate per card per spend category. Categories currently in use:
  Dining, Groceries, Travel, Fuel, Online Shopping, Utilities, Entertainment — kept in sync across
  `/find-a-card`, `/concierge`'s category-matching, and this file. There's no single source of
  truth for that category list since it's used in genuinely different contexts (a UI dropdown vs.
  an LLM tool schema) — updating one without the others is an easy mistake to make later.
- `data/transfer-partners/*.json`, `data/award-charts/*.json` — power `/award-search`'s
  multi-hop path finding (region-level, e.g. "North India" → "UK").
- `data/award-route-charts/*.json` — power `/redeem-miles` (airport-pair level, with separate
  onward/return taxes — a different, more precise granularity than the region-based award charts
  above, which is why it's a separate table and file format rather than forced into the same
  shape).

Every entry that isn't purely mechanical (award charts, transfer ratios) carries a `sourceUrl` and
`lastVerified` date. `npm run check:stale` reports anything not re-verified in 90+ days, and
`.github/workflows/stale-reference-data.yml` runs that weekly, opening a tracking issue when
something needs a re-check.

## AI concierge tools

The model in `/concierge` can only call three narrow, read-only tools (`lib/ai-concierge/tools.ts`)
— it has no direct database access:

- `search_cards_by_category` — same logic as `/find-a-card`
- `search_award_options` — same logic as `/award-search`, held currencies passed explicitly per
  message (the model extracts "I have SmartBuy Points" from conversation if you say so — nothing
  is remembered across separate conversations)
- `search_award_routes` — same logic as `/redeem-miles`

Groq's API is OpenAI-compatible; `lib/ai-concierge/callModel.ts` uses the official `openai` SDK
pointed at Groq's base URL rather than a Groq-specific SDK. The Groq client is built lazily per
call (not once at module load) — building it at module scope can "freeze" it with a stale/empty
API key across Next.js dev-server hot reloads.

## Project structure

```
app/
  page.tsx                    landing page, links to all four tools
  find-a-card/page.tsx         card search + affiliate Apply Now links
  find-a-card/find-a-card.module.css
  redeem-miles/page.tsx        published award chart browser (Maharaja Club, extensible)
  redeem-miles/redeem-miles.module.css
  award-search/page.tsx        route/cabin/strategy search with held-currency checkboxes
  award-search/AwardSearchForm.tsx
  concierge/page.tsx            AI chat, client-side-only history
  privacy/page.tsx, terms/page.tsx, legal/legal.module.css
  api/apply/[cardId]/route.ts   logs apply_click, redirects to the real affiliate link
  api/award-search/route.ts     thin wrapper around lib/award-engine/searchAwards.ts
  api/concierge/route.ts        auth-free — validates input, runs the tool-use loop, returns
lib/
  supabase/server.ts            plain anon-key client, no cookies/session (nothing to authenticate)
  award-engine/searchAwards.ts  shared core used by the API route, the page, AND the concierge tool
  transfer-graph/               depth-bounded, cycle-safe multi-hop path search
  ai-concierge/                 tools.ts, systemPrompt.ts, callModel.ts
  reference-data/schema.ts      Zod validation for every /data file shape
scripts/
  ingest-reference-data.ts      validates + upserts /data into Postgres (service role, maintainer-run only)
  check-stale-reference-data.ts reports rows not re-verified in 90+ days (anon key, read-only)
data/                           the actual product — see "reference-data pipeline" above
supabase/schema.sql, supabase/migrations/   full schema + history, including now-unused ledger tables
.github/workflows/               validate /data on every PR; weekly staleness report
```
