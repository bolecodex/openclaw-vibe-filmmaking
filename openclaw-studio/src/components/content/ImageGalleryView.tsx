import { useShots } from "../../hooks/use-api";
import { resolveImageSrc } from "../../lib/asset-resolver";
import { Image as ImageIcon, Inbox, Maximize2, X } from "lucide-react";
import { useState } from "react";
import type { ShotInfo } from "../../lib/types";

interface ImageEntry {
  shotId: string;
  sceneId: string;
  sceneName: string;
  title: string;
  imageUrl: string;
  shotType: string;
  prompt: string;
}

function LightboxModal({
  entry,
  onClose,
}: {
  entry: ImageEntry;
  onClose: () => void;
}) {
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
        <img
          src={entry.imageUrl}
          alt={entry.title}
          className="max-h-[85vh] rounded-lg object-contain"
        />
        <div className="mt-2 text-center">
          <span className="font-mono text-xs text-accent">{entry.shotId}</span>
          <span className="mx-2 text-xs text-gray-500">{entry.shotType}</span>
          <span className="text-xs text-gray-400">{entry.sceneName}</span>
        </div>
      </div>
    </div>
  );
}

export function ImageGalleryView({ project }: { project: string }) {
  const { data, isLoading } = useShots(project);
  const [lightbox, setLightbox] = useState<ImageEntry | null>(null);
  const [filter, setFilter] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-600">
        <span className="text-sm">加载中...</span>
      </div>
    );
  }

  const entries: ImageEntry[] = [];
  const sceneNames = new Set<string>();

  for (const scene of data?.scenes ?? []) {
    sceneNames.add(scene.sceneName);
    for (const shot of scene.shots as ShotInfo[]) {
      const resolved = resolveImageSrc(project, shot.image_url, shot.image_path, "shots/");
      if (!resolved || shot.image_status === "pending") continue;
      entries.push({
        shotId: shot.id,
        sceneId: scene.sceneId,
        sceneName: scene.sceneName,
        title: shot.title?.replace(/\*\*/g, "") ?? shot.id,
        imageUrl: resolved,
        shotType: shot.shot_type ?? "",
        prompt: shot.prompt ?? "",
      });
    }
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-gray-600">
        <Inbox size={32} strokeWidth={1} />
        <p className="text-sm">暂无图片</p>
        <p className="text-xs">在 Agent 中输入「生成配图」开始</p>
      </div>
    );
  }

  const filtered = filter
    ? entries.filter((e) => e.sceneName === filter)
    : entries;

  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2">
        <ImageIcon size={14} className="text-accent" />
        <span className="text-xs font-medium text-gray-300">
          图片 ({entries.length})
        </span>
        <span className="text-[10px] text-gray-600">
          {sceneNames.size} 个场景
        </span>
      </div>

      {sceneNames.size > 1 && (
        <div className="flex flex-wrap gap-1 border-b border-white/5 px-4 py-2">
          <button
            onClick={() => setFilter(null)}
            className={`rounded px-2 py-0.5 text-[10px] ${!filter ? "bg-accent/20 text-accent" : "text-gray-500 hover:text-gray-300"}`}
          >
            全部
          </button>
          {[...sceneNames].map((name) => (
            <button
              key={name}
              onClick={() => setFilter(filter === name ? null : name)}
              className={`rounded px-2 py-0.5 text-[10px] ${filter === name ? "bg-accent/20 text-accent" : "text-gray-500 hover:text-gray-300"}`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {filtered.map((entry) => (
          <div
            key={entry.shotId}
            className="group relative flex flex-col overflow-hidden rounded-lg border border-white/5 bg-surface-2 transition-colors hover:border-white/10"
          >
            <div className="relative">
              <img
                src={entry.imageUrl}
                alt={entry.title}
                className="h-36 w-full object-cover"
                loading="lazy"
              />
              <button
                onClick={() => setLightbox(entry)}
                className="absolute right-1 top-1 rounded bg-black/50 p-1 text-white/60 opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
              >
                <Maximize2 size={12} />
              </button>
            </div>
            <div className="flex flex-col gap-0.5 p-2">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] text-accent">
                  {entry.shotId}
                </span>
                <span className="text-[10px] text-gray-600">
                  {entry.shotType}
                </span>
              </div>
              <p className="line-clamp-2 text-[10px] text-gray-400">
                {entry.title}
              </p>
            </div>
          </div>
        ))}
      </div>

      {lightbox && (
        <LightboxModal entry={lightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}
