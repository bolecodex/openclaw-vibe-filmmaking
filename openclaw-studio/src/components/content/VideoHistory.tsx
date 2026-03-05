import { useState, useCallback } from "react";
import useSWR from "swr";
import { api } from "../../lib/api-client";
import {
  Video,
  Play,
  Download,
  Trash2,
  Inbox,
  Clock,
  HardDrive,
  X,
} from "lucide-react";

interface VideoFile {
  name: string;
  path: string;
  size: number;
  mtime: string;
  duration: number | null;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  if (m > 0) return `${m}:${s.toString().padStart(2, "0")}`;
  return `0:${s.toString().padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function VideoPlayer({
  video,
  onClose,
}: {
  video: VideoFile;
  onClose: () => void;
}) {
  const src = `/api/workspace/file-raw?path=${encodeURIComponent(video.path)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -right-3 -top-3 z-10 rounded-full bg-surface-2 p-1.5 text-gray-400 hover:text-white"
        >
          <X size={16} />
        </button>
        <video
          src={src}
          controls
          autoPlay
          className="max-h-[85vh] rounded-lg"
        />
        <div className="mt-2 text-center text-xs text-gray-400">
          {video.name}
        </div>
      </div>
    </div>
  );
}

export function VideoHistory({
  project,
  onSwitchToExport,
}: {
  project: string;
  onSwitchToExport?: () => void;
}) {
  const { data, isLoading, mutate } = useSWR(
    `render-history-${project}`,
    () => api.render.history(project),
    { refreshInterval: 10000 },
  );

  const [playingVideo, setPlayingVideo] = useState<VideoFile | null>(null);

  const videos = data?.videos ?? [];

  const handleDelete = useCallback(
    async (video: VideoFile) => {
      if (!confirm(`确定删除 ${video.name}？`)) return;
      try {
        await fetch(
          `/api/workspace/file?path=${encodeURIComponent(video.path)}`,
          { method: "DELETE" },
        );
        mutate();
      } catch {}
    },
    [mutate],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-600">
        <span className="text-sm">加载中...</span>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-gray-600">
        <Inbox size={32} strokeWidth={1} />
        <p className="text-sm">暂无已渲染视频</p>
        <p className="text-xs">在「导出」标签中配置并渲染视频</p>
        {onSwitchToExport && (
          <button
            onClick={onSwitchToExport}
            className="mt-2 rounded bg-accent/20 px-4 py-1.5 text-xs text-accent hover:bg-accent/30"
          >
            去导出
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2">
        <Video size={14} className="text-accent" />
        <span className="text-xs font-medium text-gray-300">
          已渲染视频 ({videos.length})
        </span>
      </div>

      <div className="flex flex-col gap-3 p-4">
        {videos.map((video) => (
          <div
            key={video.name}
            className="flex items-center gap-4 rounded-lg border border-white/5 bg-surface-2 p-4 transition-colors hover:border-white/10"
          >
            <button
              onClick={() => setPlayingVideo(video)}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent hover:bg-accent/20"
            >
              <Play size={18} className="ml-0.5" />
            </button>

            <div className="flex flex-1 flex-col gap-1 min-w-0">
              <p className="truncate text-sm text-gray-200">{video.name}</p>
              <div className="flex items-center gap-3 text-[10px] text-gray-500">
                {video.duration != null && (
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {formatDuration(video.duration)}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <HardDrive size={10} />
                  {formatSize(video.size)}
                </span>
                <span>{formatDate(video.mtime)}</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <a
                href={`/api/workspace/file-raw?path=${encodeURIComponent(video.path)}`}
                download
                className="rounded p-1.5 text-gray-500 hover:bg-white/5 hover:text-white"
                title="下载"
              >
                <Download size={14} />
              </a>
              <button
                onClick={() => handleDelete(video)}
                className="rounded p-1.5 text-gray-500 hover:bg-red-500/10 hover:text-red-400"
                title="删除"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {playingVideo && (
        <VideoPlayer video={playingVideo} onClose={() => setPlayingVideo(null)} />
      )}
    </div>
  );
}
