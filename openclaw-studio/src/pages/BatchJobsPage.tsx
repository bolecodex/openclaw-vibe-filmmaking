import { useState } from "react";
import useSWR from "swr";
import { api, type BatchJobSummary } from "../lib/api-client";
import { BatchJobCard } from "../components/batch/BatchJobCard";
import { Plus, FolderOpen } from "lucide-react";

interface BatchJobsPageProps {
  onSelectJob: (jobId: string) => void;
  onCreateJob: () => void;
}

export function BatchJobsPage({ onSelectJob, onCreateJob }: BatchJobsPageProps) {
  const { data, error, mutate } = useSWR("batch-jobs", () => api.batch.listJobs(50));
  const [starting, setStarting] = useState<string | null>(null);
  const [pausing, setPausing] = useState<string | null>(null);
  const [resuming, setResuming] = useState<string | null>(null);

  const handleStart = async (jobId: string) => {
    setStarting(jobId);
    try {
      await api.batch.startJob(jobId);
      await mutate();
    } finally {
      setStarting(null);
    }
  };

  const handlePause = async (jobId: string) => {
    setPausing(jobId);
    try {
      await api.batch.pauseJob(jobId);
      await mutate();
    } finally {
      setPausing(null);
    }
  };

  const handleResume = async (jobId: string) => {
    setResuming(jobId);
    try {
      await api.batch.resumeJob(jobId);
      await mutate();
    } finally {
      setResuming(null);
    }
  };

  if (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "未知错误";
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-sm font-medium text-red-400">加载失败</p>
          <p className="mt-1 text-xs text-red-300/80">{errorMessage}</p>
          <p className="mt-2 text-xs text-gray-500">
            请确认后端服务在 <code className="rounded bg-black/30 px-1">localhost:3001</code> 运行
          </p>
        </div>
        <button
          type="button"
          onClick={() => mutate()}
          className="rounded-lg bg-accent/20 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/30"
        >
          重试
        </button>
      </div>
    );
  }

  const jobs = data?.jobs ?? [];

  return (
    <div className="flex flex-1 flex-col overflow-hidden p-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <h1 className="text-lg font-semibold text-white">批量任务</h1>
        <button
          type="button"
          onClick={onCreateJob}
          className="flex items-center gap-2 rounded-lg bg-accent/20 px-3 py-2 text-sm font-medium text-accent hover:bg-accent/30"
        >
          <Plus size={16} />
          新建批量任务
        </button>
      </div>
      <div className="mt-4 flex flex-col gap-3 overflow-auto">
        {jobs.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/10 bg-surface-1/50 py-12">
            <FolderOpen size={40} className="text-gray-600" />
            <p className="text-sm text-gray-500">暂无批量任务</p>
            <button
              type="button"
              onClick={onCreateJob}
              className="mt-2 text-sm text-accent hover:underline"
            >
              从文件夹创建批量任务
            </button>
          </div>
        ) : (
          jobs.map((job: BatchJobSummary) => (
            <BatchJobCard
              key={job.id}
              job={job}
              onSelect={() => onSelectJob(job.id)}
              onStart={() => handleStart(job.id)}
              onPause={() => handlePause(job.id)}
              onResume={() => handleResume(job.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
