import { useShots } from "../../hooks/use-api";
import { useProjectStore } from "../../stores/project-store";
import { resolveImageSrc, resolveVideoSrc } from "../../lib/asset-resolver";
import { FallbackImage } from "../ui/FallbackImage";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import {
  Video,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Inbox,
  ImageIcon,
  Type,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useState, useMemo, useCallback, useEffect } from "react";
import type { ShotInfo, SceneShots } from "../../lib/types";

const VIDEO_STATUS_MAP: Record<
  string,
  { label: string; color: string; icon: typeof CheckCircle2 }
> = {
  completed: {
    label: "已生成",
    color: "bg-emerald-500/15 text-emerald-400",
    icon: CheckCircle2,
  },
  failed: {
    label: "失败",
    color: "bg-red-500/15 text-red-400",
    icon: AlertCircle,
  },
  pending: {
    label: "待生成",
    color: "bg-gray-500/15 text-gray-500",
    icon: Clock,
  },
  running: {
    label: "生成中",
    color: "bg-blue-500/15 text-blue-400",
    icon: Loader2,
  },
};

const MODE_ICON: Record<string, typeof ImageIcon> = {
  image: ImageIcon,
  text: Type,
};

function VideoStatusBadge({ status }: { status: string }) {
  const info = VIDEO_STATUS_MAP[status] ?? VIDEO_STATUS_MAP.pending;
  const Icon = info.icon;
  const isSpinning = status === "running";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
        info.color,
      )}
    >
      <Icon size={10} className={isSpinning ? "animate-spin" : ""} />
      {info.label}
    </span>
  );
}

function VideoPlayer({
  videoUrl,
  onClose,
}: {
  videoUrl: string;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
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
          src={videoUrl}
          controls
          autoPlay
          className="max-h-[85vh] rounded-lg"
        />
      </motion.div>
    </motion.div>
  );
}

function ShotVideoCard({
  shot,
  project,
  index,
  isSelected,
  onSelect,
  onPlay,
}: {
  shot: ShotInfo;
  project: string;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onPlay: (url: string) => void;
}) {
  const imgSrc = resolveImageSrc(project, shot.image_url, shot.image_path, "shots/");
  const videoStatus = shot.video_status ?? "pending";
  const videoMode = shot.video_mode;
  const videoSrc = resolveVideoSrc(project, shot.video_url, shot.video_path);
  const hasVideo = videoStatus === "completed" && !!videoSrc;
  const ModeIcon = videoMode ? MODE_ICON[videoMode] : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.02, duration: 0.2 }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border transition-all duration-200",
        isSelected
          ? "border-accent/40 bg-surface-2 ring-1 ring-accent/20"
          : "border-white/5 bg-surface-2 hover:border-white/10",
      )}
    >
      <button onClick={onSelect} className="flex flex-col text-left">
        <div className="relative aspect-video w-full overflow-hidden bg-surface-3">
          {imgSrc ? (
            <FallbackImage
              src={imgSrc}
              alt={shot.id}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              fallbackClassName="flex h-full w-full items-center justify-center bg-surface-3 text-gray-600"
              fallbackIcon={<Video size={24} strokeWidth={1} />}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-600">
              <Video size={24} strokeWidth={1} />
            </div>
          )}

          {hasVideo && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlay(videoSrc!);
              }}
              className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <Play size={18} className="ml-0.5 text-white" />
              </div>
            </button>
          )}

          <div className="absolute right-1.5 top-1.5">
            <VideoStatusBadge status={videoStatus} />
          </div>

          {isSelected && (
            <div className="absolute left-1.5 top-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold text-white">
              SELECTED
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1 p-2.5">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-xs font-medium text-white">
              {shot.id}
            </span>
            {ModeIcon && (
              <span className="flex items-center gap-0.5 rounded bg-white/5 px-1 py-0.5 text-[9px] text-gray-500">
                <ModeIcon size={9} />
                {videoMode === "image" ? "图生" : "文生"}
              </span>
            )}
          </div>
          <p className="line-clamp-1 text-[10px] text-gray-500">
            {shot.title}
          </p>
          <div className="flex items-center gap-2 text-[10px] text-gray-600">
            {shot.duration_sec && (
              <span className="flex items-center gap-0.5">
                <Clock size={9} />
                {shot.duration_sec}s
              </span>
            )}
            <span className="text-gray-700">{shot.shot_type}</span>
          </div>
        </div>
      </button>
    </motion.div>
  );
}

function SceneVideoGroup({
  scene,
  project,
  selectedShotId,
  onSelectShot,
  onPlay,
  startIndex,
}: {
  scene: SceneShots;
  project: string;
  selectedShotId: string | null;
  onSelectShot: (id: string | null) => void;
  onPlay: (url: string) => void;
  startIndex: number;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const shots = scene.shots as ShotInfo[];

  const stats = useMemo(() => {
    const completed = shots.filter((s) => s.video_status === "completed").length;
    const failed = shots.filter((s) => s.video_status === "failed").length;
    const hasImage = shots.filter((s) => s.image_url || s.image_status === "completed").length;
    return { completed, failed, hasImage, total: shots.length };
  }, [shots]);

  return (
    <div className="flex flex-col">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.02]"
      >
        <span className="text-gray-600">
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </span>
        <span className="rounded bg-accent/15 px-1.5 py-0.5 font-mono text-[10px] text-accent">
          {scene.sceneId}
        </span>
        <span className="text-xs font-medium text-gray-300">
          {scene.sceneName}
        </span>
        <div className="ml-auto flex items-center gap-2 text-[10px]">
          <span className="text-emerald-400/70">
            {stats.completed}/{stats.total} 完成
          </span>
          {stats.failed > 0 && (
            <span className="text-red-400/70">{stats.failed} 失败</span>
          )}
          <span className="text-gray-600">
            {stats.hasImage}/{stats.total} 有图
          </span>
        </div>
      </button>

      {!collapsed && (
        <div className="grid grid-cols-2 gap-2.5 px-4 pb-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {shots.map((shot, i) => (
            <ShotVideoCard
              key={shot.id}
              shot={shot}
              project={project}
              index={startIndex + i}
              isSelected={selectedShotId === shot.id}
              onSelect={() =>
                onSelectShot(selectedShotId === shot.id ? null : shot.id)
              }
              onPlay={onPlay}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function AiVideoView({ project }: { project: string }) {
  const { data, isLoading } = useShots(project);
  const focusedId = useProjectStore((s) => s.getFocusedId("shot"));
  const setFocused = useCallback(
    (id: string | null) => {
      const store = useProjectStore.getState();
      if (id) store.setFocusedItem("shot", id);
      else store.clearFocus();
    },
    [],
  );

  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [qualityReport, setQualityReport] = useState<{
    shots?: Array<{
      shot_id: string;
      scores?: { overall?: number };
      regenerate_suggested?: boolean;
      issues?: string[];
    }>;
    summary?: { avg_overall?: number };
  } | null>(null);

  useEffect(() => {
    let c = false;
    fetch(
      `/api/pipeline/${encodeURIComponent(project)}/artifact?path=${encodeURIComponent(".pipeline/video_quality.json")}`,
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!c && j?.shots) setQualityReport(j);
      })
      .catch(() => {});
    return () => {
      c = true;
    };
  }, [project]);

  const scenes = data?.scenes ?? [];

  const stats = useMemo(() => {
    let total = 0;
    let completed = 0;
    let failed = 0;
    let hasImage = 0;
    for (const scene of scenes) {
      for (const shot of scene.shots as ShotInfo[]) {
        total++;
        if (shot.video_status === "completed") completed++;
        if (shot.video_status === "failed") failed++;
        if (shot.image_url || shot.image_status === "completed") hasImage++;
      }
    }
    return { total, completed, failed, hasImage };
  }, [scenes]);

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center py-16 text-gray-600"
      >
        <span className="text-sm">加载中...</span>
      </motion.div>
    );
  }

  if (scenes.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center gap-3 py-16 text-gray-600"
      >
        <div className="rounded-2xl bg-surface-2 p-4">
          <Video size={32} strokeWidth={1} />
        </div>
        <p className="text-sm font-medium text-gray-400">暂无分镜数据</p>
        <p className="text-xs text-gray-600">需要先生成分镜和配图</p>
      </motion.div>
    );
  }

  let runningIndex = 0;

  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-center gap-3 border-b border-white/5 px-4 py-2.5">
        <Video size={14} className="text-accent" />
        <span className="text-xs font-medium text-gray-300">
          AI 视频生成
        </span>
        <div className="ml-auto flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1 text-gray-500">
            共 {stats.total} 镜
          </span>
          <span className="flex items-center gap-1 text-emerald-400/80">
            <CheckCircle2 size={10} />
            {stats.completed} 完成
          </span>
          {stats.failed > 0 && (
            <span className="flex items-center gap-1 text-red-400/80">
              <AlertCircle size={10} />
              {stats.failed} 失败
            </span>
          )}
          {stats.total > 0 && (
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-emerald-500 transition-all duration-500"
                style={{
                  width: `${(stats.completed / stats.total) * 100}%`,
                }}
              />
            </div>
          )}
        </div>
      </div>

      {qualityReport?.shots && qualityReport.shots.length > 0 && (
        <div className="border-b border-white/5 px-4 py-3">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-medium text-gray-300">
            <AlertCircle size={12} className="text-amber-400" />
            视频质量审核（video_quality.json）
            {qualityReport.summary?.avg_overall != null && (
              <span className="text-gray-500">
                均分 {Number(qualityReport.summary.avg_overall).toFixed(1)}
              </span>
            )}
          </div>
          <div className="max-h-40 overflow-auto rounded border border-white/5">
            <table className="w-full text-left text-[10px]">
              <thead className="sticky top-0 bg-surface-2 text-gray-500">
                <tr>
                  <th className="px-2 py-1">镜头</th>
                  <th className="px-2 py-1">分</th>
                  <th className="px-2 py-1">建议重生成</th>
                  <th className="px-2 py-1">问题</th>
                </tr>
              </thead>
              <tbody>
                {qualityReport.shots.slice(0, 50).map((row) => (
                  <tr key={row.shot_id} className="border-t border-white/[0.04] text-gray-400">
                    <td className="px-2 py-1 font-mono text-accent/80">{row.shot_id}</td>
                    <td className="px-2 py-1">
                      {row.scores?.overall != null ? row.scores.overall : "—"}
                    </td>
                    <td className="px-2 py-1">
                      {row.regenerate_suggested ? (
                        <span className="text-amber-400">是</span>
                      ) : (
                        "否"
                      )}
                    </td>
                    <td className="max-w-[200px] truncate px-2 py-1" title={(row.issues ?? []).join("; ")}>
                      {(row.issues ?? []).join("; ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex flex-col divide-y divide-white/[0.03]">
        {scenes.map((scene) => {
          const idx = runningIndex;
          runningIndex += scene.shots.length;
          return (
            <SceneVideoGroup
              key={scene.sceneId}
              scene={scene}
              project={project}
              selectedShotId={focusedId}
              onSelectShot={setFocused}
              onPlay={setPlayingUrl}
              startIndex={idx}
            />
          );
        })}
      </div>

      <AnimatePresence>
        {playingUrl && (
          <VideoPlayer
            videoUrl={playingUrl}
            onClose={() => setPlayingUrl(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
