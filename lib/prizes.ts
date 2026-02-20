export type PrizeLabel = "5K" | "10K" | "20K" | "50K" | "100K";

export interface PrizeTier {
  label: PrizeLabel;
  amount: number;
  weight: number;
  color: string;
  textColor: string;
}

export interface PrizeSegment extends PrizeTier {
  startAngle: number;
  endAngle: number;
  centerAngle: number;
  sweep: number;
}

export const PRIZE_TIERS: PrizeTier[] = [
  {
    label: "5K",
    amount: 5000,
    weight: 45,
    color: "#de1f26",
    textColor: "#fff8d6",
  },
  {
    label: "10K",
    amount: 10000,
    weight: 28,
    color: "#f57c0d",
    textColor: "#fff8d6",
  },
  {
    label: "20K",
    amount: 20000,
    weight: 16,
    color: "#f3bb33",
    textColor: "#6d1501",
  },
  {
    label: "50K",
    amount: 50000,
    weight: 8,
    color: "#0d8f7a",
    textColor: "#fff8d6",
  },
  {
    label: "100K",
    amount: 100000,
    weight: 3,
    color: "#005f73",
    textColor: "#fff8d6",
  },
];

export function getTotalPrizeWeight(prizes: PrizeTier[] = PRIZE_TIERS): number {
  return prizes.reduce((sum, prize) => sum + prize.weight, 0);
}

export function buildPrizeSegments(prizes: PrizeTier[] = PRIZE_TIERS): PrizeSegment[] {
  const totalWeight = getTotalPrizeWeight(prizes);
  let currentAngle = 0;

  return prizes.map((prize) => {
    const sweep = (prize.weight / totalWeight) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sweep;
    const centerAngle = startAngle + sweep / 2;

    currentAngle = endAngle;

    return {
      ...prize,
      startAngle,
      endAngle,
      centerAngle,
      sweep,
    };
  });
}

export function pickWeightedPrize(randomValue = Math.random()): PrizeTier {
  const totalWeight = getTotalPrizeWeight();
  const point = randomValue * totalWeight;
  let cumulativeWeight = 0;

  for (const prize of PRIZE_TIERS) {
    cumulativeWeight += prize.weight;
    if (point < cumulativeWeight) {
      return prize;
    }
  }

  return PRIZE_TIERS[PRIZE_TIERS.length - 1];
}

export function getPrizeByLabel(label: PrizeLabel): PrizeTier | undefined {
  return PRIZE_TIERS.find((prize) => prize.label === label);
}
