import { useState } from "react";
import { X } from "lucide-react";
import { api } from "../../lib/api-client";

interface CreateBatchJobModalProps {
  onClose: () => void;
  onCreated: (jobId: string) => void;
}

export function CreateBatchJobModal({ onClose, onCreated }: CreateBatchJobModalProps) {
  const [name, setName] = useState("");
  const [inputFolder, setInputFolder] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim() || !inputFolder.trim()) {
      setError("请填写任务名称和输入文件夹路径");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const job = await api.batch.createJob({ name: name.trim(), inputFolder: inputFolder.trim() });
      onCreated(job.id);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-surface-1 p-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h2 className="text-lg font-semibold text-white">新建批量任务</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-500 hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-400">任务名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：100部剧"
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400">输入文件夹路径</label>
            <input
              type="text"
              value={inputFolder}
              onChange={(e) => setInputFolder(e.target.value)}
              placeholder="绝对路径或相对于工作区的路径"
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 outline-none focus:ring-1 focus:ring-accent"
            />
            <p className="mt-1 text-xs text-gray-500">文件夹内需包含 .md 或 .txt 小说文件</p>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-white/10"
          >
            取消
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
          >
            {loading ? "创建中…" : "创建"}
          </button>
        </div>
      </div>
    </div>
  );
}
