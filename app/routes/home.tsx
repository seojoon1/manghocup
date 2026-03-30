import { useState, useCallback, useEffect } from "react";
import { useFetcher } from "react-router";
import type { Route } from "./+types/home";
import type { Player, Captain, Phase, Tier } from "~/types/player";
import { CaptainSelect } from "~/components/captain-select";
import { Auction } from "~/components/auction";
import { DraftResult } from "~/components/draft-result";
import {
  toGoogleSheetsJsonUrl,
  parseGoogleSheetsJson,
  extractSheetId,
} from "~/utils/csv-parser";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "망호컵 - 이터널리턴 내전" },
    { name: "description", content: "이터널리턴 내전 경매" },
  ];
}

// 서버 사이드에서 Google Sheets JSON fetch
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const rawUrl = formData.get("csvUrl") as string;

  if (!rawUrl?.trim()) {
    return { error: "CSV 링크를 입력해주세요.", players: null };
  }

  try {
    const sheetId = extractSheetId(rawUrl.trim());
    if (!sheetId) {
      return { error: "올바른 Google Sheets 링크가 아닙니다.", players: null };
    }

    const url = toGoogleSheetsJsonUrl(rawUrl.trim());
    const res = await fetch(url);
    if (!res.ok) {
      return {
        error: `데이터를 가져올 수 없습니다. (${res.status}) — 시트가 공개 상태인지 확인하세요.`,
        players: null,
      };
    }
    const text = await res.text();
    const players = parseGoogleSheetsJson(text);

    if (players.length < 6) {
      return { error: "최소 6명이 필요합니다.", players: null };
    }

    return { error: null, players };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "알 수 없는 오류",
      players: null,
    };
  }
}

const CAPTAIN_BUDGET_BY_TIER: Record<Tier, number> = {
  Iron: 1300,
  Bronze: 1250,
  Silver: 1200,
  Gold: 1150,
  Platinum: 1100,
  Diamond: 1050,
  Meteorite: 1000,
  Mythril: 950,
  Titan: 900,
  Immortal: 850,
};

const AUCTION_ROUND_SECONDS = 30;
const DRAFT_STORAGE_KEY = "manghocup.draft.v1";

type AuctionHistoryItem = {
  captainIdx: number;
  player: Player;
  amount: number;
  prevBudget: number;
};

type DraftSnapshot = {
  version: 1;
  csvUrl: string;
  allPlayers: Player[];
  phase: Phase;
  selectedCaptainIds: string[];
  captains: Captain[];
  auctionPool: Player[];
  auctionIndex: number;
  history: AuctionHistoryItem[];
};

export default function Home() {
  const fetcher = useFetcher<typeof action>();
  const [csvUrl, setCsvUrl] = useState("");
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [phase, setPhase] = useState<Phase>("input");

  // Captain select
  const [selectedCaptainIds, setSelectedCaptainIds] = useState<Set<string>>(
    new Set()
  );

  // Auction
  const [captains, setCaptains] = useState<Captain[]>([]);
  const [auctionPool, setAuctionPool] = useState<Player[]>([]);
  const [auctionIndex, setAuctionIndex] = useState(0);
  const [history, setHistory] = useState<AuctionHistoryItem[]>([]);
  const [hasHydrated, setHasHydrated] = useState(false);

  // fetcher 결과
  const loading = fetcher.state === "submitting";
  const fetcherError = fetcher.data?.error ?? null;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) {
        setHasHydrated(true);
        return;
      }

      const snapshot = JSON.parse(raw) as Partial<DraftSnapshot>;
      if (snapshot.version !== 1) {
        setHasHydrated(true);
        return;
      }

      const validPhase: Phase =
        snapshot.phase === "captainSelect" ||
        snapshot.phase === "auction" ||
        snapshot.phase === "result"
          ? snapshot.phase
          : "input";

      setCsvUrl(typeof snapshot.csvUrl === "string" ? snapshot.csvUrl : "");
      setAllPlayers(Array.isArray(snapshot.allPlayers) ? snapshot.allPlayers : []);
      setPhase(validPhase);
      setSelectedCaptainIds(
        new Set(
          Array.isArray(snapshot.selectedCaptainIds)
            ? snapshot.selectedCaptainIds
            : []
        )
      );
      setCaptains(Array.isArray(snapshot.captains) ? snapshot.captains : []);
      setAuctionPool(Array.isArray(snapshot.auctionPool) ? snapshot.auctionPool : []);
      setAuctionIndex(
        typeof snapshot.auctionIndex === "number" ? snapshot.auctionIndex : 0
      );
      setHistory(Array.isArray(snapshot.history) ? snapshot.history : []);
    } catch {
      // Ignore invalid local storage payloads and continue with defaults.
    } finally {
      setHasHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated || typeof window === "undefined") {
      return;
    }

    const snapshot: DraftSnapshot = {
      version: 1,
      csvUrl,
      allPlayers,
      phase,
      selectedCaptainIds: Array.from(selectedCaptainIds),
      captains,
      auctionPool,
      auctionIndex,
      history,
    };

    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(snapshot));
  }, [
    hasHydrated,
    csvUrl,
    allPlayers,
    phase,
    selectedCaptainIds,
    captains,
    auctionPool,
    auctionIndex,
    history,
  ]);

  useEffect(() => {
    if (fetcher.data?.players && phase === "input") {
      setAllPlayers(fetcher.data.players);
      setSelectedCaptainIds(new Set());
      setPhase("captainSelect");
    }
  }, [fetcher.data]);

  // 팀장 토글
  const toggleCaptain = useCallback((player: Player) => {
    setSelectedCaptainIds((prev) => {
      const next = new Set(prev);
      if (next.has(player.id)) {
        next.delete(player.id);
      } else {
        next.add(player.id);
      }
      return next;
    });
  }, []);

  // 팀장 확정 → 경매 시작
  const confirmCaptains = useCallback(() => {
    const captainPlayers = allPlayers.filter((p) =>
      selectedCaptainIds.has(p.id)
    );
    const pool = allPlayers.filter((p) => !selectedCaptainIds.has(p.id));

    // 셔플
    const shuffled = [...pool].sort(() => Math.random() - 0.5);

    setCaptains(
      captainPlayers.map((p) => ({
        player: p,
        budget: CAPTAIN_BUDGET_BY_TIER[p.tier],
        members: [],
      }))
    );
    setAuctionPool(shuffled);
    setAuctionIndex(0);
    setHistory([]);
    setPhase("auction");
  }, [allPlayers, selectedCaptainIds]);

  // 팀원 수 계산
  const membersPerTeam =
    captains.length > 0
      ? Math.floor(
          (allPlayers.length - captains.length) / captains.length
        )
      : 2;

  // 낙찰
  const handleBid = useCallback(
    (captainIdx: number, amount: number) => {
      const captain = captains[captainIdx];
      const player = auctionPool[auctionIndex];

      setHistory((prev) => [
        ...prev,
        {
          captainIdx,
          player,
          amount,
          prevBudget: captain.budget,
        },
      ]);

      setCaptains((prev) =>
        prev.map((c, i) =>
          i === captainIdx
            ? {
                ...c,
                budget: c.budget - amount,
                members: [...c.members, player],
              }
            : c
        )
      );

      const nextIndex = auctionIndex + 1;
      if (nextIndex >= auctionPool.length) {
        setAuctionIndex(nextIndex);
        setPhase("result");
      } else {
        setAuctionIndex(nextIndex);
      }
    },
    [captains, auctionPool, auctionIndex]
  );

  const handleSkip = useCallback(() => {
    const nextIndex = auctionIndex + 1;

    if (nextIndex >= auctionPool.length) {
      setAuctionIndex(nextIndex);
      setPhase("result");
      return;
    }

    setAuctionIndex(nextIndex);
  }, [auctionIndex, auctionPool.length]);

  // 되돌리기
  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const last = history[history.length - 1];

    setCaptains((prev) =>
      prev.map((c, i) =>
        i === last.captainIdx
          ? {
              ...c,
              budget: last.prevBudget,
              members: c.members.filter((m) => m.id !== last.player.id),
            }
          : c
      )
    );

    setAuctionIndex((prev) => prev - 1);
    setHistory((prev) => prev.slice(0, -1));

    if (phase === "result") {
      setPhase("auction");
    }
  }, [history, phase]);

  // 리셋
  const handleReset = useCallback(() => {
    setCsvUrl("");
    setAllPlayers([]);
    setSelectedCaptainIds(new Set());
    setCaptains([]);
    setAuctionPool([]);
    setAuctionIndex(0);
    setHistory([]);
    setPhase("input");

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      window.localStorage.removeItem("manghocup.round.v1");
    }
  }, []);

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
            <p className="text-gray-500 text-sm">이터널리턴 내전 경매</p>
          </div>
          {phase !== "input" && (
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
        {/* Phase 1: CSV 입력 */}
        {phase === "input" && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <h2 className="text-lg font-semibold text-gray-200 mb-4">
                스프레드시트 링크 입력
              </h2>
              <p className="text-gray-400 text-sm mb-4">
                Google Sheets 공유 링크를 입력하세요. (링크가 있는 사람 모두
                보기로 설정)
              </p>
              <fetcher.Form method="post" className="flex gap-3">
                <input
                  type="url"
                  name="csvUrl"
                  value={csvUrl}
                  onChange={(e) => setCsvUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-400 text-white font-semibold rounded-lg transition-colors text-sm whitespace-nowrap"
                >
                  {loading ? "불러오는 중..." : "불러오기"}
                </button>
              </fetcher.Form>
            </div>

            {/* 형식 안내 */}
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
              <div className="text-gray-500 text-xs mt-3 space-y-1">
                <p>* 티어: 한글/영문 모두 인식</p>
                <p>* 각 팀장의 초기 예산은 팀장 티어에 따라 차등 지급됩니다</p>
              </div>
            </div>

            {fetcherError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                {fetcherError}
              </div>
            )}
          </div>
        )}

        {/* Phase 2: 팀장 선정 */}
        {phase === "captainSelect" && (
          <CaptainSelect
            players={allPlayers}
            selectedCaptainIds={selectedCaptainIds}
            onToggleCaptain={toggleCaptain}
            onConfirm={confirmCaptains}
            maxCaptains={Math.floor(allPlayers.length / 3)}
          />
        )}

        {/* Phase 3: 경매 */}
        {phase === "auction" && auctionIndex < auctionPool.length && (
          <Auction
            currentPlayer={auctionPool[auctionIndex]}
            captains={captains}
            playerIndex={auctionIndex}
            totalPlayers={auctionPool.length}
            onBid={handleBid}
            onSkip={handleSkip}
            onUndo={handleUndo}
            canUndo={history.length > 0}
            membersPerTeam={membersPerTeam}
            roundSeconds={AUCTION_ROUND_SECONDS}
          />
        )}

        {/* Phase 4: 결과 */}
        {phase === "result" && (
          <div className="space-y-6">
            <DraftResult captains={captains} />
            <div className="flex justify-center gap-3">
              <button
                onClick={handleUndo}
                disabled={history.length === 0}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-white text-sm rounded-lg transition-colors"
              >
                ↩ 마지막 되돌리기
              </button>
              <button
                onClick={handleReset}
                className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
              >
                새 경매
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
