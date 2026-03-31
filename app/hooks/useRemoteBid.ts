import { useEffect } from "react";
import type { Captain } from "~/types/player";

interface BidMessage {
  type: "bid";
  team: string;
  amount: number;
}

export function useRemoteBid(
  captains: Captain[],
  onRemoteBid: (captainIndex: number, amount: number) => void,
  enabled: boolean = true
) {
  useEffect(() => {
    const wsUrl = "ws://localhost:8000/ws";
    // console.log(`🔌 WebSocket 연결 시도: ${wsUrl}`);

    const ws = new WebSocket(wsUrl);

    const handleOpen = () => {
      // console.log("✅ WebSocket 연결 성공!");
    };

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as BidMessage;
        console.log("📨 원격 입찰 수신:", data);

        if (data.type !== "bid") {
          return;
        }

        // "팀1" → 0, "팀2" → 1 변환
        const teamMatch = data.team.match(/팀(\d+)/);
        if (!teamMatch) {
          console.warn(`❌ 팀 형식 오류: ${data.team}`);
          return;
        }

        const captainIndex = parseInt(teamMatch[1]) - 1;

        if (captainIndex < 0 || captainIndex >= captains.length) {
          console.warn(
            `❌ 팀 인덱스 범위 오류: ${captainIndex} (총 ${captains.length}팀)`
          );
          return;
        }

        console.log(`✨ 팀${captainIndex + 1}이 ${data.amount}원 입찰`);
        onRemoteBid(captainIndex, data.amount);
      } catch (error) {
        console.error("❌ 입찰 메시지 파싱 실패:", error);
      }
    };

    const handleError = (error: Event) => {
      console.error("❌ WebSocket 에러:", error);
    };

    const handleClose = () => {
      console.log("🔌 WebSocket 연결 종료");
    };

    ws.addEventListener("open", handleOpen);
    ws.addEventListener("message", handleMessage);
    ws.addEventListener("error", handleError);
    ws.addEventListener("close", handleClose);

    return () => {
      ws.removeEventListener("open", handleOpen);
      ws.removeEventListener("message", handleMessage);
      ws.removeEventListener("error", handleError);
      ws.removeEventListener("close", handleClose);
      ws.close();
    };
  }, [captains, onRemoteBid, enabled]);
}
