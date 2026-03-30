import { useState, useCallback } from "react";
import type { Player, Tier, Position } from "~/types/player";
import { TIERS, POSITIONS } from "~/types/player";

interface SpreadsheetProps {
  players: Player[];
  onChange: (players: Player[]) => void;
}

function createEmptyPlayer(index: number): Player {
  return {
    id: crypto.randomUUID(),
    name: "",
    tier: "Gold",
    position: POSITIONS[index % 5],
    memo: "",
  };
}

export function Spreadsheet({ players, onChange }: SpreadsheetProps) {
  const [focusedCell, setFocusedCell] = useState<{
    row: number;
    col: number;
  } | null>(null);

  const updatePlayer = useCallback(
    (index: number, field: keyof Player, value: string) => {
      const updated = [...players];
      updated[index] = { ...updated[index], [field]: value };
      onChange(updated);
    },
    [players, onChange]
  );

  const addPlayer = useCallback(() => {
    if (players.length >= 10) return;
    onChange([...players, createEmptyPlayer(players.length)]);
  }, [players, onChange]);

  const removePlayer = useCallback(
    (index: number) => {
      onChange(players.filter((_, i) => i !== index));
    },
    [players, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, row: number, col: number) => {
      const maxRow = players.length - 1;
      const maxCol = 3; // name, tier, position, memo

      let nextRow = row;
      let nextCol = col;

      switch (e.key) {
        case "ArrowDown":
        case "Enter":
          e.preventDefault();
          nextRow = Math.min(row + 1, maxRow);
          break;
        case "ArrowUp":
          e.preventDefault();
          nextRow = Math.max(row - 1, 0);
          break;
        case "Tab":
          e.preventDefault();
          if (e.shiftKey) {
            nextCol = col - 1;
            if (nextCol < 0) {
              nextCol = maxCol;
              nextRow = Math.max(row - 1, 0);
            }
          } else {
            nextCol = col + 1;
            if (nextCol > maxCol) {
              nextCol = 0;
              nextRow = Math.min(row + 1, maxRow);
            }
          }
          break;
        default:
          return;
      }

      setFocusedCell({ row: nextRow, col: nextCol });
      const cellId = `cell-${nextRow}-${nextCol}`;
      setTimeout(() => {
        const el = document.getElementById(cellId);
        el?.focus();
      }, 0);
    },
    [players.length]
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-800 text-gray-200 text-sm">
            <th className="border border-gray-700 px-3 py-2 w-10 text-center">
              #
            </th>
            <th className="border border-gray-700 px-3 py-2 min-w-[140px] text-left">
              이름
            </th>
            <th className="border border-gray-700 px-3 py-2 min-w-[120px] text-left">
              티어
            </th>
            <th className="border border-gray-700 px-3 py-2 min-w-[110px] text-left">
              포지션
            </th>
            <th className="border border-gray-700 px-3 py-2 min-w-[160px] text-left">
              메모
            </th>
            <th className="border border-gray-700 px-3 py-2 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {players.map((player, rowIndex) => (
            <tr
              key={player.id}
              className={`${
                rowIndex % 2 === 0 ? "bg-gray-900" : "bg-gray-850"
              } hover:bg-gray-800 transition-colors`}
            >
              <td className="border border-gray-700 px-3 py-1 text-center text-gray-400 text-sm font-mono">
                {rowIndex + 1}
              </td>
              <td className="border border-gray-700 p-0">
                <input
                  id={`cell-${rowIndex}-0`}
                  type="text"
                  value={player.name}
                  onChange={(e) =>
                    updatePlayer(rowIndex, "name", e.target.value)
                  }
                  onKeyDown={(e) => handleKeyDown(e, rowIndex, 0)}
                  onFocus={() => setFocusedCell({ row: rowIndex, col: 0 })}
                  placeholder="플레이어 이름"
                  className={`w-full bg-transparent px-3 py-2 text-white outline-none text-sm ${
                    focusedCell?.row === rowIndex && focusedCell?.col === 0
                      ? "ring-2 ring-blue-500 ring-inset"
                      : ""
                  }`}
                />
              </td>
              <td className="border border-gray-700 p-0">
                <select
                  id={`cell-${rowIndex}-1`}
                  value={player.tier}
                  onChange={(e) =>
                    updatePlayer(rowIndex, "tier", e.target.value as Tier)
                  }
                  onKeyDown={(e) => handleKeyDown(e, rowIndex, 1)}
                  onFocus={() => setFocusedCell({ row: rowIndex, col: 1 })}
                  className={`w-full bg-transparent px-3 py-2 text-white outline-none text-sm cursor-pointer ${
                    focusedCell?.row === rowIndex && focusedCell?.col === 1
                      ? "ring-2 ring-blue-500 ring-inset"
                      : ""
                  }`}
                >
                  {TIERS.map((tier) => (
                    <option key={tier} value={tier} className="bg-gray-800">
                      {tier}
                    </option>
                  ))}
                </select>
              </td>
              <td className="border border-gray-700 p-0">
                <select
                  id={`cell-${rowIndex}-2`}
                  value={player.position}
                  onChange={(e) =>
                    updatePlayer(
                      rowIndex,
                      "position",
                      e.target.value as Position
                    )
                  }
                  onKeyDown={(e) => handleKeyDown(e, rowIndex, 2)}
                  onFocus={() => setFocusedCell({ row: rowIndex, col: 2 })}
                  className={`w-full bg-transparent px-3 py-2 text-white outline-none text-sm cursor-pointer ${
                    focusedCell?.row === rowIndex && focusedCell?.col === 2
                      ? "ring-2 ring-blue-500 ring-inset"
                      : ""
                  }`}
                >
                  {POSITIONS.map((pos) => (
                    <option key={pos} value={pos} className="bg-gray-800">
                      {pos}
                    </option>
                  ))}
                </select>
              </td>
              <td className="border border-gray-700 p-0">
                <input
                  id={`cell-${rowIndex}-3`}
                  type="text"
                  value={player.memo}
                  onChange={(e) =>
                    updatePlayer(rowIndex, "memo", e.target.value)
                  }
                  onKeyDown={(e) => handleKeyDown(e, rowIndex, 3)}
                  onFocus={() => setFocusedCell({ row: rowIndex, col: 3 })}
                  placeholder="메모"
                  className={`w-full bg-transparent px-3 py-2 text-white outline-none text-sm ${
                    focusedCell?.row === rowIndex && focusedCell?.col === 3
                      ? "ring-2 ring-blue-500 ring-inset"
                      : ""
                  }`}
                />
              </td>
              <td className="border border-gray-700 px-2 py-1 text-center">
                <button
                  onClick={() => removePlayer(rowIndex)}
                  className="text-gray-500 hover:text-red-400 transition-colors text-sm"
                  title="삭제"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {players.length < 10 && (
        <button
          onClick={addPlayer}
          className="mt-2 w-full py-2 border border-dashed border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-colors rounded text-sm"
        >
          + 플레이어 추가 ({players.length}/10)
        </button>
      )}

      {players.length === 10 && (
        <p className="mt-2 text-center text-green-400 text-sm">
          10명 모두 입력 완료!
        </p>
      )}
    </div>
  );
}
