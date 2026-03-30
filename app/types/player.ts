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

export interface Player {
  id: string;
  name: string;
  tier: Tier;
  memo: string;
}

export interface Captain {
  player: Player;
  budget: number;
  members: Player[];
}

export type Phase = "input" | "captainSelect" | "auction" | "result";
