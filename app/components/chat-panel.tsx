import { useEffect, useRef } from "react";
import type { ChatMessage } from "~/hooks/useRemoteChat";

interface ChatPanelProps {
  messages: ChatMessage[];
}

export function ChatPanel({ messages }: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <aside className="hidden lg:flex lg:flex-col w-80 shrink-0 self-start sticky top-24 max-h-[calc(100vh-7rem)] rounded-2xl border border-gray-800 bg-gray-900">
      <div className="px-4 py-3 border-b border-gray-800 text-sm font-semibold text-gray-300">
        실시간 채팅
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {messages.length === 0 ? (
          <div className="text-center text-gray-600 text-xs py-8">
            아직 채팅이 없습니다.
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="text-sm leading-snug">
              <span className="font-semibold text-gray-400">{m.username}</span>
              <span className="text-gray-600"> · </span>
              <span className="text-gray-200 break-words whitespace-pre-wrap">
                {m.message}
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </aside>
  );
}
