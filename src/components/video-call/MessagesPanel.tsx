import type { ChatMessage } from "./types";
import { useEffect, useRef } from "react";

type MessagesPanelProps = {
  visible: boolean;
  messages: ChatMessage[];
  inputMessage: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  localSenderName: string;
};

export default function MessagesPanel({
  visible,
  messages,
  inputMessage,
  onInputChange,
  onSend,
  localSenderName,
}: MessagesPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, visible]);

  if (!visible) return null;

  return (
    <div className="absolute top-[8.4rem] right-6 z-50 w-[26rem] max-w-[92vw] overflow-hidden rounded-3xl border border-white/10 bg-white/5 text-white shadow-2xl backdrop-blur-xl">
      <div className="relative p-5">
        <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-linear-to-br from-rose-500/20 to-amber-400/10 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/80">
            <span className="h-2 w-2 rounded-full bg-rose-400" />
            Messages
          </div>
          <div className="text-xs text-white/50">{messages.length} total</div>
        </div>
      </div>

      <div className="px-5 pb-5 space-y-3">
        <div className="lg:min-h-155 lg:max-h-155 max-h-50 min-h-50 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-3">
          {messages.map((msg, i) => (
            <div key={i} className={msg.sender === localSenderName ? "text-right" : "text-left"}>
              <span
                className={`inline-block max-w-[85%] px-3 py-2 rounded-2xl mt-2 text-sm border ${
                  msg.sender === localSenderName
                    ? "bg-emerald-400/15 border-emerald-400/20 text-emerald-100"
                    : "bg-white/10 border-white/10 text-white/90"
                }`}
              >
                <span className="block text-[11px] mb-0.5 text-white/60">{msg.sender}</span>
                {msg.text}
              </span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSend()}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-emerald-400/30"
            placeholder="Type a message..."
          />
          <button
            onClick={onSend}
            className="rounded-xl border border-emerald-400/30 bg-emerald-400/15 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/20 active:scale-[0.99]"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
