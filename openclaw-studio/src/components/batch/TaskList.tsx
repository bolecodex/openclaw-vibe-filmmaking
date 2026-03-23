import type { BatchTask } from "../../lib/api-client";
import { CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react";

interface TaskListProps {
  tasks: BatchTask[];
  onSelectTask: (task: BatchTask) => void;
}

export function TaskList({ tasks, onSelectTask }: TaskListProps) {
  return (
    <div className="flex flex-col gap-1 overflow-auto">
      {tasks.map((task) => {
        const isCompleted = task.status === "completed";
        const isFailed = task.status === "failed";
        const isRunning = task.status === "running" || task.status === "queued";
        return (
          <button
            key={task.id}
            type="button"
            onClick={() => onSelectTask(task)}
            className="flex items-center gap-3 rounded-lg border border-white/10 bg-surface-1 px-3 py-2 text-left transition-colors hover:bg-white/[0.04]"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center">
              {isCompleted && <CheckCircle size={18} className="text-green-500" />}
              {isFailed && <XCircle size={18} className="text-red-400" />}
              {isRunning && <Loader2 size={18} className="animate-spin text-amber-400" />}
              {!isCompleted && !isFailed && !isRunning && (
                <AlertCircle size={18} className="text-gray-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{task.projectName}</p>
              <p className="truncate text-xs text-gray-500">{task.novelFile}</p>
            </div>
            <div className="shrink-0 text-right">
              <span className="text-xs text-gray-400">{task.progress}%</span>
              <p className="text-xs capitalize text-gray-500">{task.status}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
