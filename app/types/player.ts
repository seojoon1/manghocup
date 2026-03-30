export const TIERS = [
  "Iron",
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Diamond",
  "Meteorite",
  "Mythril",
  "Titan",
  "Immortal",
] as const;

export type Tier = (typeof TIERS)[number];

export const TIER_SCORES: Record<Tier, number> = {
  Iron: 1,
  Bronze: 2,
  Silver: 3,
  Gold: 4,
  Platinum: 5,
  Diamond: 6,
  Meteorite: 7,
  Mythril: 8,
  Titan: 9,
  Immortal: 10,
};

export interface Player {
  id: string;
  name: string;
  tier: Tier;
  memo: string;
}

export interface Team {
  players: Player[];
  totalScore: number;
}
