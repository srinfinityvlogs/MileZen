import type { RankStrategy, TransferPath } from './types';

// This is deliberately just a sort function applied AFTER path discovery —
// findPaths() doesn't know or care about ranking, so adding a new strategy
// later never requires re-running the (more expensive) graph search.
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

// "Best value" = fewest source points spent to reach the required target
// points. Since different source currencies aren't directly comparable
// (an Amex point isn't "worth" the same as a bank cashback point), this
// ranks paths that share the same source currency against each other
// first and foremost — the caller should group by sourceProgrammeId
// before treating this as a global ranking across different currencies.
function compareValue(a: TransferPath, b: TransferPath, targetPointsRequired: number): number {
  return a.sourcePointsNeeded(targetPointsRequired) - b.sourcePointsNeeded(targetPointsRequired);
}
