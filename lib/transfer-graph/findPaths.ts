import type { GraphEdge, PathHop, TransferPath } from './types';

const MAX_HOPS = 4;

export function findPaths(
  adjacency: Map<string, GraphEdge[]>,
  sourceProgrammeIds: string[],
  targetProgrammeId: string
): TransferPath[] {
  const results: TransferPath[] = [];

  for (const sourceId of sourceProgrammeIds) {
    if (sourceId === targetProgrammeId) {
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
    if (visited.has(edge.toProgrammeId)) continue;

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
  const totalFactor = hops.reduce((factor, hop) => factor * (hop.ratioTo / hop.ratioFrom), 1);
  const totalMaxDays = hops.reduce((sum, hop) => sum + hop.transferTimeMaxDays, 0);

  return {
    hops,
    sourceProgrammeId: sourceId,
    targetProgrammeId: targetId,
    hopCount: hops.length,
    totalFactor,
    totalMaxDays,
    sourcePointsNeeded: (targetPointsRequired: number) => Math.ceil(targetPointsRequired / totalFactor),
  };
}
