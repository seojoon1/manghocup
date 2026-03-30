import type { Player, Tier } from "~/types/player";
import { TIERS } from "~/types/player";

/**
 * CSV 텍스트를 Player 배열로 파싱.
 * 예상 컬럼: 이름, 티어, 메모(선택)
 * 첫 행이 헤더면 자동 스킵.
 */
export function parseCSV(raw: string): Player[] {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    throw new Error("CSV 데이터가 비어있습니다.");
  }

  // 첫 행이 헤더인지 판별 — 두 번째 컬럼이 티어 값이 아니면 헤더로 간주
  const firstCols = parseLine(lines[0]);
  const isHeader = firstCols.length >= 2 && !matchTier(firstCols[1]);

  const dataLines = isHeader ? lines.slice(1) : lines;

  return dataLines.map((line, i) => {
    const cols = parseLine(line);
    if (cols.length < 2) {
      throw new Error(`${i + 1}번째 행: 최소 이름, 티어가 필요합니다.`);
    }

    const name = cols[0].trim();
    const tier = matchTier(cols[1]);
    const memo = cols[2]?.trim() || "";

    if (!name) {
      throw new Error(`${i + 1}번째 행: 이름이 비어있습니다.`);
    }
    if (!tier) {
      throw new Error(
        `${i + 1}번째 행: "${cols[1]}" — 인식할 수 없는 티어입니다.`
      );
    }

    return {
      id: crypto.randomUUID(),
      name,
      tier,
      memo,
    };
  });
}

function parseLine(line: string): string[] {
  return line.split(/[,\t]/).map((c) => c.replace(/^["']|["']$/g, "").trim());
}

function matchTier(raw: string): Tier | null {
  const v = raw.trim().toLowerCase();
  for (const t of TIERS) {
    if (t.toLowerCase() === v) return t;
  }
  // 한글 매핑
  const koMap: Record<string, Tier> = {
    아이언: "Iron",
    브론즈: "Bronze",
    실버: "Silver",
    골드: "Gold",
    플래티넘: "Platinum",
    플레티넘: "Platinum",
    다이아몬드: "Diamond",
    다이아: "Diamond",
    메테오라이트: "Meteorite",
    메테오: "Meteorite",
    미스릴: "Mythril",
    타이탄: "Titan",
    이모탈: "Immortal",
    임모탈: "Immortal",
  };
  return koMap[v] || null;
}

/**
 * Google Sheets 공개 URL을 CSV export URL로 변환
 */
export function toGoogleSheetsCSVUrl(url: string): string {
  const match = url.match(
    /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/
  );
  if (match) {
    return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
  }
  return url;
}
