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
  // Which currencies to treat as possible starting points — explicitly
  // supplied by the caller (checkboxes on a public form, or a value the
  // concierge extracts from conversation), never looked up from any
  // stored account. If omitted/empty, every programme in the catalog is
  // treated as a potential source, so the tool still returns something
  // useful for a visitor who hasn't told us what they hold yet.
  heldProgrammeIds?: string[];
}

export interface AwardSearchOption {
  programmeId: string;
  programmeName: string;
  pointsCost: number;
  paths: Array<{
    sourceProgrammeId: string;
    sourceProgrammeName: string;
    hopCount: number;
    totalMaxDays: number;
    sourcePointsNeeded: number;
    hops: Array<{
      toProgrammeId: string;
      toProgrammeName: string;
      ratioFrom: number;
      ratioTo: number;
      transferTimeLabel: string;
    }>;
  }>;
}

// `supabase` just needs read access to public reference data — no
// signed-in session involved anywhere in this app anymore.
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

  const { data: allProgrammes } = await supabase.from('programmes').select('id, name');
  const programmeNameById = new Map((allProgrammes ?? []).map((p) => [p.id, p.name]));

  const heldProgrammeIds =
    input.heldProgrammeIds && input.heldProgrammeIds.length > 0
      ? input.heldProgrammeIds
      : (allProgrammes ?? []).map((p) => p.id);

  const edges = await loadTransferGraph();
  const adjacency = buildAdjacency(edges);

  const options: AwardSearchOption[] = chartRows.map((chart) => {
    const paths = findPaths(adjacency, heldProgrammeIds, chart.programme_id);
    const ranked = rankPaths(paths, rankStrategy, chart.points_cost);

    return {
      programmeId: chart.programme_id,
      programmeName: (chart as any).programmes?.name ?? 'Unknown programme',
      pointsCost: chart.points_cost,
      paths: ranked.slice(0, 5).map((p) => ({
        sourceProgrammeId: p.sourceProgrammeId,
        sourceProgrammeName: programmeNameById.get(p.sourceProgrammeId) ?? 'Unknown programme',
        hopCount: p.hopCount,
        totalMaxDays: p.totalMaxDays,
        sourcePointsNeeded: p.sourcePointsNeeded(chart.points_cost),
        hops: p.hops.map((h) => ({
          toProgrammeId: h.toProgrammeId,
          toProgrammeName: programmeNameById.get(h.toProgrammeId) ?? 'Unknown programme',
          ratioFrom: h.ratioFrom,
          ratioTo: h.ratioTo,
          transferTimeLabel: h.transferTimeLabel,
        })),
      })),
    };
  });

  return { strategy: rankStrategy, options };
}
