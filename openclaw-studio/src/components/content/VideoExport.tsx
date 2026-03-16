import { useShots } from "../../hooks/use-api";
import { useRenderTask, type RenderConfig } from "../../hooks/use-render";
import {
  Clapperboard,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { useState, useMemo } from "react";
import type { ShotInfo } from "../../lib/types";

const RESOLUTIONS = [
  { label: "竖屏 1080x1920", w: 1080, h: 1920 },
  { label: "横屏 1920x1080", w: 1920, h: 1080 },
  { label: "竖屏 720x1280", w: 720, h: 1280 },
  { label: "横屏 1280x720", w: 1280, h: 720 },
];

const TRANSITIONS = [
  { value: "fade", label: "淡入淡出" },
  { value: "wipe", label: "擦除" },
  { value: "slide", label: "滑动" },
  { value: "none", label: "无转场" },
];

const FPS_OPTIONS = [24, 30, 60];

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function VideoExport({ project }: { project: string }) {
  const { data: shotsData } = useShots(project);
  const render = useRenderTask();

  const [resolution, setResolution] = useState(0);
  const [fps, setFps] = useState(30);
  const [transition, setTransition] = useState<"fade" | "wipe" | "slide" | "none">("fade");
  const [transitionFrames, setTransitionFrames] = useState(15);
  const [kenburns, setKenburns] = useState(true);
  const [subtitles, setSubtitles] = useState(true);
  const [selectedScene, setSelectedScene] = useState("all");

  const scenes = useMemo(() => {
    return (shotsData?.scenes ?? []).map((sc) => {
      const shots = sc.shots as ShotInfo[];
      const imgs = shots.filter((s) => s.image_url || s.image_status === "completed").length;
      const auds = shots.filter((s) => s.audio_url || s.audio_status === "completed").length;
      return {
        id: sc.sceneId,
        name: sc.sceneName,
        total: shots.length,
        images: imgs,
        audio: auds,
        ready: imgs > 0 && auds > 0,
      };
    });
  }, [shotsData]);

  const readyScenes = scenes.filter((s) => s.ready);

  const handleRender = () => {
    const res = RESOLUTIONS[resolution];
    const config: RenderConfig = {
      project,
      scene: selectedScene,
      width: res.w,
      height: res.h,
      fps,
      transition,
      transitionFrames,
      kenburns,
      subtitles,
    };
    render.startRender(config);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3 lg:flex-row lg:gap-4 lg:p-4">
      {/* 左侧：场景 + 参数 */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-center gap-2">
          <Clapperboard size={14} className="text-accent shrink-0" />
          <span className="text-xs font-medium text-gray-300">导出设置</span>
        </div>

        <div className="rounded-lg border border-white/5 bg-surface-2 p-3">
          <label className="mb-1 block text-[11px] font-medium text-gray-400">场景选择</label>
          <select
            value={selectedScene}
            onChange={(e) => setSelectedScene(e.target.value)}
            disabled={render.isRendering}
            className="w-full rounded bg-surface-3 px-2.5 py-1 text-xs text-white outline-none"
          >
            <option value="all">全部场景 ({readyScenes.length} 个可用)</option>
            {scenes.map((sc) => (
              <option key={sc.id} value={sc.id} disabled={!sc.ready}>
                {sc.id} - {sc.name} ({sc.images}/{sc.total} 图, {sc.audio}/{sc.total} 音)
                {!sc.ready ? " [资源不足]" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <div className="rounded-lg border border-white/5 bg-surface-2 p-2.5">
            <label className="mb-1 block text-[10px] font-medium text-gray-400">分辨率</label>
            <select
              value={resolution}
              onChange={(e) => setResolution(Number(e.target.value))}
              disabled={render.isRendering}
              className="w-full rounded bg-surface-3 px-2 py-1 text-[11px] text-white outline-none"
            >
              {RESOLUTIONS.map((r, i) => (
                <option key={i} value={i}>{r.label}</option>
              ))}
            </select>
          </div>

          <div className="rounded-lg border border-white/5 bg-surface-2 p-2.5">
            <label className="mb-1 block text-[10px] font-medium text-gray-400">帧率</label>
            <div className="flex gap-1">
              {FPS_OPTIONS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFps(f)}
                  disabled={render.isRendering}
                  className={`flex-1 rounded px-1.5 py-1 text-[11px] transition-colors ${
                    fps === f
                      ? "bg-accent/20 text-accent"
                      : "bg-surface-3 text-gray-400 hover:text-white"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/5 bg-surface-2 p-2.5">
            <label className="mb-1 block text-[10px] font-medium text-gray-400">转场</label>
            <select
              value={transition}
              onChange={(e) => setTransition(e.target.value as typeof transition)}
              disabled={render.isRendering}
              className="w-full rounded bg-surface-3 px-2 py-1 text-[11px] text-white outline-none"
            >
              {TRANSITIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {transition !== "none" && (
              <div className="mt-1 flex items-center gap-1">
                <input
                  type="range"
                  min={5}
                  max={30}
                  value={transitionFrames}
                  onChange={(e) => setTransitionFrames(Number(e.target.value))}
                  disabled={render.isRendering}
                  className="flex-1 min-w-0"
                />
                <span className="text-[10px] tabular-nums text-gray-400 shrink-0">
                  {(transitionFrames / fps).toFixed(1)}s
                </span>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-white/5 bg-surface-2 p-2.5">
            <label className="mb-1 block text-[10px] font-medium text-gray-400">效果</label>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
              <label className="flex items-center gap-1.5 text-[11px] text-gray-300">
                <input
                  type="checkbox"
                  checked={kenburns}
                  onChange={(e) => setKenburns(e.target.checked)}
                  disabled={render.isRendering}
                  className="rounded"
                />
                Ken Burns
              </label>
              <label className="flex items-center gap-1.5 text-[11px] text-gray-300">
                <input
                  type="checkbox"
                  checked={subtitles}
                  onChange={(e) => setSubtitles(e.target.checked)}
                  disabled={render.isRendering}
                  className="rounded"
                />
                字幕
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧：执行 / 进度 / 结果 */}
      <div className="w-full shrink-0 rounded-lg border border-white/5 bg-surface-2 p-3 lg:w-64">
        {render.phase === "done" ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 size={14} className="shrink-0" />
              <span className="text-xs font-medium">渲染完成</span>
            </div>
            {render.outputPath && (
              <div className="flex items-center gap-2 rounded bg-surface-3 p-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] text-gray-300">
                    {render.outputPath.split("/").pop()}
                  </p>
                  {render.outputSize && (
                    <p className="text-[10px] text-gray-500">
                      {formatSize(render.outputSize)}
                    </p>
                  )}
                </div>
                <a
                  href={`/api/workspace/file-raw?path=${encodeURIComponent(render.outputPath)}`}
                  download
                  className="flex shrink-0 items-center gap-1 rounded bg-accent/20 px-2 py-1 text-[11px] text-accent hover:bg-accent/30"
                >
                  <Download size={11} />
                  下载
                </a>
              </div>
            )}
            <button
              onClick={render.reset}
              className="flex items-center justify-center gap-1 rounded bg-white/5 py-1.5 text-[11px] text-gray-400 hover:bg-white/10 hover:text-white"
            >
              <RotateCcw size={11} />
              重新配置
            </button>
          </div>
        ) : render.error ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-red-400">
              <AlertCircle size={14} className="shrink-0" />
              <span className="text-xs font-medium">渲染失败</span>
            </div>
            <p className="line-clamp-2 text-[11px] text-gray-400">{render.error}</p>
            <button
              onClick={render.reset}
              className="flex items-center justify-center gap-1 rounded bg-white/5 py-1.5 text-[11px] text-gray-400 hover:bg-white/10 hover:text-white"
            >
              <RotateCcw size={11} />
              重试
            </button>
          </div>
        ) : render.isRendering ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Loader2 size={12} className="animate-spin text-accent shrink-0" />
              <span className="text-[11px] text-gray-300 truncate">{render.message}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{ width: `${render.progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500">
                {render.phase === "prepare" ? "预处理" : "渲染"}
              </span>
              <span className="text-[10px] tabular-nums text-gray-400">
                {render.progress}%
              </span>
            </div>
          </div>
        ) : (
          <button
            onClick={handleRender}
            disabled={readyScenes.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded bg-accent py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-40"
          >
            <Clapperboard size={14} />
            开始渲染
          </button>
        )}
      </div>
    </div>
  );
}
