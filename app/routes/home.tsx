import { useState, useCallback } from "react";
import type { Route } from "./+types/home";
import type { Player, Team } from "~/types/player";
import { TeamDisplay } from "~/components/team-display";
import { balanceTeams, randomTeams } from "~/utils/team-balancer";
import { parseCSV, toGoogleSheetsCSVUrl } from "~/utils/csv-parser";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "망호컵 - 이터널리턴 내전" },
    { name: "description", content: "이터널리턴 내전 팀 밸런서" },
  ];
}

export default function Home() {
  const [csvUrl, setCsvUrl] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [mode, setMode] = useState<"input" | "loaded" | "result">("input");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const teamSize = 3;

  const handleFetch = useCallback(async () => {
    if (!csvUrl.trim()) {
      setError("CSV 링크를 입력해주세요.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = toGoogleSheetsCSVUrl(csvUrl.trim());
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`데이터를 가져올 수 없습니다. (${res.status})`);
      }
      const text = await res.text();
      const parsed = parseCSV(text);

      if (parsed.length === 0) {
        throw new Error("플레이어 데이터가 없습니다.");
      }
      if (parsed.length % teamSize !== 0) {
        throw new Error(
          `${teamSize}인 1팀 기준, ${parsed.length}명은 팀을 균등하게 나눌 수 없습니다. (${teamSize}의 배수 필요)`
        );
      }

      setPlayers(parsed);
      setMode("loaded");
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  }, [csvUrl]);

  const handleBalance = useCallback(() => {
    setTeams(balanceTeams(players, teamSize));
    setMode("result");
  }, [players]);

  const handleRandom = useCallback(() => {
    setTeams(randomTeams(players, teamSize));
    setMode("result");
  }, [players]);

  const handleReset = useCallback(() => {
    setTeams([]);
    setPlayers([]);
    setMode("input");
    setError(null);
  }, []);

  const scoreDiff =
    teams.length > 0
      ? Math.max(...teams.map((t) => t.totalScore)) -
        Math.min(...teams.map((t) => t.totalScore))
      : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="text-blue-400">망호</span>
              <span className="text-red-400">컵</span>
            </h1>
            <p className="text-gray-500 text-sm">이터널리턴 내전 팀 밸런서</p>
          </div>
          {mode !== "input" && (
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              ← 처음으로
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Step 1: CSV URL 입력 */}
        {mode === "input" && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <h2 className="text-lg font-semibold text-gray-200 mb-4">
                스프레드시트 링크 입력
              </h2>
              <p className="text-gray-400 text-sm mb-4">
                Google Sheets 공유 링크 또는 CSV URL을 입력하세요.
              </p>
              <div className="flex gap-3">
                <input
                  type="url"
                  value={csvUrl}
                  onChange={(e) => setCsvUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleFetch()}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleFetch}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-400 text-white font-semibold rounded-lg transition-colors text-sm whitespace-nowrap"
                >
                  {loading ? "불러오는 중..." : "불러오기"}
                </button>
              </div>
            </div>

            {/* CSV 형식 안내 */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">
                스프레드시트 형식
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-800 text-gray-300">
                      <th className="border border-gray-700 px-3 py-2 text-left">
                        이름
                      </th>
                      <th className="border border-gray-700 px-3 py-2 text-left">
                        티어
                      </th>
                      <th className="border border-gray-700 px-3 py-2 text-left">
                        메모 (선택)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-400">
                    <tr>
                      <td className="border border-gray-700 px-3 py-2">
                        홍길동
                      </td>
                      <td className="border border-gray-700 px-3 py-2">
                        미스릴
                      </td>
                      <td className="border border-gray-700 px-3 py-2">
                        아야 원챔
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-700 px-3 py-2">
                        김철수
                      </td>
                      <td className="border border-gray-700 px-3 py-2">
                        Diamond
                      </td>
                      <td className="border border-gray-700 px-3 py-2"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-gray-500 text-xs mt-3">
                * 티어는 한글(골드, 미스릴, 메테오) / 영문(Gold, Mythril,
                Meteorite) 모두 인식
              </p>
              <p className="text-gray-500 text-xs">
                * 인원은 3의 배수 (3인 1팀 기준)
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Step 2: 플레이어 확인 */}
        {mode === "loaded" && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-200">
                  플레이어 명단
                </h2>
                <span className="text-gray-400 text-sm">
                  {players.length}명 → {Math.floor(players.length / teamSize)}팀
                </span>
              </div>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-800 text-gray-300">
                    <th className="border border-gray-700 px-3 py-2 w-10 text-center">
                      #
                    </th>
                    <th className="border border-gray-700 px-3 py-2 text-left">
                      이름
                    </th>
                    <th className="border border-gray-700 px-3 py-2 text-left">
                      티어
                    </th>
                    <th className="border border-gray-700 px-3 py-2 text-left">
                      메모
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p, i) => (
                    <tr
                      key={p.id}
                      className={
                        i % 2 === 0 ? "bg-gray-900" : "bg-gray-800/50"
                      }
                    >
                      <td className="border border-gray-700 px-3 py-2 text-center text-gray-500 font-mono">
                        {i + 1}
                      </td>
                      <td className="border border-gray-700 px-3 py-2 text-white">
                        {p.name}
                      </td>
                      <td className="border border-gray-700 px-3 py-2 text-gray-300">
                        {p.tier}
                      </td>
                      <td className="border border-gray-700 px-3 py-2 text-gray-500">
                        {p.memo}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

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
          </div>
        )}

        {/* Step 3: 팀 결과 */}
        {mode === "result" && teams.length > 0 && (
          <div className="space-y-6">
            <div className="text-center">
              <span className="inline-block bg-gray-800 rounded-full px-4 py-2 text-sm">
                최대 점수 차이:{" "}
                <span className="text-yellow-400 font-bold">{scoreDiff}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {teams.map((team, i) => (
                <TeamDisplay key={i} team={team} teamNumber={i + 1} />
              ))}
            </div>

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
        )}
      </main>
    </div>
  );
}
