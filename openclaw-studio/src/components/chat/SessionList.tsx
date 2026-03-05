import { useState, useRef, useEffect } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { useChatStore, type ChatSession } from "../../stores/chat-store";

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins}分钟前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}小时前`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}天前`;
  return new Date(ts).toLocaleDateString("zh-CN");
}

function formatTokenCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 100_000) return `${(n / 1000).toFixed(1)}k`;
  return `${Math.round(n / 1000)}k`;
}

interface Props {
  sessions: ChatSession[];
  activeId: string | null;
  projectPath: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onClose: () => void;
}

export function SessionList({ sessions, activeId, projectPath, onSelect, onCreate, onClose }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const removeSession = useChatStore((s) => s.removeSession);
  const renameSession = useChatStore((s) => s.renameSession);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const startRename = (session: ChatSession) => {
    setEditingId(session.id);
    setEditValue(session.title || "");
  };

  const confirmRename = () => {
    if (editingId && editValue.trim()) {
      renameSession(projectPath, editingId, editValue.trim());
      fetch(`/api/sessions/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editValue.trim(), projectPath }),
      }).catch(() => {});
    }
    setEditingId(null);
  };

  const handleDelete = async (sessionId: string) => {
    removeSession(projectPath, sessionId);
    try {
      await fetch(`/api/sessions/${sessionId}?project=${encodeURIComponent(projectPath)}`, {
        method: "DELETE",
      });
    } catch { /* best-effort */ }
  };

  return (
    <div className="absolute inset-x-0 top-full z-50 max-h-80 overflow-auto border-b border-white/5 bg-surface-1 shadow-xl">
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
          会话列表
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onCreate}
            className="rounded p-1 text-gray-500 hover:bg-white/10 hover:text-gray-300"
            title="新建对话"
          >
            <Plus size={12} />
          </button>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-500 hover:bg-white/10 hover:text-gray-300"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="px-3 py-4 text-center text-xs text-gray-600">
          暂无会话
        </div>
      ) : (
        <div className="py-1">
          {sessions.map((session) => {
            const isActive = session.id === activeId;
            const isEditing = editingId === session.id;

            return (
              <div
                key={session.id}
                className={`group flex items-center gap-2 px-3 py-1.5 text-xs ${
                  isActive ? "bg-accent/10 text-white" : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                } cursor-pointer`}
                onClick={() => !isEditing && onSelect(session.id)}
              >
                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        ref={inputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") confirmRename();
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="min-w-0 flex-1 rounded bg-surface-2 px-1.5 py-0.5 text-xs outline-none"
                      />
                      <button onClick={confirmRename} className="text-emerald-400 hover:text-emerald-300">
                        <Check size={11} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="truncate font-medium">
                        {session.title || "新对话"}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500">
                        <span>{formatRelativeTime(session.updatedAt)}</span>
                        {session.tokenUsage.total > 0 && (
                          <span>{formatTokenCount(session.tokenUsage.total)} tokens</span>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {!isEditing && (
                  <div
                    className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => startRename(session)}
                      className="rounded p-0.5 text-gray-500 hover:text-gray-300"
                      title="重命名"
                    >
                      <Pencil size={10} />
                    </button>
                    <button
                      onClick={() => handleDelete(session.id)}
                      className="rounded p-0.5 text-gray-500 hover:text-red-400"
                      title="删除"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
