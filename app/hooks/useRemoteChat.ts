import { useEffect, useState } from "react";

export interface ChatMessage {
  id: string;
  username: string;
  message: string;
}

const MAX_MESSAGES = 100;

/**
 * 백엔드 /ws 로부터 type === "chat" 메시지를 수신해 누적한다.
 * (디스코드 봇이 POST /api/chat 으로 보내면 broadcast 되어 들어옴)
 */
export function useRemoteChat(enabled: boolean = true): ChatMessage[] {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const wsUrl = "ws://localhost:8000/ws";
    const ws = new WebSocket(wsUrl);

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.type !== "chat") {
          return;
        }
        setMessages((prev) =>
          [
            ...prev,
            {
              id: crypto.randomUUID(),
              username: String(data.username ?? "익명"),
              message: String(data.message ?? ""),
            },
          ].slice(-MAX_MESSAGES)
        );
      } catch (error) {
        console.error("❌ 채팅 메시지 파싱 실패:", error);
      }
    };

    ws.addEventListener("message", handleMessage);

    return () => {
      ws.removeEventListener("message", handleMessage);
      ws.close();
    };
  }, [enabled]);

  return messages;
}
