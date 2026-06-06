import type { Player } from "~/types/player";

interface CaptainSelectProps {
  players: Player[];
  selectedCaptainIds: Set<string>;
  onToggleCaptain: (player: Player) => void;
  onConfirm: () => void;
  maxCaptains: number;
}

const tierColors: Record<string, string> = {
  Iron: "text-gray-400",
  Bronze: "text-amber-700",
  Silver: "text-gray-300",
  Gold: "text-yellow-400",
  Platinum: "text-teal-300",
  Diamond: "text-blue-300",
  Meteorite: "text-orange-400",
  Mithril: "text-purple-400",
  Demigod: "text-red-400",
  Eternity: "text-amber-300",
};

export function CaptainSelect({
  players,
  selectedCaptainIds,
  onToggleCaptain,
  onConfirm,
  maxCaptains,
}: CaptainSelectProps) {
  const selectedCount = selectedCaptainIds.size;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-white">팀장 선정</h2>
        <p className="text-gray-400 text-sm">
          팀장으로 지정할 플레이어를 선택하세요
        </p>
        <div className="text-sm">
          <span className="text-gray-100 font-bold">{selectedCount}</span>
          <span className="text-gray-500"> / {maxCaptains}명 선택</span>
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        {players.map((player, i) => {
          const isCaptain = selectedCaptainIds.has(player.id);
          const cannotSelectMore = !isCaptain && selectedCount >= maxCaptains;

          return (
            <button
              key={player.id}
              onClick={() => onToggleCaptain(player)}
              disabled={cannotSelectMore}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-gray-800 last:border-b-0 ${
                isCaptain
                  ? "bg-white/10 hover:bg-white/15"
                  : "hover:bg-gray-800 disabled:hover:bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              }`}
            >
              {/* 체크 */}
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  isCaptain
                    ? "border-gray-200 bg-gray-200"
                    : "border-gray-600"
                }`}
              >
                {isCaptain && (
                  <svg
                    className="w-3 h-3 text-gray-900"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>

              {/* 번호 */}
              <span className="text-gray-500 text-sm font-mono w-6">
                {i + 1}
              </span>

              {/* 이름 */}
              <span
                className={`font-medium flex-1 ${isCaptain ? "text-gray-100" : "text-white"}`}
              >
                {player.name}
              </span>

              {/* 티어 */}
              <span
                className={`text-sm font-semibold ${tierColors[player.tier] || "text-gray-400"}`}
              >
                {player.tier}
              </span>

              {/* MMR */}
              <span className="text-gray-500 text-xs">
                MMR {player.mmr}
              </span>

              {/* 팀장 뱃지 */}
              {isCaptain && (
                <span className="text-[10px] bg-white/15 text-gray-200 px-2 py-0.5 rounded-full font-semibold">
                  팀장
                </span>
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={onConfirm}
        disabled={selectedCount < 2}
        className="w-full py-3 bg-gray-100 hover:bg-white disabled:bg-gray-700 disabled:text-gray-500 text-gray-900 font-semibold rounded-lg transition-colors text-sm"
      >
        {selectedCount < 2
          ? `팀장을 ${2}명 이상 선택해주세요`
          : `팀장 ${selectedCount}명 확정 → 경매 시작`}
      </button>
    </div>
  );
}
