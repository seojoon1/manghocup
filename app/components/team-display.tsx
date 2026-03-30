import type { Team } from "~/types/player";

interface TeamDisplayProps {
  team: Team;
  teamNumber: number;
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

export function TeamDisplay({ team, teamNumber }: TeamDisplayProps) {
  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden bg-gray-900">
      <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-200">
          팀 {teamNumber}
        </h3>
        <span className="text-gray-400 text-xs font-mono">
          {team.totalScore}점
        </span>
      </div>
      <div className="divide-y divide-gray-800">
        {team.players.map((player) => (
          <div
            key={player.id}
            className="flex items-center gap-3 px-4 py-2"
          >
            <span className="font-medium text-white text-sm flex-1">
              {player.name}
            </span>
            <span
              className={`text-xs font-semibold ${
                tierColors[player.tier] || "text-gray-300"
              }`}
            >
              {player.tier}
            </span>
            {player.memo && (
              <span className="text-gray-500 text-xs truncate max-w-[100px]">
                {player.memo}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
