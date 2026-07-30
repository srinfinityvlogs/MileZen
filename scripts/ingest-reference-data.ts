/**
 * MileZen reference-data ingestion script.
 *
 * Run by a trusted maintainer only — never by the deployed app, never
 * exposed via any API route. Uses the SERVICE ROLE key, which bypasses
 * RLS entirely, because these are the global reference tables that
 * ordinary users (and the anon/authenticated roles) have no write access
 * to at all (see schema.sql section 5).
 *
 * Usage:
 *   npm run ingest:reference:dry     # validate + show what WOULD change, no writes
 *   npm run ingest:reference -- --yes  # actually write to the database
 *
 * Source of truth is the human-edited JSON under /data — this script is
 * intentionally "dumb": it doesn't invent or guess data, it just validates
 * shape and upserts by natural key (name), never overwriting IDs.
 */
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  IssuersFileSchema,
  ProgrammesFileSchema,
  CardProductsFileSchema,
  MccRulesFileSchema,
  TransferPartnerFileSchema,
  AwardChartFileSchema,
  AwardRouteChartFileSchema,
} from '../lib/reference-data/schema';

const DATA_DIR = path.join(__dirname, '..', 'data');
const isDryRun = process.argv.includes('--dry-run') || !process.argv.includes('--yes');

function readJson(filePath: string) {
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

function fail(message: string): never {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

async function main() {
  console.log(isDryRun ? 'Mode: DRY RUN (no writes, no DB credentials needed)\n' : '⚠️  Mode: LIVE — will write to the database\n');

  // --- 1. Validate everything before writing anything ------------------
  // This step needs zero Supabase credentials — pure JSON/schema
  // validation — which is what lets the CI workflow run it on every PR
  // (including from forks) without any secrets exposure risk.
  const issuersRaw = readJson(path.join(DATA_DIR, 'issuers.json'));
  const issuers = IssuersFileSchema.parse(issuersRaw);

  const programmesRaw = readJson(path.join(DATA_DIR, 'programmes.json'));
  const programmes = ProgrammesFileSchema.parse(programmesRaw);

  const cardProductsRaw = readJson(path.join(DATA_DIR, 'card-products.json'));
  const cardProducts = CardProductsFileSchema.parse(cardProductsRaw);

  const mccRulesRaw = readJson(path.join(DATA_DIR, 'mcc-rules.json'));
  const mccRules = MccRulesFileSchema.parse(mccRulesRaw);

  const transferFiles = readdirSync(path.join(DATA_DIR, 'transfer-partners')).filter((f) => f.endsWith('.json'));
  const transferPartnerFiles = transferFiles.map((f) =>
    TransferPartnerFileSchema.parse(readJson(path.join(DATA_DIR, 'transfer-partners', f)))
  );

  const chartFiles = readdirSync(path.join(DATA_DIR, 'award-charts')).filter((f) => f.endsWith('.json'));
  const awardChartFiles = chartFiles.map((f) =>
    AwardChartFileSchema.parse(readJson(path.join(DATA_DIR, 'award-charts', f)))
  );

  const routeChartFiles = readdirSync(path.join(DATA_DIR, 'award-route-charts')).filter((f) => f.endsWith('.json'));
  const awardRouteChartFiles = routeChartFiles.map((f) =>
    AwardRouteChartFileSchema.parse(readJson(path.join(DATA_DIR, 'award-route-charts', f)))
  );

  console.log(
    `Validated: ${issuers.length} issuers, ${programmes.length} programmes, ` +
      `${cardProducts.length} card products, ${mccRules.length} MCC rules, ` +
      `${transferPartnerFiles.reduce((n, f) => n + f.edges.length, 0)} transfer edges, ` +
      `${awardChartFiles.reduce((n, f) => n + f.entries.length, 0)} award-chart entries, ` +
      `${awardRouteChartFiles.reduce((n, f) => n + f.routes.length, 0)} award-route entries.\n`
  );

  if (isDryRun) {
    console.log('✅ Dry run complete — all files valid. Re-run with `--yes` to write.');
    return;
  }

  // Only a LIVE run needs real database credentials.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    fail('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.');
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  console.log(`Target database: ${supabaseUrl}`);
  const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  // --- 2. Upsert issuers, build name -> id map --------------------------
  const issuerIdByName = new Map<string, string>();
  for (const issuer of issuers) {
    const { data, error } = await supabase
      .from('issuers')
      .upsert({ name: issuer.name, country: issuer.country }, { onConflict: 'name' })
      .select('id, name')
      .single();
    if (error) fail(`Upserting issuer "${issuer.name}": ${error.message}`);
    issuerIdByName.set(data.name, data.id);
  }
  console.log(`✅ Upserted ${issuers.length} issuers`);

  // --- 3. Upsert programmes, build name -> id map -----------------------
  const programmeIdByName = new Map<string, string>();
  for (const prog of programmes) {
    const issuerId = prog.issuerName ? issuerIdByName.get(prog.issuerName) : null;
    if (prog.issuerName && !issuerId) {
      fail(`Programme "${prog.name}" references unknown issuer "${prog.issuerName}"`);
    }
    const { data, error } = await supabase
      .from('programmes')
      .upsert({ name: prog.name, type: prog.type, issuer_id: issuerId }, { onConflict: 'name' })
      .select('id, name')
      .single();
    if (error) fail(`Upserting programme "${prog.name}": ${error.message}`);
    programmeIdByName.set(data.name, data.id);
  }
  console.log(`✅ Upserted ${programmes.length} programmes`);

  // --- 3b. Upsert card_products, build (issuer::name) -> id map ---------
  let cardProductCount = 0;
  const cardProductIdByKey = new Map<string, string>();
  for (const cp of cardProducts) {
    const issuerId = issuerIdByName.get(cp.issuerName);
    if (!issuerId) fail(`Card product "${cp.name}" references unknown issuer "${cp.issuerName}"`);
    const earnProgrammeId = programmeIdByName.get(cp.earnProgrammeName);
    if (!earnProgrammeId) fail(`Card product "${cp.name}" references unknown programme "${cp.earnProgrammeName}"`);

    const { data, error } = await supabase
      .from('card_products')
      .upsert(
        {
          issuer_id: issuerId,
          name: cp.name,
          network: cp.network ?? null,
          annual_fee: cp.annualFee,
          currency: cp.currency,
          earn_programme_id: earnProgrammeId,
          affiliate_link: cp.affiliateLink ?? null,
          tagline: cp.tagline ?? null,
          fee_waiver_note: cp.feeWaiverNote ?? null,
        },
        { onConflict: 'issuer_id,name' }
      )
      .select('id')
      .single();
    if (error) fail(`Upserting card product "${cp.name}": ${error.message}`);
    cardProductIdByKey.set(`${cp.issuerName}::${cp.name}`, data.id);
    cardProductCount++;
  }
  console.log(`✅ Upserted ${cardProductCount} card products`);

  // --- 3c. Upsert mcc_rules ------------------------------------------
  let mccRuleCount = 0;
  for (const rule of mccRules) {
    const cardProductId = cardProductIdByKey.get(`${rule.issuerName}::${rule.cardName}`);
    if (!cardProductId) {
      fail(`MCC rule references unknown card product "${rule.issuerName} ${rule.cardName}"`);
    }

    const { error } = await supabase.from('mcc_rules').upsert(
      {
        card_product_id: cardProductId,
        mcc_code: rule.mccCode,
        mcc_label: rule.mccLabel,
        reward_rate: rule.rewardRate,
        reward_type: rule.rewardType,
      },
      { onConflict: 'card_product_id,mcc_code' }
    );
    if (error) fail(`Upserting MCC rule ${rule.cardName} ${rule.mccLabel}: ${error.message}`);
    mccRuleCount++;
  }
  console.log(`✅ Upserted ${mccRuleCount} MCC rules`);

  // --- 4. Upsert transfer_partners edges ---------------------------------
  let edgeCount = 0;
  for (const file of transferPartnerFiles) {
    const fromId = programmeIdByName.get(file.fromProgrammeName);
    if (!fromId) fail(`Transfer file references unknown programme "${file.fromProgrammeName}"`);

    for (const edge of file.edges) {
      const toId = programmeIdByName.get(edge.toProgrammeName);
      if (!toId) fail(`Transfer edge references unknown programme "${edge.toProgrammeName}"`);

      const { error } = await supabase.from('transfer_partners').upsert(
        {
          from_programme_id: fromId,
          to_programme_id: toId,
          ratio_from: edge.ratioFrom,
          ratio_to: edge.ratioTo,
          transfer_time: edge.transferTimeLabel,
          transfer_time_max_days: edge.transferTimeMaxDays,
          min_transfer: edge.minTransfer ?? null,
          source_url: edge.sourceUrl,
          last_verified: edge.lastVerified,
          is_active: true,
        },
        { onConflict: 'from_programme_id,to_programme_id' }
      );
      if (error) fail(`Upserting transfer edge ${file.fromProgrammeName} -> ${edge.toProgrammeName}: ${error.message}`);
      edgeCount++;
    }
  }
  console.log(`✅ Upserted ${edgeCount} transfer-partner edges`);

  // --- 5. Upsert award_charts entries ------------------------------------
  let chartCount = 0;
  for (const file of awardChartFiles) {
    const programmeId = programmeIdByName.get(file.programmeName);
    if (!programmeId) fail(`Award chart file references unknown programme "${file.programmeName}"`);

    for (const entry of file.entries) {
      const { error } = await supabase.from('award_charts').upsert(
        {
          programme_id: programmeId,
          origin_region: entry.originRegion,
          dest_region: entry.destRegion,
          cabin: entry.cabin,
          points_cost: entry.pointsCost,
          source_note: entry.sourceNote,
          source_url: entry.sourceUrl,
          last_verified: entry.lastVerified,
        },
        { onConflict: 'programme_id,origin_region,dest_region,cabin' }
      );
      if (error) fail(`Upserting award chart ${file.programmeName} ${entry.originRegion}->${entry.destRegion}: ${error.message}`);
      chartCount++;
    }
  }
  console.log(`✅ Upserted ${chartCount} award-chart entries`);

  // --- 6. Upsert award_route_charts entries ------------------------------
  let routeChartCount = 0;
  for (const file of awardRouteChartFiles) {
    const programmeId = programmeIdByName.get(file.programmeName);
    if (!programmeId) fail(`Award route chart file references unknown programme "${file.programmeName}"`);

    for (const route of file.routes) {
      const { error } = await supabase.from('award_route_charts').upsert(
        {
          programme_id: programmeId,
          from_airport: route.fromAirport,
          to_airport: route.toAirport,
          city: route.city,
          country: route.country,
          cabin: route.cabin,
          points_onward: route.pointsOnward,
          taxes_onward: route.taxesOnward,
          points_return: route.pointsReturn,
          taxes_return: route.taxesReturn,
          source_note: file.sourceNote,
          source_url: file.sourceUrl ?? null,
          last_verified: file.lastVerified,
        },
        { onConflict: 'programme_id,from_airport,to_airport,cabin' }
      );
      if (error) {
        fail(`Upserting award route ${file.programmeName} ${route.fromAirport}->${route.toAirport}: ${error.message}`);
      }
      routeChartCount++;
    }
  }
  console.log(`✅ Upserted ${routeChartCount} award-route entries`);

  console.log('\n✅ Ingestion complete.');
}

main().catch((err) => fail(err.message ?? String(err)));
