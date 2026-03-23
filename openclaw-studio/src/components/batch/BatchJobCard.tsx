import type { BatchJobSummary } from "../../lib/api-client";
import { Play, Pause, FolderOpen, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface BatchJobCardProps {
  job: BatchJobSummary;
  onSelect: () => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
}

export function BatchJobCard({ job, onSelect, onStart, onPause, onResume }: BatchJobCardProps) {
  const progress =
    job.totalTasks > 0
      ? Math.round((job.completedTasks / job.totalTasks) * 100)
      : 0;
  const isRunning = job.status === "running";
  const isPaused = job.status === "paused";
  const isPending = job.status === "pending";
  const canStart = isPending || isPaused;
  const canPause = isRunning;

  return (
    <div
      className="rounded-lg border border-white/10 bg-surface-1 p-3 transition-colors hover:bg-white/[0.04] cursor-pointer"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <FolderOpen size={16} className="shrink-0 text-gray-500" />
            <span className="truncate font-medium text-sm text-white">{job.name}</span>
          </div>
          <p className="mt-1 truncate text-xs text-gray-500">{job.inputFolder}</p>
          <div className="mt-2 flex items-center gap-3 text-xs">
            <span className="text-gray-400">
              {job.completedTasks}/{job.totalTasks} 任务
            </span>
            {job.failedTasks > 0 && (
              <span className="text-red-400">{job.failedTasks} 失败</span>
            )}
            <span className="capitalize text-gray-500">{job.status}</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {canStart && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onStart(); }}
              className="flex h-8 w-8 items-center justify-center rounded bg-accent/20 text-accent hover:bg-accent/30"
              title="启动"
            >
              <Play size={14} />
            </button>
          )}
          {canPause && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onPause(); }}
              className="flex h-8 w-8 items-center justify-center rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
              title="暂停"
            >
              <Pause size={14} />
            </button>
          )}
          {isPaused && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onResume(); }}
              className="flex h-8 w-8 items-center justify-center rounded bg-accent/20 text-accent hover:bg-accent/30"
              title="恢复"
            >
              <Play size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
