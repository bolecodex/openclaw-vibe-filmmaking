import { useState } from "react";
import useSWR from "swr";
import { api, type BatchTask } from "../lib/api-client";
import { TaskList } from "../components/batch/TaskList";
import { TaskProgress } from "../components/batch/TaskProgress";
import { ArrowLeft, Download, RefreshCw } from "lucide-react";

interface BatchJobDetailPageProps {
  jobId: string;
  onBack: () => void;
  onSelectTask: (task: BatchTask) => void;
}

export function BatchJobDetailPage({ jobId, onBack, onSelectTask }: BatchJobDetailPageProps) {
  const { data: jobData, error: jobError, mutate: mutateJob } = useSWR(
    ["batch-job", jobId],
    () => api.batch.getJob(jobId),
  );
  const { data: tasksData } = useSWR(
    ["batch-tasks", jobId],
    () => api.batch.getTasks(jobId, { limit: 200 }),
  );
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await api.batch.exportJob(jobId, "full");
      const status = await api.batch.exportStatus(jobId);
      if (status.status === "completed" || status.path) {
        window.open(`${window.location.origin}/api/batch/jobs/${jobId}/export/download`, "_blank");
      }
    } finally {
      setExporting(false);
    }
  };

  if (jobError || !jobData) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-red-400">
          {jobError ? (jobError as Error).message : "加载中…"}
        </p>
      </div>
    );
  }

  const tasks = tasksData?.tasks ?? [];

  return (
    <div className="flex flex-1 flex-col overflow-hidden p-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white"
        >
          <ArrowLeft size={16} />
          返回
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => mutateJob()}
            className="flex items-center gap-1 rounded px-2 py-1.5 text-xs text-gray-400 hover:bg-white/10 hover:text-white"
          >
            <RefreshCw size={14} />
            刷新
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 rounded-lg bg-accent/20 px-3 py-2 text-sm text-accent hover:bg-accent/30 disabled:opacity-50"
          >
            <Download size={16} />
            {exporting ? "导出中…" : "导出"}
          </button>
        </div>
      </div>
      <div className="mt-4 space-y-4 overflow-auto">
        <TaskProgress job={jobData} />
        <div>
          <h2 className="mb-2 text-sm font-medium text-gray-300">任务列表</h2>
          <TaskList tasks={tasks} onSelectTask={onSelectTask} />
        </div>
      </div>
    </div>
  );
}
