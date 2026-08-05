import { createClient } from '@/lib/supabase/server';
import type { GraphEdge } from './types';

export async function loadTransferGraph(): Promise<GraphEdge[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('transfer_partners')
    .select('from_programme_id, to_programme_id, ratio_from, ratio_to, transfer_time, transfer_time_max_days, min_transfer')
    .eq('is_active', true);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    fromProgrammeId: row.from_programme_id,
    toProgrammeId: row.to_programme_id,
    ratioFrom: row.ratio_from,
    ratioTo: row.ratio_to,
    transferTimeLabel: row.transfer_time ?? '',
    transferTimeMaxDays: row.transfer_time_max_days ?? 0,
    minTransfer: row.min_transfer,
  }));
}

export function buildAdjacency(edges: GraphEdge[]): Map<string, GraphEdge[]> {
  const adjacency = new Map<string, GraphEdge[]>();
  for (const edge of edges) {
    const list = adjacency.get(edge.fromProgrammeId) ?? [];
    list.push(edge);
    adjacency.set(edge.fromProgrammeId, list);
  }
  return adjacency;
}
