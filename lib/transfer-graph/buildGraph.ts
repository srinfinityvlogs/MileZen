import { createClient } from '@/lib/supabase/server';
import type { GraphEdge } from './types';

// transfer_partners is global reference data (no RLS, public read — see
// schema.sql section 5) so this is safe to fetch with the normal
// request-scoped client; no service-role needed here.
//
// This is read fresh per request for correctness while the dataset is
// small. Once you have hundreds of programmes, wrap this in Next.js's
// `unstable_cache` or a short-TTL in-memory cache — the data changes on
// the order of days/weeks (bank T&Cs updates), never per-request.
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
