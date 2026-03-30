import type { Player, Team } from "~/types/player";
import { TIER_SCORES } from "~/types/player";

function getScore(player: Player): number {
  return TIER_SCORES[player.tier];
}

function getTotalScore(players: Player[]): number {
  return players.reduce((sum, p) => sum + getScore(p), 0);
}

function toTeam(players: Player[]): Team {
  return { players, totalScore: getTotalScore(players) };
}

/**
 * 플레이어들을 3인 1팀으로 균등하게 나눔.
 * 그리디 방식: 점수 높은 순으로 정렬 후 가장 점수가 낮은 팀에 배정.
 */
export function balanceTeams(players: Player[], teamSize = 3): Team[] {
  const teamCount = Math.floor(players.length / teamSize);
  if (teamCount < 2) {
    throw new Error(`최소 ${teamSize * 2}명의 플레이어가 필요합니다.`);
  }

  const sorted = [...players].sort((a, b) => getScore(b) - getScore(a));
  const teams: Player[][] = Array.from({ length: teamCount }, () => []);
  const teamScores = new Array(teamCount).fill(0);

  for (const player of sorted) {
    // 자리가 남은 팀 중 점수가 가장 낮은 팀에 배정
    let minIdx = -1;
    let minScore = Infinity;
    for (let i = 0; i < teamCount; i++) {
      if (teams[i].length < teamSize && teamScores[i] < minScore) {
        minScore = teamScores[i];
        minIdx = i;
      }
    }
    if (minIdx === -1) break;
    teams[minIdx].push(player);
    teamScores[minIdx] += getScore(player);
  }

  return teams.map(toTeam);
}

/**
 * 랜덤으로 3인 1팀으로 나눔
 */
export function randomTeams(players: Player[], teamSize = 3): Team[] {
  const teamCount = Math.floor(players.length / teamSize);
  if (teamCount < 2) {
    throw new Error(`최소 ${teamSize * 2}명의 플레이어가 필요합니다.`);
  }

  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const teams: Team[] = [];

  for (let i = 0; i < teamCount; i++) {
    const group = shuffled.slice(i * teamSize, (i + 1) * teamSize);
    teams.push(toTeam(group));
  }

  return teams;
}
