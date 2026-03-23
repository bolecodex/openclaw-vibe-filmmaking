import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";

const BASE = "/api";

interface BatchChatProps {
  taskId: string;
  projectName: string;
}

export function BatchChat({ taskId, projectName }: BatchChatProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setStreaming(true);
    let assistantContent = "";
    setMessages((m) => [...m, { role: "assistant", content: "" }]);

    try {
      const res = await fetch(`${BASE}/batch/tasks/${encodeURIComponent(taskId)}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) throw new Error(await res.text());
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No body");
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "text" && parsed.content) {
                assistantContent += parsed.content;
                setMessages((m) => {
                  const next = [...m];
                  const last = next[next.length - 1];
                  if (last?.role === "assistant") {
                    next[next.length - 1] = { ...last, content: assistantContent };
                  }
                  return next;
                });
              }
            } catch { /* ignore */ }
          }
        }
      }
    } catch (err) {
      setMessages((m) => {
        const next = [...m];
        const last = next[next.length - 1];
        if (last?.role === "assistant") {
          next[next.length - 1] = { ...last, content: (err as Error).message };
        }
        return next;
      });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-white/10 bg-surface-1">
      <div className="border-b border-white/10 px-3 py-2 text-sm font-medium text-gray-300">
        与龙虾对话 · {projectName}
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-500">输入指令修改剧本、分镜或任意内容</p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`rounded-lg px-3 py-2 text-sm ${
              msg.role === "user"
                ? "ml-8 bg-accent/20 text-accent"
                : "mr-8 bg-white/5 text-gray-200"
            }`}
          >
            {msg.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 border-t border-white/10 p-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="输入修改指令…"
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          type="button"
          onClick={send}
          disabled={streaming || !input.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-white disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
