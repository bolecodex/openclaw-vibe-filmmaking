import type { BatchJobSummary } from "../../lib/api-client";

interface TaskProgressProps {
  job: BatchJobSummary;
}

export function TaskProgress({ job }: TaskProgressProps) {
  const progress =
    job.totalTasks > 0
      ? Math.round((job.completedTasks / job.totalTasks) * 100)
      : 0;
  return (
    <div className="rounded-lg border border-white/10 bg-surface-1 p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">整体进度</span>
        <span className="font-medium text-white">{progress}%</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-2 flex gap-4 text-xs text-gray-500">
        <span>完成 {job.completedTasks}</span>
        <span>失败 {job.failedTasks}</span>
        <span>待处理 {job.pendingTasks}</span>
        <span>运行中 {job.runningTasks}</span>
      </div>
    </div>
  );
}
