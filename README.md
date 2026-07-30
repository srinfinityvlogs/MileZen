# MileZen

The operating system for your cards, points, and miles.

## Stack

- **Next.js 14 (App Router)** — deployed on Vercel's free Hobby tier
- **Supabase** — Postgres DB + Auth + Storage, free tier
- **RLS-first**: every user-data table enforces isolation at the database
  layer, not just in application code

## Quick start

1. Unzip the project.
2. `cp .env.local.example .env.local` and fill in your Supabase project's
   URL/keys (Project Settings → API) — see **Setup** below for the full list.
3. In Supabase's SQL editor: run `supabase/schema.sql`, then
   `supabase/storage_policies.sql`, then each file in
   `supabase/migrations/` in order (002 → 003 → 004 → 005 → 006 → 007 → 008 → 009 → 010 → 011 → 012 → 013).
4. `npm install`
5. `npm run dev` — if you edit `.env.local` while the server is already
   running, stop it (Ctrl+C) and restart; Next.js only reads env files at
   startup.

## Setup

1. Create a free project at supabase.com.
2. In the SQL editor, run `supabase/schema.sql`, then each file under
   `supabase/migrations/` in numeric order (002 through 013) — together
   these create every table, RLS policy, and trigger.

   **If your project has Supabase's "Enable automatic RLS" project
   setting turned on**, it force-enables RLS *with zero policies* the
   moment a table is created — which, on the six global reference tables
   (issuers, programmes, transfer_partners, card_products, award_charts,
   mcc_rules), makes every query against them silently return zero rows
   between `schema.sql` running and migration 010 adding the real
   public-read policies. Just make sure you run every migration file,
   including 005 and 010, in order — the final state after 010 has RLS
   properly enabled on these tables with explicit read policies (not
   left RLS-off as originally designed — see "Security notes" below for
   why that changed).
3. In Supabase Auth settings, enable **Email OTP (magic link)** sign-in.
   Disable password-based sign-in unless you specifically want it — fewer
   credentials to protect.
4. Create a **private** Storage bucket called `statements` for uploaded
   PDFs. Do not make it public. Then run `supabase/storage_policies.sql`
   in the SQL editor to lock it down so each user can only read/write
   files under their own `auth.uid()` folder.
5. Copy `.env.local.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from
     Supabase project settings → API. Safe to expose to the browser.
   - `SUPABASE_SERVICE_ROLE_KEY` — from the same page. **Never** expose
     this to the client, never prefix with `NEXT_PUBLIC_`, never commit it.
   - `GROQ_API_KEY` (or your chosen LLM provider's API key) — used
     server-side only for the AI concierge, once we build that piece.
6. `npm install`
7. `npm run dev`

## Deploying to Vercel (free tier)

1. Push this repo to GitHub.
2. Import it in Vercel.
3. Add the same environment variables from `.env.local` in Vercel's
   Project Settings → Environment Variables. Mark `SUPABASE_SERVICE_ROLE_KEY`
   and `GROQ_API_KEY` as **server-only** (don't expose them — Vercel
   only exposes vars prefixed `NEXT_PUBLIC_` to the client bundle anyway,
   but double-check you never reference the service-role key from a
   client component).
4. Deploy.

## Security notes for this project specifically

Since this handles financial data, a few rules to keep permanently true
as the codebase grows:

- **Never bypass RLS for a normal user request.** The service-role client
  (`lib/supabase/service.ts`) exists only for trusted server jobs
  (reminders cron, reference-data ingestion, inbound-email webhook). If
  you ever find yourself importing it inside code that handles a regular
  user's page load or API call, stop — use the RLS-scoped client instead.
- **No full card numbers, ever** — schema only allows `last4`.
- **The points ledger is append-only** — there is no UPDATE/DELETE policy
  on `point_ledger`. Corrections are new rows, not edits.
- **Uploaded PDFs stay in private Storage**, referenced by path — never
  inline file bytes in the database or in logs.
- **LLM calls use the developer API key server-side only**, and only the
  minimal derived context (not raw statements) is sent per request. Check
  your provider's current data-retention/training terms before shipping —
  these are commercial policies that can change, so verify rather than
  assume.
- **Audit log is server-write-only** (`audit_log` has no insert policy for
  the `authenticated` role) so users can't forge or erase it.
- Before adding any third-party analytics/error-tracking tool (Sentry,
  PostHog, etc.), scrub PII/financial fields from anything sent to it.
- Rotate the Supabase service-role key immediately if it's ever exposed
  (committed to git, logged, pasted anywhere public).
- **Any Postgres VIEW must be created `WITH (security_invoker = true)`.**
  This was a real gap found and fixed in this project (migration 007):
  Postgres views run with the permissions of their *owner* by default —
  typically the `postgres` superuser in Supabase — which silently
  **bypasses RLS** on the underlying table for anyone querying the view,
  even the `authenticated` role. `point_balances` was missing this
  originally. If you add another view later, this option is easy to
  forget and won't error — it'll just silently leak cross-user data. Test
  every new view the same way: sign in as one user, query it, and confirm
  you never see another user's rows.
- **Global reference tables (issuers, programmes, transfer_partners,
  card_products, award_charts, mcc_rules) have RLS enabled with an
  explicit public-read policy** (migration 010), not left RLS-off relying
  on GRANT/REVOKE alone as originally designed. Two reasons: Supabase's
  own security linter flags any public table without RLS as an
  ERROR-level finding regardless of intent, and — more importantly — this
  project already hit a real incident (migration 005) where a Supabase
  project-level setting silently force-enabled RLS on these same tables
  with zero policies, breaking every query against them. Depending on RLS
  staying *off* turned out to be fragile against something outside this
  repo's own SQL. RLS-on-with-an-explicit-policy achieves identical
  access but can't silently regress the same way.
- **Trigger-only functions must have EXECUTE revoked from `anon`/
  `authenticated`** (migration 011). `handle_new_user()` and
  `sync_annual_fee_reminder()` are SECURITY DEFINER functions meant to
  run only as triggers — but Postgres/PostgREST exposes every function in
  the `public` schema as a directly-callable RPC endpoint by default.
  Revoking EXECUTE closes that off without breaking the triggers
  themselves (trigger firing doesn't go through the calling role's
  EXECUTE privilege check the way a direct call would). Any future
  SECURITY DEFINER trigger function needs the same treatment.
- **Enable "Leaked Password Protection"** in Supabase → Authentication →
  Policies (checks new passwords against HaveIBeenPwned). This is a
  dashboard toggle, not something a migration can set. Since this app is
  magic-link-only by design (see the auth section above — deliberately no
  password field anywhere in the UI), this mostly matters as defense in
  depth in case Supabase's password-based sign-in is still reachable via
  direct API calls even without a UI exposing it; consider disabling
  email+password sign-in entirely under Authentication → Providers if
  it's genuinely unused.
- **`rls_auto_enable()`** (if flagged by the linter) is not defined
  anywhere in this project's own SQL — it's Supabase's internal
  implementation of the "Enable automatic RLS" project setting. Migration
  012 revokes public RPC access to it (same treatment as our own trigger
  functions in migration 011), which resolves the lint without needing to
  know or modify the function's actual body. This project no longer
  depends on that setting — every table's RLS state is now managed
  explicitly — so turning it off entirely in the dashboard is also a
  reasonable option if you'd rather remove the function's presence
  altogether.

## Statement parsing pipeline

`/dashboard/statements` is the UI for this — pick which card a PDF belongs
to, upload it, and the page immediately triggers parsing and shows the
result (parsed transaction count, or a clear error if the format wasn't
recognized). History of past uploads and their status is listed below the
form. **Realistic expectation**: only one issuer parser (HDFC) exists as a
worked example (see "Adding support for a new bank" below) — uploading a
real statement from any other bank will very likely fall through to the
generic parser and may return "No recognizable transaction lines found."
That's expected until you write a parser matching your actual bank's
statement layout, not a bug.

Text-layer extraction + regex only — no LLM, nothing leaves your server.

1. **Upload** (`POST /api/statements/upload`): validates the file is
   actually a PDF via magic bytes (not just the claimed content-type),
   caps size at 10 MB, stores it at `<user_id>/<uuid>.pdf` in the private
   `statements` bucket, and inserts a `statements` row with `status: pending`.
2. **Parse** (`POST /api/statements/:id/parse`): downloads the file
   (RLS/storage-policy scoped to the caller), extracts the text layer with
   `pdf-parse`, and runs it through `lib/statement-parsing/parsers` —
   issuer-specific parsers are tried first (currently: HDFC, as a worked
   example), falling back to a bank-agnostic generic pattern.
3. Extracted transactions are inserted into `transactions`; the raw
   extracted text is **never written to the database or logs** — it only
   exists in memory for the duration of that one request.

### Adding support for a new bank

Copy `lib/statement-parsing/parsers/hdfc.ts` → `<bank>.ts`, adjust:
- `detect()`: a cheap string check for that bank's header/footer text
- the line-matching regex to that bank's actual column layout
- register it in `lib/statement-parsing/parsers/index.ts`

Test regexes against a real (redacted) statement's text layer first —
`pdf-parse` output layout varies more than you'd expect between banks.

### Regex safety

Every parser pattern uses bounded quantifiers (e.g. `{3,45}`, not `.*`) to
avoid catastrophic backtracking (ReDoS) if a malicious or malformed PDF
produces adversarial text. Keep this property when adding new parsers —
avoid nested unbounded wildcards like `(.*)+`.

## Transfer-partner graph + award search

`/dashboard/award-search` is the UI for this — pick a route, cabin, and
ranking strategy (toggle between fewest hops / best value / fastest),
and see which programmes can book it plus the best transfer path from
what you already hold. It reuses the exact same `searchAwardOptions()`
function as `POST /api/award-search` and the concierge's
`search_award_options` tool — one implementation, three surfaces.

**Fixed while building this UI**: path hops previously only carried raw
programme UUIDs, not names — harmless for the JSON API, but unusable for
a human-readable page (and, it turns out, unusable for the concierge too:
the model had been getting UUIDs instead of real programme names this
whole time when reasoning about transfer paths). `searchAwards.ts` now
resolves every hop to a real name before returning.

`POST /api/award-search` with `{ originRegion, destRegion, cabin, strategy }`
returns every programme that can fly that route/cabin (from `award_charts`),
plus every practical way to *get there* from a currency the user actually
holds (from `transfer_partners`), ranked by the chosen `strategy`.

- **`strategy: 'fewest_hops'`** — simplest to execute, least room for a
  transfer to go wrong or a promo to expire mid-transfer.
- **`strategy: 'best_value'`** — fewest source points spent per currency.
- **`strategy: 'fastest'`** — lowest total worst-case transfer time.

Design choices worth knowing about:
- Path discovery (`findPaths.ts`) is capped at 4 hops and is cycle-safe —
  it never revisits a programme within the same path. Ranking (`rankPaths.ts`)
  is a separate, cheap sort applied *after* discovery, so adding a 4th
  ranking strategy later never touches the graph-search code.
- Ratios compound multiplicatively across hops (`totalFactor`); the
  simplification of treating transfers as perfectly divisible (real
  transfers move in fixed batches, e.g. 1000 at a time) is called out
  directly in `findPaths.ts` — worth tightening once you're populating
  real transfer-partner batch sizes.
- "Best value" only makes sense to compare within the same source
  currency — an Amex point and a cashback point aren't fungible, so the
  response groups paths per target programme rather than flattening
  everything into one global ranking.
- `transfer_partners`/`award_charts` are global reference data (RLS
  enabled with an explicit public-read policy as of migration 010 — see
  the "Security notes" section above for why), while balances come from
  the RLS-scoped `point_balances` view, so this route can never see
  another user's holdings.
- Run `supabase/migrations/002_transfer_speed_days.sql` after the main
  schema — it adds the numeric field the "fastest" ranking sorts on.

## Redeem your miles (public award route chart)

`/redeem-miles` — a second public, no-login tool, same design intent as
`/find-a-card`: server-rendered, bookmarkable/crawlable URLs
(`/redeem-miles?from=DEL&country=UK&sort=points`), no client-side fetch.

**Different data shape than the existing award-search feature on
purpose.** `/dashboard/award-search` (private, logged-in) works off
broad regions ("North India" → "UK") because it's answering "which of
150+ programmes can fly this route, using points I actually hold." This
page answers a narrower, more concrete question — "how many points and
taxes does Air India's Maharaja Club actually charge from DEL to LHR" —
which needed real airport-pair granularity and separate onward/return
taxes, not a region-level abstraction. Rather than force that into the
existing `award_charts` table, it has its own table
(`award_route_charts`, migration 013) and its own reference-data file
shape (`data/award-route-charts/*.json`, validated by
`AwardRouteChartFileSchema`) — same ingestion pipeline
(`npm run ingest:reference`), same RLS-enabled-with-public-read-policy
pattern as every other reference table (migration 010's lesson applied
from the start this time, not retrofitted).

**Adding another programme's chart later**: copy
`data/award-route-charts/maharaja-club.json` as a template, add the
programme to `data/programmes.json` if it's new, re-run ingestion. The
page already queries across all programmes in the table — no code change
needed for a second airline's chart to show up.

## Find a card (public, affiliate-driven card search)

`/find-a-card` — deliberately **outside** `/dashboard` and requires no
login, because the target user hasn't signed up yet. This is a genuine
scope addition beyond the ledger: search by spend category + an annual
fee tier (Lifetime Free / Below ₹500 / ₹500-₹1,000 / ₹1,000-₹5,000 /
Above ₹5,000), get the top 5 highest-earning cards for that category
within budget, each with an "Apply Now" affiliate link.

**Why this is architected the way it is:**
- **Server-rendered, not a client fetch.** Results live at a real,
  bookmarkable, shareable URL (`/find-a-card?category=Dining&feeTier=below_500`)
  built from a plain `<form method="get">` — works with JavaScript
  disabled, and is crawlable, which matters directly for the SEO work
  planned later. Retrofitting SEO onto a client-side-fetched page is much
  more painful than building it server-rendered from the start.
- **`card_products` already had a public `SELECT` grant for the `anon`
  role**, not just `authenticated` (see schema.sql section 5) — so this
  page works for a signed-out visitor with zero RLS/grant changes needed,
  only new columns (migration 008: `affiliate_link`, `tagline`,
  `fee_waiver_note`).
- **Only cards with a real `affiliate_link` are ever shown** — the query
  explicitly filters `.not('affiliate_link', 'is', null)`, so a card
  added to the catalog without a real apply link never gets recommended
  by accident.
- **`rel="sponsored"`** on every Apply Now link — the correct way to mark
  affiliate/paid links for search engines, per Google's own guidance.
  Costs nothing to do correctly now versus retrofitting later.
- **A visible affiliate disclosure** is shown alongside results. Worth
  keeping prominent as this grows — affiliate marketing typically expects
  clear disclosure, and depending on your jurisdiction there may be
  specific rules around presenting financial-product comparisons (this
  isn't legal advice — worth a real look before this goes fully public).

**Extending the catalog** uses the same `data/card-products.json` +
`npm run ingest:reference` pipeline as everything else — add
`affiliateLink`/`tagline`/`feeWaiverNote` to a card entry and re-run
ingestion.

## Award-chart & transfer-partner data pipeline

This is the actual moat of the product — and it's fundamentally a
curation problem, not a coding problem. The workflow treats every change
as a reviewable PR, not a direct database edit:

1. **Source of truth lives in git**, as human-readable JSON under `/data`
   (`issuers.json`, `programmes.json`, `card-products.json`,
   `mcc-rules.json`, `transfer-partners/*.json`, `award-charts/*.json`).
   Files reference programmes, issuers, and card products **by name**, not
   by database UUID — a contributor never needs DB access to propose a
   data change.
2. **Every entry carries provenance**: `sourceUrl` and `lastVerified`.
   The schema (`lib/reference-data/schema.ts`) rejects a missing or
   future-dated `lastVerified` — a small guard against copy-paste mistakes.
3. **PRs touching `/data` are auto-validated** by
   `.github/workflows/validate-reference-data.yml` — pure JSON/schema
   validation, no database credentials needed, safe to run even on PRs
   from forks.
4. **A trusted maintainer applies the change** by running the ingestion
   script locally (never from the deployed app, never via any API route):
   ```
   npm run ingest:reference:dry   # validate + preview, no writes
   npm run ingest:reference       # writes, using SUPABASE_SERVICE_ROLE_KEY
   ```
   The script upserts by natural key (issuer/programme name), so re-running
   it is always safe — it updates existing rows rather than duplicating them.
5. **Staleness gets tracked, not ignored.** `npm run check:stale` reports
   every award-chart/transfer-partner row not re-verified in 90+ days.
   `.github/workflows/stale-reference-data.yml` runs this weekly and opens
   a tracking issue when something needs a re-check — because a
   forgotten row isn't a missing feature, it's MileZen confidently
   telling a user a wrong price.

### Where the actual data comes from

This scaffold ships a handful of example entries to demonstrate the
shape — populating real coverage across 150+ programmes means manually
sourcing each bank's/airline's published transfer ratios and award
charts (and periodically re-checking them, since they change). That
research work is inherently manual; the pipeline above just makes it
safe, reviewable, and repeatable once you have the numbers.

### Security notes specific to this pipeline

- The ingestion script is the **only** place `SUPABASE_SERVICE_ROLE_KEY`
  is used outside of `lib/supabase/service.ts` — and only ever run from a
  trusted maintainer's machine or a protected CI job, never from a
  user-facing code path.
- The staleness report uses the **anon key only** (read-only, same access
  any visitor's browser already has) — never store the service-role key
  in a workflow that runs on a schedule/fork-triggered basis.
- If you wire the ingestion script into CI for convenience, restrict that
  job to `workflow_dispatch` (manual trigger) on a protected branch, and
  store `SUPABASE_SERVICE_ROLE_KEY` as a GitHub Actions secret — never a
  repo variable, never committed, never logged.

## AI concierge

`POST /api/concierge` (chat UI at `/dashboard/concierge`) answers questions
like "which card should I swipe for dining" or "how do I fly to the UK on
points" — grounded entirely in the user's own data, fetched fresh per
question, never assumed or memorized by the model.

### How data exposure is minimized

- **The model has no database access.** It can only call five narrow,
  read-only tools (`lib/ai-concierge/tools.ts`): balances, upcoming
  reminders, award search, card recommendation by category, and an
  **aggregated** spending summary. There is no "run a query" tool and
  no raw-statement-text tool.
- **Every tool executes with the caller's own RLS-scoped Supabase client**
  — the same one used everywhere else in the app, never the service-role
  client. A user can structurally never retrieve another user's data
  through the concierge, the same way they can't through any other route.
- **Spending data is aggregated server-side before it reaches the model.**
  `get_recent_spending_summary` returns category totals, not itemized
  merchant/amount line items — the model never sees your raw transaction
  list unless a future tool is deliberately built to expose it.
- **The API used is Groq** (`GROQ_API_KEY`), an OpenAI-compatible
  inference API — chosen specifically because it's genuinely free (no
  expiring trial credits) and, per Groq's own data policy
  (console.groq.com/docs/your-data), customer inference data is **not
  retained by default**, let alone used for training. This was a
  deliberate swap from Anthropic's API partway through this project once
  cost became a factor — verify current terms yourself before relying on
  this, since data-handling policies can change. `lib/ai-concierge/callModel.ts`
  uses the official `openai` SDK pointed at Groq's base URL
  (`https://api.groq.com/openai/v1`) rather than a Groq-specific SDK.
- **Conversation history is short and pruned.** Only the last 6 turns are
  sent per request (bounds both cost and how much ever sits in
  `ai_messages`), and `npm run purge:ai-messages` deletes anything older
  than 30 days — schedule it via Vercel Cron / GitHub Actions cron /
  Supabase `pg_cron`.
- **Users can opt out entirely** via `profiles.ai_context_opt_in` — the
  route checks this before doing anything and refuses to run if it's off.
- **The tool loop is capped** at 5 iterations (`MAX_TOOL_ITERATIONS` in
  `lib/ai-concierge/callModel.ts`) so a confused model can't loop
  indefinitely and run up cost.
- **A basic per-user rate limit** guards against runaway API spend; the
  comment in `app/api/concierge/route.ts` flags upgrading this to a
  shared store (e.g. Upstash Redis) once you have real concurrent traffic.

### Extending it

Add a new tool by: writing its handler in `executeTool()`, adding its
schema to `CONCIERGE_TOOLS`, and (if it touches new data) making sure the
underlying table/view is RLS-scoped exactly like everything else in this
app. Keep new tools aggregated/minimal by default — expose itemized data
only when a feature genuinely requires it, not by default.

## Logging transactions

`/dashboard/transactions` is the **primary** way spending gets into the
ledger — manual entry, not statement parsing. This was a deliberate call:
PDF parsing only recognizes bank formats we've explicitly written a
parser for (currently just one worked example), so it can't be the main
path for a real, multi-bank user base. Statement upload
(`/dashboard/statements`) still exists as an optional convenience for
whichever banks you've written parsers for.

**This is also where a real architectural gap got closed.** Until now,
`transactions` and `point_ledger` were disconnected — nothing ever
automatically wrote an `earn` entry when a transaction happened, so
`point_balances` (which sums `point_ledger`) never actually reflected
card spending. `POST /api/transactions` fixes this: if you provide
`pointsEarned`, it looks up the card's `earn_programme_id` (from
`card_products`) and inserts a matching `point_ledger` row in the same
request, linked via `related_txn_id`. The form itself auto-suggests a
points value from the card's own `mcc_rules` for the chosen category —
editable before saving, never silently overridden.

**Known follow-up, not yet done**: `/api/statements/[id]/parse` still
only inserts into `transactions`, not `point_ledger` — the regex parser
doesn't compute a rewards value from the statement text, so there's
nothing to bridge yet on that path. Worth revisiting if statement parsing
gets more investment later.

### Spend categories

Seven categories now exist consistently everywhere they're referenced:
Dining, Groceries, Travel, Fuel, Online Shopping, Utilities, Entertainment
- `app/find-a-card/page.tsx` (public search dropdown)
- `app/dashboard/transactions/NewTransactionForm.tsx` (manual entry dropdown)
- `lib/ai-concierge/tools.ts` (the concierge's `CATEGORY_SYNONYMS` table and
  `get_card_recommendation` tool description)
- `data/mcc-rules.json` (47 entries across all 7 seeded card products)

Adding an 8th category later means updating all four of these — there's no
single source of truth for the category list, since it's used in genuinely
different contexts (a public marketing dropdown vs. an LLM tool schema).
Worth extracting into a shared constant if this keeps growing.

### Click/search tracking (migration 009)

`/find-a-card` logs two event types into `card_search_events`, a
write-only table (RLS allows INSERT from anyone, no SELECT policy at all
— only a future service-role analytics script can read it back):
- **`search`**: logged server-side whenever a category search runs
- **`apply_click`**: logged by `/api/apply/:cardId`, a redirect wrapper
  that every "Apply Now" link points to instead of the affiliate URL
  directly. This is the standard affiliate-tracking pattern — a
  server-side redirect logs reliably even with JS disabled or an ad
  blocker active, unlike a client-side `onClick` handler racing against
  navigation to a new tab.

Nothing here is tied to a `user_id` — `/find-a-card` is fully public and
unauthenticated by design, so there's no user to attribute events to, and
this deliberately doesn't try to fingerprint anonymous visitors either.

### Visual design

`/find-a-card` uses a ledger/passbook-inspired design system (deep ink
navy on ledger-paper, emerald accent, a rotated brass "Top Pick" stamp on
the #1 result, tabular-mono numerals for fee/reward columns) rather than
a generic pricing-card grid — see `find-a-card.module.css`. Fonts
(Fraunces, IBM Plex Sans, IBM Plex Mono) load via a plain `<link>` tag
rather than `next/font/google`, deliberately — `next/font` fetches font
files at *build* time, which failed in the sandbox environment this was
built in (no network access to fonts.googleapis.com) but will work fine
on Vercel; the `<link>` approach fetches in the visitor's browser instead,
functionally equivalent and easier to verify locally in restricted
environments.

## Privacy Policy & Terms of Service

`/privacy` and `/terms` — public, static pages, linked from the
homepage footer, the login page ("by signing in you agree to..."), and
`/find-a-card`'s affiliate disclosure. Written directly from what the
codebase actually does (RLS isolation, which sub-processors get what
data, the 30-day AI chat retention, the affiliate disclosure, a "not
financial advice" disclaimer given the concierge makes card
recommendations) — not generic boilerplate.

**Both pages carry a visible notice that this is a good-faith draft, not
legal advice**, and have three placeholders that must be filled in
before this is genuinely publishable: the effective date, a real contact
email, and (in Terms, section 10) the actual governing-law jurisdiction.
Get a lawyer to review both before relying on them with real users,
especially once real affiliate partnerships are in place — this is
exactly the kind of area where "looks right" and "is actually compliant"
can diverge, particularly around India's DPDP Act and ASCI's affiliate
disclosure norms.

**One honest product gap this surfaced**: the Privacy Policy currently
describes account/data deletion as a manual, email-based process — because
that's the truth; there's no self-service "delete my account" button
built yet. Worth treating as a real follow-up if this goes live for real
users, not just a documentation nicety.

## Dashboard design system

Every `/dashboard/**` page now shares one design system —
`app/dashboard/dashboard.module.css` — imported the same way from every
page: `import styles from '../dashboard.module.css'` (adjust relative
depth per folder). Same visual language as `/find-a-card` (ledger paper,
ink navy, emerald accent, Fraunces/IBM Plex fonts), but adapted for a
functional logged-in interior rather than a marketing page — denser,
fewer flourishes, no stamp motif (that's specific to `find-a-card`'s
ranked-recommendation context). Fonts load once via `<link>` tags in
`app/dashboard/layout.tsx`, which also now has a persistent nav bar
linking every dashboard page plus the Log out button.

**One CSS Modules gotcha worth knowing if you extend this**: a bare
`:root { }` selector is rejected by Next.js's CSS Modules processor
("Selector `:root` is not pure") — custom properties must be scoped to
an actual class (here, `.shell`, which every dashboard page is wrapped
in via the layout) rather than the document root. Hit this once while
building this system; if a future style edit reintroduces a bare
`:root`, this is why the build will fail.

## Adding a card

`/dashboard/cards/new` — a card is a user's own instance
(`user_cards`, RLS-scoped) of a global `card_products` catalog entry
(reference data, seeded via the same ingestion pipeline as issuers and
programmes — see `data/card-products.json`). Setting an annual fee date
here automatically creates its reminder via the trigger described above;
no extra code path needed. `POST /api/user-cards` validates the
`card_product_id` is real and `last4` is exactly 4 digits before inserting.

## Reminders & cron

Card annual fees and point-expiry/custom reminders, kept fresh by a daily
scheduled job — designed around Vercel Hobby's free-tier constraint of
**at most once-per-day** cron invocations.

### How annual-fee reminders stay in sync automatically

`user_cards.annual_fee_date` is the single source of truth. A Postgres
trigger (`sync_annual_fee_reminder()` in migration 004) keeps a matching
`reminders` row updated any time that date is set or changed — so:
- Adding/editing a card automatically creates or updates its fee reminder;
  no app code has to remember to also touch the `reminders` table.
- There's a DB-level unique constraint (one `annual_fee` reminder per
  card), so this can never drift into duplicates.
- The daily cron job only ever needs to update `user_cards.annual_fee_date`
  forward by a year once it's past due — the trigger handles the rest,
  including resetting `notified_at` so the new cycle gets a fresh email.

Point-expiry and custom reminders are created directly by the user via
`POST /api/reminders` (RLS-scoped, ordinary user request) — there's no
generic "when do this programme's points expire" rule engine, since expiry
policies vary too much per programme to model reliably; the user sets these.

### What the daily cron job does (`GET /api/cron/reminders`)

1. **Rolls forward** any annual-fee reminder that's now in the past.
2. **Sends a notification email** for anything due within 7 days that
   hasn't been notified yet (`notified_at IS NULL`).
3. **Auto-dismisses** stale one-off reminders (point_expiry/custom) that
   went 14+ days past due unacknowledged — keeps the list from
   accumulating dead entries. Annual-fee reminders are exempt since they
   auto-renew via the trigger instead.

### Security

- Protected by `CRON_SECRET` — Vercel automatically sends this as
  `Authorization: Bearer <CRON_SECRET>` on scheduled invocations once the
  env var is set in your Vercel project; the route rejects anything else.
  **Set the same value in both `.env.local` (for local testing) and your
  Vercel project's environment variables.**
- This route is the **one legitimate place** in the app that uses the
  service-role client for a request handler (not just a maintainer
  script) — it must read and act across every user's reminders, which
  RLS correctly forbids a normal session from doing. Every other route in
  this app should keep using the RLS-scoped client.
- Email-send failures are logged server-side only, without leaking
  provider error bodies (which can include recipient details) into any
  response.
- `vercel.json` schedules this once daily (`0 8 * * *`, 08:00 UTC) — the
  max frequency Hobby tier supports. If you upgrade to Pro later and want
  same-day granularity, you can safely increase frequency; the notify
  logic is idempotent (`notified_at` gating) either way.

## Project structure

```
app/
  page.tsx                 landing page — auth-aware, links to /find-a-card and /dashboard
  find-a-card/page.tsx      PUBLIC card search + affiliate Apply Now links, no auth required
  find-a-card/find-a-card.module.css  ledger/passbook-inspired styling
  api/apply/[cardId]/route.ts  logs apply_click, then redirects to the real affiliate link
  login/page.tsx           passwordless (magic link) sign-in
  api/auth/callback/route.ts   exchanges magic-link code for session cookie
  dashboard/page.tsx        protected page, RLS-safe data fetch example
  api/statements/upload/route.ts        validated PDF upload
  api/statements/[id]/parse/route.ts    text extraction + regex parsing + ledger insert
lib/supabase/
  client.ts                browser client (anon key, RLS applies)
  server.ts                server client for Server Components (anon key, RLS applies)
  service.ts                service-role client — DANGER ZONE, server-only, bypasses RLS
lib/statement-parsing/
  types.ts                 shared ParsedTransaction / ParseResult / StatementParser types
  extractText.ts           pdf-parse wrapper with size/page limits
  parsers/generic.ts       bank-agnostic fallback regex parser
  parsers/hdfc.ts          worked example of an issuer-specific parser
  parsers/index.ts         registry — tries issuer parsers first, then generic
app/dashboard/award-search/     award search page: route/cabin/strategy form + results
  api/award-search/route.ts             award chart lookup + ranked transfer paths
lib/transfer-graph/
  types.ts                 GraphEdge / TransferPath / RankStrategy types
  buildGraph.ts             loads transfer_partners, builds adjacency list
  findPaths.ts              depth-bounded, cycle-safe DFS path discovery
  rankPaths.ts               sort-only ranking by fewest_hops / best_value / fastest
lib/award-engine/searchAwards.ts  shared award-search core, used by API route AND concierge tool
lib/ai-concierge/
  tools.ts                  tool schemas + RLS-scoped executors (the model's only data access)
  systemPrompt.ts            grounding + guardrail instructions
  callModel.ts               tool-use loop against Groq (OpenAI-compatible API), iteration-capped
app/api/concierge/route.ts  auth, opt-in check, rate limit, persists distilled exchange only
app/api/reminders/route.ts            list/create point_expiry+custom reminders (RLS-scoped)
app/api/reminders/[id]/route.ts        dismiss/delete a reminder (RLS-scoped)
app/api/cron/reminders/route.ts        daily job: roll forward fees, notify, auto-dismiss (service role, CRON_SECRET-protected)
app/dashboard/concierge/page.tsx  minimal chat UI
lib/email/sendReminderEmail.ts    Resend HTTP call for reminder notifications
scripts/purge-ai-messages.ts  deletes ai_messages older than 30 days (service role, cron-run)
vercel.json                  daily cron schedule for /api/cron/reminders
middleware.ts               session refresh + route protection
types/database.ts           generated Supabase types (placeholder for now)
supabase/schema.sql          full DB schema + RLS policies
supabase/storage_policies.sql  storage bucket RLS (per-user folder isolation)
supabase/migrations/          incremental schema changes, apply in order
data/
  issuers.json, programmes.json, card-products.json, mcc-rules.json  reference data by natural key (name)
  transfer-partners/*.json               one file per source programme
  award-charts/*.json                    one file per target programme
app/api/user-cards/route.ts   creates a user_card (RLS-scoped) — triggers the annual-fee reminder automatically
app/dashboard/cards/new/       add-card page + form
app/api/transactions/route.ts   creates a transaction + matching point_ledger 'earn' entry (RLS-scoped)
app/dashboard/transactions/     manual entry form (with auto-suggested points) + recent history
app/dashboard/statements/       statements page: upload form + history list
lib/reference-data/schema.ts  zod validation for every /data file shape
scripts/
  ingest-reference-data.ts    validates + upserts /data into Postgres (service role, maintainer-run only)
  check-stale-reference-data.ts  reports rows not re-verified in 90+ days (anon key, read-only)
.github/workflows/
  validate-reference-data.yml  validates /data on every PR (no secrets needed)
  stale-reference-data.yml     weekly staleness report -> auto-opened issue
```
