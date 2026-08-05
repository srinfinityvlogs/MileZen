export interface GraphEdge {
  fromProgrammeId: string;
  toProgrammeId: string;
  ratioFrom: number;
  ratioTo: number;
  transferTimeLabel: string;
  transferTimeMaxDays: number;
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
  hops: PathHop[];
  sourceProgrammeId: string;
  targetProgrammeId: string;
  hopCount: number;
  totalFactor: number;
  totalMaxDays: number;
  sourcePointsNeeded: (targetPointsRequired: number) => number;
}

export type RankStrategy = 'fewest_hops' | 'best_value' | 'fastest';
