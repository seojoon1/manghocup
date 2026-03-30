import type { Team } from "~/types/player";
import { TIER_SCORES } from "~/types/player";

interface TeamDisplayProps {
  team: Team;
  teamName: string;
  color: "blue" | "red";
}

const tierColors: Record<string, string> = {
  Iron: "text-gray-400",
  Bronze: "text-amber-700",
  Silver: "text-gray-300",
  Gold: "text-yellow-400",
  Platinum: "text-teal-300",
  Emerald: "text-emerald-400",
  Diamond: "text-blue-300",
  Master: "text-purple-400",
  Grandmaster: "text-red-400",
  Challenger: "text-amber-300",
};

export function TeamDisplay({ team, teamName, color }: TeamDisplayProps) {
  const borderColor = color === "blue" ? "border-blue-500" : "border-red-500";
  const headerBg = color === "blue" ? "bg-blue-500/20" : "bg-red-500/20";
  const headerText = color === "blue" ? "text-blue-400" : "text-red-400";

  return (
    <div className={`border-2 ${borderColor} rounded-lg overflow-hidden`}>
      <div className={`${headerBg} px-4 py-3 flex items-center justify-between`}>
        <h3 className={`text-lg font-bold ${headerText}`}>{teamName}</h3>
        <span className="text-gray-300 text-sm font-mono">
          총 점수: {team.totalScore}
        </span>
      </div>
      <div className="divide-y divide-gray-700">
        {team.players.map((player, i) => (
          <div
            key={player.id}
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors"
          >
            <span className="text-gray-500 text-sm font-mono w-5">
              {i + 1}
            </span>
            <span className="font-medium text-white min-w-[100px]">
              {player.name}
            </span>
            <span
              className={`text-sm font-semibold min-w-[80px] ${
                tierColors[player.tier] || "text-gray-300"
              }`}
            >
              {player.tier}
            </span>
            <span className="text-gray-400 text-sm min-w-[70px]">
              {player.position}
            </span>
            {player.memo && (
              <span className="text-gray-500 text-xs ml-auto truncate max-w-[150px]">
                {player.memo}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
