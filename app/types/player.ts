export const TIERS = [
  "Iron",
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Diamond",
  "Meteorite",
  "Mithril",
  "Demigod",
  "Eternity",
] as const;

export type Tier = (typeof TIERS)[number];

export interface Player {
  id: string;
  discord_username: string;
  name: string;
  mmr: number;
  tier: Tier;
  appeal: string;
}

export interface Captain {
  player: Player;
  budget: number;
  members: Player[];
}

export type Phase = "input" | "captainSelect" | "auction" | "result";
