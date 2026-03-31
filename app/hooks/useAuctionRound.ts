import { useEffect, useState } from "react";
import type { Player, Captain, Tier } from "~/types/player";

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

interface UseAuctionRoundParams {
  currentPlayer: Player;
  captains: Captain[];
  membersPerTeam: number;
  roundSeconds: number;
  onBid: (captainIndex: number, amount: number) => void;
  onSkip: () => void;
}

export function useAuctionRound({
  currentPlayer,
  captains,
  membersPerTeam,
  roundSeconds,
  onBid,
  onSkip,
}: UseAuctionRoundParams) {
  const startPrice = PLAYER_START_PRICE_BY_TIER[currentPlayer.tier];
  const [timeLeft, setTimeLeft] = useState(roundSeconds);
  const [isRoundStarted, setIsRoundStarted] = useState(false);
  const [currentBid, setCurrentBid] = useState(startPrice - 1);
  const [highestBidder, setHighestBidder] = useState<number | null>(null);
  const [bidAmounts, setBidAmounts] = useState<Record<number, number>>({});
  const [roundPlayerId, setRoundPlayerId] = useState(currentPlayer.id);

  // Restore from localStorage on player change
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

  // Persist to localStorage
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

  // Countdown timer
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

  // Auto-settle when no challengers remain
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

  // Auto-skip when no one can open
  useEffect(() => {
    if (!isRoundStarted || highestBidder !== null) {
      return;
    }

    const hasAnyOpeningBidder = captains.some(
      (captain) =>
        captain.members.length < membersPerTeam &&
        captain.budget >= startPrice
    );

    if (!hasAnyOpeningBidder) {
      setIsRoundStarted(false);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(ROUND_STORAGE_KEY);
      }
      onSkip();
    }
  }, [
    isRoundStarted,
    highestBidder,
    captains,
    membersPerTeam,
    startPrice,
    onSkip,
  ]);

  const handleBidChange = (captainIdx: number, value: string) => {
    const num = parseInt(value) || 0;
    setBidAmounts((prev) => ({ ...prev, [captainIdx]: num }));
  };

  const handleBid = (captainIdx: number, amountOverride?: number) => {
    if (!isRoundStarted) {
      console.warn(`❌ 경매 시작 안 됨`);
      return;
    }

    if (captainIdx === highestBidder) {
      console.warn(`❌ 이미 최고 입찰 팀`);
      return;
    }

    const amount = amountOverride ?? (bidAmounts[captainIdx] || 0);
    const captain = captains[captainIdx];
    const minBid = highestBidder === null ? startPrice : currentBid + 1;

    if (amount < minBid || amount > captain.budget) {
      console.warn(
        `❌ 입찰 금액 범위 오류: ${amount}원 (최소: ${minBid}, 예산: ${captain.budget})`
      );
      return;
    }

    console.log(`✅ 입찰 성공: 팀${captainIdx + 1} ${amount}원`);
    setCurrentBid(amount);
    setHighestBidder(captainIdx);
    setTimeLeft(roundSeconds);
    setBidAmounts({});
  };

  const handleForceSettle = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ROUND_STORAGE_KEY);
    }

    setIsRoundStarted(false);

    if (highestBidder !== null && currentBid > 0) {
      onBid(highestBidder, currentBid);
      return;
    }

    onSkip();
  };

  const startRound = () => setIsRoundStarted(true);

  return {
    startPrice,
    timeLeft,
    isRoundStarted,
    currentBid,
    highestBidder,
    bidAmounts,
    startRound,
    handleBid,
    handleBidChange,
    handleForceSettle,
  };
}
