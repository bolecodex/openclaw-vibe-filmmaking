import { useState, useEffect, useCallback } from "react";
import { FolderOpen, ChevronUp, Plus, X } from "lucide-react";
import { api } from "../../lib/api-client";
import type { DirListing } from "../../lib/types";

interface FolderPickerModalProps {
  mode: "open" | "create";
  onSelect: (path: string) => void;
  onCancel: () => void;
}

export function FolderPickerModal({
  mode,
  onSelect,
  onCancel,
}: FolderPickerModalProps) {
  const [listing, setListing] = useState<DirListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [manualPath, setManualPath] = useState("");

  const navigateTo = useCallback(async (path?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.workspace.listDirs(path);
      setListing(data);
      setManualPath(data.current);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    navigateTo();
  }, [navigateTo]);

  function handleConfirm() {
    if (!listing) return;
    if (mode === "create" && newFolderName.trim()) {
      onSelect(`${listing.current}/${newFolderName.trim()}`);
    } else {
      onSelect(listing.current);
    }
  }

  function handleManualGo() {
    const p = manualPath.trim();
    if (p) navigateTo(p);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="flex max-h-[70vh] w-[520px] flex-col rounded-lg border border-white/10 bg-surface-1 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
          <h3 className="text-sm font-medium text-gray-200">
            {mode === "create" ? "新建工作空间" : "打开工作空间"}
          </h3>
          <button
            onClick={onCancel}
            className="rounded p-1 text-gray-500 hover:bg-white/10 hover:text-gray-300"
          >
            <X size={14} />
          </button>
        </div>

        {/* Path bar */}
        <div className="flex items-center gap-1 border-b border-white/5 px-3 py-2">
          {listing?.parent && (
            <button
              onClick={() => navigateTo(listing.parent!)}
              className="shrink-0 rounded p-1 text-gray-500 hover:bg-white/10 hover:text-gray-300"
              title="上级目录"
            >
              <ChevronUp size={14} />
            </button>
          )}
          <input
            value={manualPath}
            onChange={(e) => setManualPath(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleManualGo();
            }}
            className="flex-1 rounded bg-surface-2 px-2 py-1 text-xs text-gray-200 outline-none ring-1 ring-white/10 focus:ring-accent/50"
          />
          <button
            onClick={handleManualGo}
            className="shrink-0 rounded bg-surface-2 px-2 py-1 text-[10px] text-gray-400 hover:bg-white/10 hover:text-gray-300"
          >
            前往
          </button>
        </div>

        {/* Directory list */}
        <div className="flex-1 overflow-auto px-2 py-1" style={{ minHeight: 200 }}>
          {loading && (
            <p className="py-4 text-center text-xs text-gray-500 animate-pulse">
              加载中...
            </p>
          )}
          {error && (
            <p className="py-4 text-center text-xs text-red-400">{error}</p>
          )}
          {!loading && !error && listing && listing.dirs.length === 0 && (
            <p className="py-4 text-center text-xs text-gray-600">
              空目录
            </p>
          )}
          {!loading &&
            !error &&
            listing?.dirs.map((dir) => (
              <button
                key={dir.path}
                onClick={() => navigateTo(dir.path)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-gray-300 hover:bg-white/5"
              >
                <FolderOpen size={14} className="shrink-0 text-accent/70" />
                <span className="truncate">{dir.name}</span>
              </button>
            ))}
        </div>

        {/* New folder input for create mode */}
        {mode === "create" && (
          <div className="border-t border-white/5 px-3 py-2">
            {!showNewFolder ? (
              <button
                onClick={() => setShowNewFolder(true)}
                className="flex items-center gap-1 text-xs text-accent hover:text-accent/80"
              >
                <Plus size={12} /> 在此处新建文件夹
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-gray-500">新文件夹名:</span>
                <input
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleConfirm();
                    if (e.key === "Escape") {
                      setShowNewFolder(false);
                      setNewFolderName("");
                    }
                  }}
                  className="flex-1 rounded bg-surface-2 px-2 py-0.5 text-xs text-gray-200 outline-none ring-1 ring-accent/40"
                  placeholder="my-workspace"
                />
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/5 px-4 py-3">
          <span className="max-w-[300px] truncate text-[10px] text-gray-500" title={listing?.current}>
            {listing?.current ?? ""}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="rounded px-3 py-1 text-xs text-gray-400 hover:bg-white/10 hover:text-gray-300"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={!listing}
              className="rounded bg-accent/20 px-3 py-1 text-xs text-accent hover:bg-accent/30 disabled:opacity-40"
            >
              {mode === "create"
                ? newFolderName.trim()
                  ? "创建并选择"
                  : "选择此目录"
                : "选择此目录"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
