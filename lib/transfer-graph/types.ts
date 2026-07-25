export interface GraphEdge {
  fromProgrammeId: string;
  toProgrammeId: string;
  ratioFrom: number;
  ratioTo: number;
  transferTimeLabel: string;   // 'instant', '~1 day', '≤6 wks' — display only
  transferTimeMaxDays: number; // used for sorting/ranking
  minTransfer: number | null;
}

export interface PathHop {
  fromProgrammeId: string;
  toProgrammeId: string;
  ratioFrom: number;
  ratioTo: number;
  transferTimeLabel: string;
  transferTimeMaxDays: number;
}

export interface TransferPath {
  hops: PathHop[];                 // empty array = user already holds the target currency directly
  sourceProgrammeId: string;
  targetProgrammeId: string;
  hopCount: number;
  totalFactor: number;             // target points produced per 1 source point, compounded across hops
  totalMaxDays: number;            // sum of worst-case days across hops
  sourcePointsNeeded: (targetPointsRequired: number) => number;
}

export type RankStrategy = 'fewest_hops' | 'best_value' | 'fastest';
