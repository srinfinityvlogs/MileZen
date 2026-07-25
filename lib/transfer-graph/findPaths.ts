import type { GraphEdge, PathHop, TransferPath } from './types';

const MAX_HOPS = 4; // beyond ~4 hops, real-world transfer paths stop being
                     // practical (fees, time, minimums compound) — also
                     // keeps this DFS from blowing up on a dense graph

// Finds every practical path from any of `sourceProgrammeIds` (the
// currencies the user actually holds) to `targetProgrammeId`, up to
// MAX_HOPS transfers. Cycle-safe: a programme already visited in the
// current path is never revisited.
export function findPaths(
  adjacency: Map<string, GraphEdge[]>,
  sourceProgrammeIds: string[],
  targetProgrammeId: string
): TransferPath[] {
  const results: TransferPath[] = [];

  for (const sourceId of sourceProgrammeIds) {
    if (sourceId === targetProgrammeId) {
      // User already holds the target currency directly — zero-hop "path".
      results.push(makePath(sourceId, targetProgrammeId, []));
      continue;
    }
    dfs(sourceId, targetProgrammeId, adjacency, [], new Set([sourceId]), results, sourceId);
  }

  return results;
}

function dfs(
  currentId: string,
  targetId: string,
  adjacency: Map<string, GraphEdge[]>,
  hopsSoFar: PathHop[],
  visited: Set<string>,
  results: TransferPath[],
  originalSourceId: string
) {
  if (hopsSoFar.length >= MAX_HOPS) return;

  const edges = adjacency.get(currentId) ?? [];
  for (const edge of edges) {
    if (visited.has(edge.toProgrammeId)) continue; // cycle guard

    const hop: PathHop = {
      fromProgrammeId: edge.fromProgrammeId,
      toProgrammeId: edge.toProgrammeId,
      ratioFrom: edge.ratioFrom,
      ratioTo: edge.ratioTo,
      transferTimeLabel: edge.transferTimeLabel,
      transferTimeMaxDays: edge.transferTimeMaxDays,
    };
    const newHops = [...hopsSoFar, hop];

    if (edge.toProgrammeId === targetId) {
      results.push(makePath(originalSourceId, targetId, newHops));
    }

    visited.add(edge.toProgrammeId);
    dfs(edge.toProgrammeId, targetId, adjacency, newHops, visited, results, originalSourceId);
    visited.delete(edge.toProgrammeId);
  }
}

function makePath(sourceId: string, targetId: string, hops: PathHop[]): TransferPath {
  // Ratios compound multiplicatively: each hop turns `ratioFrom` units of
  // the source into `ratioTo` units of the destination currency.
  const totalFactor = hops.reduce((factor, hop) => factor * (hop.ratioTo / hop.ratioFrom), 1);
  const totalMaxDays = hops.reduce((sum, hop) => sum + hop.transferTimeMaxDays, 0);

  return {
    hops,
    sourceProgrammeId: sourceId,
    targetProgrammeId: targetId,
    hopCount: hops.length,
    totalFactor,
    totalMaxDays,
    // Simplification note: this treats transfers as perfectly divisible.
    // Real transfers move in fixed batches (e.g. 1000 at a time) and may
    // have minimums — round up to the nearest whole batch before showing
    // a final number to the user; left as a follow-up refinement once
    // real transfer-partner data (with batch sizes) is populated.
    sourcePointsNeeded: (targetPointsRequired: number) =>
      Math.ceil(targetPointsRequired / totalFactor),
  };
}
