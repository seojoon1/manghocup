import type { Captain } from "~/types/player";

interface DraftResultProps {
  captains: Captain[];
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

export function DraftResult({ captains }: DraftResultProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-center text-white">경매 결과</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {captains.map((captain, i) => (
          <div
            key={captain.player.id}
            className="border border-gray-700 rounded-lg overflow-hidden bg-gray-900"
          >
            <div className="bg-gray-800 px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-gray-200">
                  팀 {i + 1}
                </div>
              </div>
              <span className="text-yellow-400 text-xs font-mono">
                잔액: {captain.budget}원
              </span>
            </div>
            <div className="divide-y divide-gray-800">
              {/* Captain */}
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/30">
                <span className="text-yellow-500 text-xs">★</span>
                <span className="font-medium text-white text-sm">
                  {captain.player.name}
                </span>
                <span
                  className={`text-xs ml-auto ${tierColors[captain.player.tier] || "text-gray-400"}`}
                >
                  {captain.player.tier}
                </span>
              </div>
              {/* Members */}
              {captain.members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-2 px-4 py-2"
                >
                  <span className="font-medium text-white text-sm">
                    {m.name}
                  </span>
                  <span
                    className={`text-xs ml-auto ${tierColors[m.tier] || "text-gray-400"}`}
                  >
                    {m.tier}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
