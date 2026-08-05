import type { RankStrategy, TransferPath } from './types';

export function rankPaths(
  paths: TransferPath[],
  strategy: RankStrategy,
  targetPointsRequired: number
): TransferPath[] {
  const copy = [...paths];

  switch (strategy) {
    case 'fewest_hops':
      return copy.sort((a, b) => a.hopCount - b.hopCount || compareValue(a, b, targetPointsRequired));
    case 'fastest':
      return copy.sort((a, b) => a.totalMaxDays - b.totalMaxDays || compareValue(a, b, targetPointsRequired));
    case 'best_value':
    default:
      return copy.sort((a, b) => compareValue(a, b, targetPointsRequired) || a.hopCount - b.hopCount);
  }
}

function compareValue(a: TransferPath, b: TransferPath, targetPointsRequired: number): number {
  return a.sourcePointsNeeded(targetPointsRequired) - b.sourcePointsNeeded(targetPointsRequired);
}
