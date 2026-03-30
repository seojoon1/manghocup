import type { Player, Team } from "~/types/player";
import { TIER_SCORES } from "~/types/player";

function getScore(player: Player): number {
  return TIER_SCORES[player.tier];
}

function getTotalScore(players: Player[]): number {
  return players.reduce((sum, p) => sum + getScore(p), 0);
}

/**
 * 10명의 플레이어를 티어 점수 기준으로 최대한 균등하게 2팀으로 나눔.
 * 모든 5명 조합 중 점수 차이가 가장 적은 조합을 선택.
 */
export function balanceTeams(players: Player[]): [Team, Team] {
  if (players.length !== 10) {
    throw new Error("팀 밸런싱에는 정확히 10명의 플레이어가 필요합니다.");
  }

  const totalScore = getTotalScore(players);
  const half = totalScore / 2;

  let bestDiff = Infinity;
  let bestTeam1Indices: number[] = [];

  // C(10,5) = 252 combinations — brute force is fine
  const indices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const combinations = getCombinations(indices, 5);

  for (const combo of combinations) {
    const score = combo.reduce((sum, i) => sum + getScore(players[i]), 0);
    const diff = Math.abs(score - half);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestTeam1Indices = combo;
    }
  }

  const team1Set = new Set(bestTeam1Indices);
  const team1Players = players.filter((_, i) => team1Set.has(i));
  const team2Players = players.filter((_, i) => !team1Set.has(i));

  return [
    { players: team1Players, totalScore: getTotalScore(team1Players) },
    { players: team2Players, totalScore: getTotalScore(team2Players) },
  ];
}

/**
 * 랜덤으로 2팀으로 나눔
 */
export function randomTeams(players: Player[]): [Team, Team] {
  if (players.length !== 10) {
    throw new Error("팀 나누기에는 정확히 10명의 플레이어가 필요합니다.");
  }

  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const team1Players = shuffled.slice(0, 5);
  const team2Players = shuffled.slice(5);

  return [
    { players: team1Players, totalScore: getTotalScore(team1Players) },
    { players: team2Players, totalScore: getTotalScore(team2Players) },
  ];
}

function getCombinations<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];

  function helper(start: number, current: T[]) {
    if (current.length === size) {
      result.push([...current]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      current.push(arr[i]);
      helper(i + 1, current);
      current.pop();
    }
  }

  helper(0, []);
  return result;
}
