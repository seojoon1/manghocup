import { useEffect, useState } from "react";
import type { Player, Captain, Tier } from "~/types/player";

interface AuctionProps {
  currentPlayer: Player;
  captains: Captain[];
  playerIndex: number;
  totalPlayers: number;
  onBid: (captainIndex: number, amount: number) => void;
  onSkip: () => void;
  onUndo: () => void;
  canUndo: boolean;
  membersPerTeam: number;
  roundSeconds: number;
}

const tierColors: Record<string, string> = {
  Iron: "text-gray-400",
  Bronze: "text-amber-700",
  Silver: "text-gray-300",
  Gold: "text-yellow-400",
  Platinum: "text-teal-300",
  Diamond: "text-blue-300",
  Meteorite: "text-orange-400",
  Mythril: "text-purple-400",
  Titan: "text-red-400",
  Immortal: "text-amber-300",
};

const PLAYER_START_PRICE_BY_TIER: Record<Tier, number> = {
  Iron: 50,
  Bronze: 80,
  Silver: 110,
  Gold: 140,
  Platinum: 180,
  Diamond: 220,
  Meteorite: 260,
  Mythril: 310,
  Titan: 360,
  Immortal: 420,
};

const ROUND_STORAGE_KEY = "manghocup.round.v1";

type RoundSnapshot = {
  version: 1;
  playerId: string;
  timeLeft: number;
  isRoundStarted: boolean;
  currentBid: number;
  highestBidder: number | null;
  bidAmounts: Record<number, number>;
};

export function Auction({
  currentPlayer,
  captains,
  playerIndex,
  totalPlayers,
  onBid,
  onSkip,
  onUndo,
  canUndo,
  membersPerTeam,
  roundSeconds,
}: AuctionProps) {
  const startPrice = PLAYER_START_PRICE_BY_TIER[currentPlayer.tier];
  const [timeLeft, setTimeLeft] = useState(roundSeconds);
  const [isRoundStarted, setIsRoundStarted] = useState(false);
  const [currentBid, setCurrentBid] = useState(startPrice - 1);
  const [highestBidder, setHighestBidder] = useState<number | null>(null);
  const [bidAmounts, setBidAmounts] = useState<Record<number, number>>({});
  const [roundPlayerId, setRoundPlayerId] = useState(currentPlayer.id);

  useEffect(() => {
    setRoundPlayerId(currentPlayer.id);

    if (typeof window === "undefined") {
      setTimeLeft(roundSeconds);
      setIsRoundStarted(false);
      setCurrentBid(startPrice - 1);
      setHighestBidder(null);
      setBidAmounts({});
      return;
    }

    try {
      const raw = window.localStorage.getItem(ROUND_STORAGE_KEY);
      if (!raw) {
        setTimeLeft(roundSeconds);
        setIsRoundStarted(false);
        setCurrentBid(startPrice - 1);
        setHighestBidder(null);
        setBidAmounts({});
        return;
      }

      const snapshot = JSON.parse(raw) as Partial<RoundSnapshot>;
      const isValidPlayer = snapshot.playerId === currentPlayer.id;
      const restoredTimeLeft = snapshot.timeLeft;
      const isValidTime =
        typeof restoredTimeLeft === "number" &&
        restoredTimeLeft >= 0 &&
        restoredTimeLeft <= roundSeconds;

      if (snapshot.version !== 1 || !isValidPlayer || !isValidTime) {
        setTimeLeft(roundSeconds);
        setIsRoundStarted(false);
        setCurrentBid(startPrice - 1);
        setHighestBidder(null);
        setBidAmounts({});
        return;
      }

      setTimeLeft(restoredTimeLeft);
      setIsRoundStarted(Boolean(snapshot.isRoundStarted));
      setCurrentBid(
        typeof snapshot.currentBid === "number"
          ? snapshot.currentBid
          : startPrice - 1
      );
      setHighestBidder(
        typeof snapshot.highestBidder === "number" ? snapshot.highestBidder : null
      );
      setBidAmounts(snapshot.bidAmounts ?? {});
    } catch {
      setTimeLeft(roundSeconds);
      setIsRoundStarted(false);
      setCurrentBid(startPrice - 1);
      setHighestBidder(null);
      setBidAmounts({});
    }
  }, [currentPlayer.id, roundSeconds, startPrice]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const snapshot: RoundSnapshot = {
      version: 1,
      playerId: currentPlayer.id,
      timeLeft,
      isRoundStarted,
      currentBid,
      highestBidder,
      bidAmounts,
    };

    window.localStorage.setItem(ROUND_STORAGE_KEY, JSON.stringify(snapshot));
  }, [
    currentPlayer.id,
    timeLeft,
    isRoundStarted,
    currentBid,
    highestBidder,
    bidAmounts,
  ]);

  useEffect(() => {
    if (roundPlayerId !== currentPlayer.id) {
      return;
    }

    if (!isRoundStarted) {
      return;
    }

    if (timeLeft <= 0) {
      setIsRoundStarted(false);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(ROUND_STORAGE_KEY);
      }
      if (highestBidder !== null && currentBid > 0) {
        onBid(highestBidder, currentBid);
      } else {
        onSkip();
      }
      return;
    }

    const timer = window.setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    roundPlayerId,
    currentPlayer.id,
    isRoundStarted,
    timeLeft,
    highestBidder,
    currentBid,
    onBid,
    onSkip,
  ]);

  const handleBidChange = (captainIdx: number, value: string) => {
    const num = parseInt(value) || 0;
    setBidAmounts((prev) => ({ ...prev, [captainIdx]: num }));
  };

  const handleBid = (captainIdx: number) => {
    if (!isRoundStarted) {
      return;
    }

    if (captainIdx === highestBidder) {
      return;
    }

    const amount = bidAmounts[captainIdx] || 0;
    const captain = captains[captainIdx];
    const minBid = highestBidder === null ? startPrice : currentBid + 1;

    if (amount < minBid || amount > captain.budget) {
      return;
    }

    setCurrentBid(amount);
    setHighestBidder(captainIdx);
    setTimeLeft(roundSeconds);
    setBidAmounts({});
  };

  useEffect(() => {
    if (!isRoundStarted || highestBidder === null) {
      return;
    }

    const nextMinBid = currentBid + 1;
    const hasAnyChallenger = captains.some(
      (captain, idx) =>
        idx !== highestBidder &&
        captain.members.length < membersPerTeam &&
        captain.budget >= nextMinBid
    );

    if (!hasAnyChallenger) {
      setIsRoundStarted(false);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(ROUND_STORAGE_KEY);
      }
      onBid(highestBidder, currentBid);
    }
  }, [
    isRoundStarted,
    highestBidder,
    currentBid,
    captains,
    membersPerTeam,
    onBid,
  ]);

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="text-center text-gray-500 text-sm">
        경매 {playerIndex + 1} / {totalPlayers}
      </div>

      {/* Round timer */}
      <div className="max-w-md mx-auto rounded-2xl border border-gray-800 bg-gray-900 p-4 text-center">
        <div className="text-xs text-gray-400 mb-1">남은 시간</div>
        <div
          className={`text-4xl font-bold font-mono ${
            !isRoundStarted
              ? "text-gray-400"
              : timeLeft <= 5
                ? "text-red-400"
                : "text-blue-400"
          }`}
        >
          00:{String(timeLeft).padStart(2, "0")}
        </div>
        <div className="mt-2">
          <button
            onClick={() => setIsRoundStarted(true)}
            disabled={isRoundStarted}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-400 text-white text-xs font-semibold rounded transition-colors"
          >
            {isRoundStarted ? "경매 진행 중" : "경매 시작"}
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-400">
          {highestBidder !== null
            ? `현재 최고 입찰: ${captains[highestBidder].player.name} (${currentBid}원)`
            : `시작가: ${startPrice}원`}
        </div>
      </div>

      {/* Current player card */}
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md mx-auto text-center space-y-3">
        <div className="text-sm text-gray-500">경매 대상</div>
        <div className="text-4xl font-bold text-white">
          {currentPlayer.name}
        </div>
        <div
          className={`text-xl font-semibold ${tierColors[currentPlayer.tier] || "text-gray-300"}`}
        >
          {currentPlayer.tier}
        </div>
        <div className="text-sm text-gray-300">시작가 {startPrice}원</div>
        {currentPlayer.memo && (
          <div className="text-gray-400 text-sm">"{currentPlayer.memo}"</div>
        )}
      </div>

      {/* Progress bar */}
      <div className="max-w-md mx-auto bg-gray-800 rounded-full h-1.5">
        <div
          className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
          style={{
            width: `${((playerIndex + 1) / totalPlayers) * 100}%`,
          }}
        />
      </div>

      {/* Captain bidding area */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl mx-auto">
        {captains.map((captain, idx) => {
          const isFull = captain.members.length >= membersPerTeam;
          const isHighestBidder = highestBidder === idx;
          const bidValue = bidAmounts[idx] || 0;
          const minBid = highestBidder === null ? startPrice : currentBid + 1;
          const cannotBid = isFull || isHighestBidder || !isRoundStarted;

          return (
            <div
              key={captain.player.id}
              className={`border rounded-lg p-4 transition-colors ${
                isFull
                  ? "border-gray-800 bg-gray-900/50 opacity-50"
                  : isHighestBidder
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-gray-700 bg-gray-900 hover:border-gray-600"
              }`}
            >
              {/* Captain info */}
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-white text-sm">
                  {captain.player.name}
                </span>
                <span className="text-yellow-400 text-xs font-mono">
                  {captain.budget}원
                </span>
              </div>

              {/* Members */}
              <div className="space-y-0.5 mb-3">
                {captain.members.map((m) => (
                  <div key={m.id} className="text-xs text-gray-400">
                    {m.name}
                  </div>
                ))}
                {Array.from({
                  length: membersPerTeam - captain.members.length,
                }).map((_, j) => (
                  <div key={`empty-${j}`} className="text-xs text-gray-700">
                    —
                  </div>
                ))}
              </div>

              {/* Bid input */}
              {!isFull && (
                <div className="space-y-2">
                  <div className="flex gap-1">
                    <input
                      type="number"
                      min={minBid}
                      max={captain.budget}
                      value={bidAmounts[idx] || ""}
                      onChange={(e) => handleBidChange(idx, e.target.value)}
                      placeholder={`최소 ${minBid}`}
                      disabled={cannotBid}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-sm outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-40"
                    />
                  </div>
                  <button
                    onClick={() => handleBid(idx)}
                    disabled={
                      cannotBid ||
                      !bidAmounts[idx] ||
                      bidValue < minBid ||
                      bidValue > captain.budget
                    }
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs font-semibold rounded transition-colors"
                  >
                    {isHighestBidder ? "최고 입찰 중" : "입찰"}
                  </button>
                </div>
              )}
              {isFull && (
                <div className="text-xs text-gray-600 text-center">
                  팀 완성
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex gap-3 justify-center">
        {canUndo && (
          <button
            onClick={onUndo}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
          >
            ↩ 되돌리기
          </button>
        )}
      </div>
    </div>
  );
}
