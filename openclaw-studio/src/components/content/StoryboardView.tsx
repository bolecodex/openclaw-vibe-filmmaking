import { useShots } from "../../hooks/use-api";
import { useProjectStore } from "../../stores/project-store";
import { resolveImageSrc } from "../../lib/asset-resolver";
import {
  Clapperboard,
  Image as ImageIcon,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useState, useCallback } from "react";
import type { ShotManifest, ShotInfo } from "../../lib/types";

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-emerald-500/20 text-emerald-400",
  generated: "bg-blue-500/20 text-blue-400",
  approved: "bg-emerald-500/20 text-emerald-400",
  pending: "bg-gray-500/20 text-gray-500",
  rejected: "bg-red-500/20 text-red-400",
  failed: "bg-red-500/20 text-red-400",
};

function ShotCard({
  shot,
  project,
  onExpand,
  expanded,
}: {
  shot: ShotInfo;
  project: string;
  onExpand: () => void;
  expanded: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copyPrompt = useCallback(() => {
    navigator.clipboard.writeText(shot.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [shot.prompt]);

  const hasImage = (shot.image_url || shot.image_path) && shot.image_status !== "pending";

  const imageSrc = resolveImageSrc(project, shot.image_url, shot.image_path, "shots/");

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-lg border transition-colors ${
        expanded
          ? "border-accent/30 bg-surface-2"
          : "border-white/5 bg-surface-2 hover:border-white/10"
      }`}
    >
      <button onClick={onExpand} className="text-left">
        {hasImage && imageSrc ? (
          <img
            src={imageSrc}
            alt={shot.title}
            className="h-32 w-full object-cover"
          />
        ) : (
          <div className="flex h-32 items-center justify-center bg-surface-3 text-gray-600">
            <ImageIcon size={24} strokeWidth={1} />
          </div>
        )}
        <div className="flex flex-col gap-1 p-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-accent">{shot.id}</span>
            <span className="flex-1 truncate text-xs text-white">{shot.title}</span>
            <span className="text-gray-600">
              {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-gray-500">
            <span>{shot.shot_type}</span>
            <span>{shot.mood}</span>
            {shot.image_status && (
              <span
                className={`rounded px-1 py-0.5 ${STATUS_COLORS[shot.image_status] ?? ""}`}
              >
                {shot.image_status}
              </span>
            )}
          </div>
          {shot.lines && shot.lines.length > 0 && (
            <p className="line-clamp-2 text-[10px] text-gray-400">
              {shot.lines.map((l) => `${l.speaker}: ${l.text}`).join(" ")}
            </p>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/5 bg-surface-1/50 p-3">
          {shot.characters && shot.characters.length > 0 && (
            <div className="mb-2">
              <span className="text-[10px] font-medium text-gray-500">角色:</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {shot.characters.map((c, i) => (
                  <span
                    key={i}
                    className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-400"
                  >
                    {c.ref} — {c.action} ({c.emotion})
                  </span>
                ))}
              </div>
            </div>
          )}

          {shot.lines && shot.lines.length > 0 && (
            <div className="mb-2">
              <span className="text-[10px] font-medium text-gray-500">台词:</span>
              <div className="mt-1 flex flex-col gap-0.5">
                {shot.lines.map((l, i) => (
                  <div key={i} className="text-[11px]">
                    <span className="font-medium text-gray-400">{l.speaker}:</span>{" "}
                    <span className="text-gray-500">{l.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {shot.prompt && (
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-gray-500">提示词</span>
                <button
                  onClick={copyPrompt}
                  className="flex items-center gap-0.5 text-[10px] text-gray-600 hover:text-gray-400"
                >
                  {copied ? <Check size={10} /> : <Copy size={10} />}
                  {copied ? "已复制" : "复制"}
                </button>
              </div>
              <p className="mt-1 rounded bg-surface-3/50 px-2 py-1.5 font-mono text-[10px] leading-relaxed text-gray-500">
                {shot.prompt}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function StoryboardView({ project }: { project: string }) {
  const { data, isLoading } = useShots(project);
  const [activeScene, setActiveScene] = useState<string | null>(null);
  const expandedShot = useProjectStore((s) => s.getFocusedId("shot"));
  const setExpandedShot = (id: string | null) => {
    const store = useProjectStore.getState();
    if (id) store.setFocusedItem("shot", id);
    else store.clearFocus();
  };
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-600">
        <span className="text-sm">加载中...</span>
      </div>
    );
  }

  const scenes = data?.scenes;
  const manifest = data?.manifest as ShotManifest | null;

  if (!scenes || scenes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-gray-600">
        <Clapperboard size={32} strokeWidth={1} />
        <p className="text-sm">暂无分镜数据</p>
        <p className="text-xs">在 Agent 中输入「生成分镜」开始</p>
      </div>
    );
  }

  const totalShots = scenes.reduce((acc, s) => acc + s.shots.length, 0);

  const filteredScenes = activeScene
    ? scenes.filter((s) => s.sceneId === activeScene)
    : scenes;

  const applyStatusFilter = (shots: ShotInfo[]) => {
    if (!statusFilter) return shots;
    return shots.filter((s) => s.image_status === statusFilter);
  };

  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2">
        <Clapperboard size={14} className="text-accent" />
        <span className="text-xs font-medium text-gray-300">
          分镜 ({totalShots})
        </span>
        <span className="text-[10px] text-gray-600">
          {scenes.length} 个场景
        </span>
        <div className="ml-auto flex items-center gap-1">
          {["pending", "completed"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? null : s)}
              className={`rounded px-2 py-0.5 text-[10px] transition-colors ${statusFilter === s ? "bg-accent/20 text-accent" : "text-gray-500 hover:text-gray-300"}`}
            >
              {s === "pending" ? "待生成" : "已完成"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setActiveScene(null)}
            className={`rounded px-2 py-1 text-xs ${!activeScene ? "bg-accent text-white" : "bg-white/5 text-gray-400 hover:text-gray-200"}`}
          >
            全部
          </button>
          {scenes.map((s) => (
            <button
              key={s.sceneId}
              onClick={() => setActiveScene(s.sceneId)}
              className={`rounded px-2 py-1 text-xs ${activeScene === s.sceneId ? "bg-accent text-white" : "bg-white/5 text-gray-400 hover:text-gray-200"}`}
            >
              {s.sceneId} {s.sceneName}
            </button>
          ))}
        </div>

        {filteredScenes.map((sceneGroup) => {
          const shots = applyStatusFilter(sceneGroup.shots);
          if (shots.length === 0) return null;
          return (
            <div key={sceneGroup.sceneId}>
              <h3 className="mb-2 text-xs font-medium text-gray-400">
                {sceneGroup.sceneId} - {sceneGroup.sceneName}
                <span className="ml-2 text-gray-600">({shots.length} 镜头)</span>
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {shots.map((shot) => (
                  <ShotCard
                    key={shot.id}
                    shot={shot}
                    project={project}
                    expanded={expandedShot === shot.id}
                    onExpand={() =>
                      setExpandedShot(expandedShot === shot.id ? null : shot.id)
                    }
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
