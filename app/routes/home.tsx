import { useState, useCallback } from "react";
import type { Route } from "./+types/home";
import type { Player, Team } from "~/types/player";
import { POSITIONS } from "~/types/player";
import { Spreadsheet } from "~/components/spreadsheet";
import { TeamDisplay } from "~/components/team-display";
import { balanceTeams, randomTeams } from "~/utils/team-balancer";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "망호컵 - 내전 팀 밸런서" },
    { name: "description", content: "게임 내전 팀 밸런싱 시스템" },
  ];
}

function createInitialPlayers(): Player[] {
  return Array.from({ length: 10 }, (_, i) => ({
    id: crypto.randomUUID(),
    name: "",
    tier: "Gold" as const,
    position: POSITIONS[i % 5],
    memo: "",
  }));
}

export default function Home() {
  const [players, setPlayers] = useState<Player[]>(createInitialPlayers);
  const [teams, setTeams] = useState<[Team, Team] | null>(null);
  const [mode, setMode] = useState<"input" | "result">("input");
  const [error, setError] = useState<string | null>(null);

  const handleBalance = useCallback(() => {
    const emptyNames = players.filter((p) => !p.name.trim());
    if (emptyNames.length > 0) {
      setError(`이름이 비어있는 플레이어가 ${emptyNames.length}명 있습니다.`);
      return;
    }
    if (players.length !== 10) {
      setError("정확히 10명의 플레이어를 입력해주세요.");
      return;
    }
    setError(null);
    setTeams(balanceTeams(players));
    setMode("result");
  }, [players]);

  const handleRandom = useCallback(() => {
    const emptyNames = players.filter((p) => !p.name.trim());
    if (emptyNames.length > 0) {
      setError(`이름이 비어있는 플레이어가 ${emptyNames.length}명 있습니다.`);
      return;
    }
    if (players.length !== 10) {
      setError("정확히 10명의 플레이어를 입력해주세요.");
      return;
    }
    setError(null);
    setTeams(randomTeams(players));
    setMode("result");
  }, [players]);

  const handleReset = useCallback(() => {
    setTeams(null);
    setMode("input");
    setError(null);
  }, []);

  const handleClearAll = useCallback(() => {
    setPlayers(createInitialPlayers());
    setTeams(null);
    setMode("input");
    setError(null);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="text-blue-400">망호</span>
              <span className="text-red-400">컵</span>
            </h1>
            <p className="text-gray-500 text-sm">내전 팀 밸런서</p>
          </div>
          {mode === "result" && (
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              ← 다시 편집
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {mode === "input" ? (
          <div className="space-y-6">
            {/* Spreadsheet */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-200">
                  플레이어 명단
                </h2>
                <button
                  onClick={handleClearAll}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  전체 초기화
                </button>
              </div>
              <Spreadsheet players={players} onChange={setPlayers} />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleBalance}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                밸런스 팀 나누기
              </button>
              <button
                onClick={handleRandom}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                랜덤 팀 나누기
              </button>
            </div>

            {/* Instructions */}
            <div className="text-gray-600 text-xs space-y-1">
              <p>* Tab/Enter/방향키로 셀 간 이동이 가능합니다.</p>
              <p>
                * 밸런스 모드는 티어 점수를 기준으로 가장 균등한 팀을
                구성합니다.
              </p>
            </div>
          </div>
        ) : (
          teams && (
            <div className="space-y-6">
              {/* Score diff */}
              <div className="text-center">
                <span className="inline-block bg-gray-800 rounded-full px-4 py-2 text-sm">
                  점수 차이:{" "}
                  <span className="text-yellow-400 font-bold">
                    {Math.abs(teams[0].totalScore - teams[1].totalScore)}
                  </span>
                </span>
              </div>

              {/* Teams */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TeamDisplay team={teams[0]} teamName="블루팀" color="blue" />
                <TeamDisplay team={teams[1]} teamName="레드팀" color="red" />
              </div>

              {/* Re-roll */}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleBalance}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
                >
                  밸런스 다시 나누기
                </button>
                <button
                  onClick={handleRandom}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                >
                  랜덤 다시 나누기
                </button>
              </div>
            </div>
          )
        )}
      </main>
    </div>
  );
}
