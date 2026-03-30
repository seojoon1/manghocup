export const TIERS = [
  "Iron",
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Emerald",
  "Diamond",
  "Master",
  "Grandmaster",
  "Challenger",
] as const;

export type Tier = (typeof TIERS)[number];

export const TIER_SCORES: Record<Tier, number> = {
  Iron: 1,
  Bronze: 2,
  Silver: 3,
  Gold: 4,
  Platinum: 5,
  Emerald: 6,
  Diamond: 7,
  Master: 8,
  Grandmaster: 9,
  Challenger: 10,
};

export const POSITIONS = ["Top", "Jungle", "Mid", "ADC", "Support"] as const;
export type Position = (typeof POSITIONS)[number];

export interface Player {
  id: string;
  name: string;
  tier: Tier;
  position: Position;
  memo: string;
}

export interface Team {
  players: Player[];
  totalScore: number;
}
