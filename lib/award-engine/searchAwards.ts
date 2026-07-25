import type { SupabaseClient } from '@supabase/supabase-js';
import { loadTransferGraph, buildAdjacency } from '@/lib/transfer-graph/buildGraph';
import { findPaths } from '@/lib/transfer-graph/findPaths';
import { rankPaths } from '@/lib/transfer-graph/rankPaths';
import type { RankStrategy } from '@/lib/transfer-graph/types';

export const VALID_STRATEGIES: RankStrategy[] = ['fewest_hops', 'best_value', 'fastest'];

export interface AwardSearchInput {
  originRegion: string;
  destRegion: string;
  cabin: string;
  strategy?: RankStrategy;
}

export interface AwardSearchOption {
  programmeId: string;
  programmeName: string;
  pointsCost: number;
  alreadyBookable: boolean;
  paths: Array<{
    sourceProgrammeId: string;
    hopCount: number;
    totalMaxDays: number;
    sourcePointsNeeded: number;
    hops: Array<{
      toProgrammeId: string;
      ratioFrom: number;
      ratioTo: number;
      transferTimeLabel: string;
    }>;
  }>;
}

// IMPORTANT: `supabase` must always be the caller's own RLS-scoped client
// (from lib/supabase/server.ts), never the service-role client — this
// function reads the caller's point_balances, and must never be reachable
// with another user's session or with elevated privileges.
export async function searchAwardOptions(
  supabase: SupabaseClient,
  input: AwardSearchInput
): Promise<{ strategy: RankStrategy; options: AwardSearchOption[] } | { error: string }> {
  const rankStrategy: RankStrategy = VALID_STRATEGIES.includes(input.strategy as RankStrategy)
    ? (input.strategy as RankStrategy)
    : 'best_value';

  const { data: chartRows, error: chartError } = await supabase
    .from('award_charts')
    .select('programme_id, points_cost, programmes(name)')
    .eq('origin_region', input.originRegion)
    .eq('dest_region', input.destRegion)
    .eq('cabin', input.cabin);

  if (chartError) return { error: 'Failed to look up award charts' };
  if (!chartRows || chartRows.length === 0) return { strategy: rankStrategy, options: [] };

  const { data: balances, error: balanceError } = await supabase
    .from('point_balances')
    .select('programme_id, balance');

  if (balanceError) return { error: 'Failed to load balances' };

  const heldProgrammeIds = (balances ?? [])
    .filter((b) => (b.balance ?? 0) > 0)
    .map((b) => b.programme_id);

  const edges = await loadTransferGraph();
  const adjacency = buildAdjacency(edges);

  const options: AwardSearchOption[] = chartRows.map((chart) => {
    const paths = findPaths(adjacency, heldProgrammeIds, chart.programme_id);
    const ranked = rankPaths(paths, rankStrategy, chart.points_cost);
    const balanceRow = balances?.find((b) => b.programme_id === chart.programme_id);

    return {
      programmeId: chart.programme_id,
      programmeName: (chart as any).programmes?.name ?? 'Unknown programme',
      pointsCost: chart.points_cost,
      alreadyBookable: (balanceRow?.balance ?? 0) >= chart.points_cost,
      paths: ranked.slice(0, 5).map((p) => ({
        sourceProgrammeId: p.sourceProgrammeId,
        hopCount: p.hopCount,
        totalMaxDays: p.totalMaxDays,
        sourcePointsNeeded: p.sourcePointsNeeded(chart.points_cost),
        hops: p.hops.map((h) => ({
          toProgrammeId: h.toProgrammeId,
          ratioFrom: h.ratioFrom,
          ratioTo: h.ratioTo,
          transferTimeLabel: h.transferTimeLabel,
        })),
      })),
    };
  });

  return { strategy: rankStrategy, options };
}
