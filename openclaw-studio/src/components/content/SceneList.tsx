import { motion, AnimatePresence } from "framer-motion";
import { useScenes } from "../../hooks/use-api";
import { useProjectStore } from "../../stores/project-store";
import { resolveImageSrc } from "../../lib/asset-resolver";
import { FallbackImage } from "../ui/FallbackImage";
import {
  Film,
  MapPin,
  Clock,
  Users,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  ImageIcon,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import type { SceneMeta, SceneInfo } from "../../lib/types";
import { cn } from "../../lib/utils";

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  reality: { label: "现实", color: "bg-emerald-500/20 text-emerald-400" },
  flashback: { label: "闪回", color: "bg-amber-500/20 text-amber-400" },
  dream: { label: "梦境", color: "bg-purple-500/20 text-purple-400" },
  montage: { label: "蒙太奇", color: "bg-blue-500/20 text-blue-400" },
  prologue: { label: "序章", color: "bg-rose-500/20 text-rose-400" },
};

export function SceneList({ project }: { project: string }) {
  const { data, isLoading } = useScenes(project);
  const setCurrentTab = useProjectStore((s) => s.setCurrentTab);
  const expandedId = useProjectStore((s) => s.getFocusedId("scene"));
  const setExpandedId = (id: string | null) => {
    const store = useProjectStore.getState();
    if (id) store.setFocusedItem("scene", id);
    else store.clearFocus();
  };
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-600">
        <span className="text-sm">加载中...</span>
      </div>
    );
  }

  const meta = data?.meta as SceneMeta | null;
  const scenes = data?.scenes;
  if (!scenes || scenes.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center justify-center gap-2 py-12 text-gray-600"
      >
        <Film size={32} strokeWidth={1} />
        <p className="text-sm">暂无场景数据</p>
        <p className="text-xs">在 Agent 中输入「拆分场景」开始</p>
      </motion.div>
    );
  }

  const types = [...new Set(scenes.map((s) => s.type))];
  const filtered = typeFilter
    ? scenes.filter((s) => s.type === typeFilter)
    : scenes;

  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2">
        <Film size={14} className="text-accent" />
        <span className="text-xs font-medium text-gray-300">
          场景 ({scenes.length})
        </span>
        {meta && (
          <span className="text-[10px] text-gray-600">
            共 {meta.total_lines} 行台词
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setTypeFilter(null)}
            className={`rounded px-2 py-0.5 text-[10px] transition-colors ${!typeFilter ? "bg-accent/20 text-accent" : "text-gray-500 hover:text-gray-300"}`}
          >
            全部
          </button>
          {types.map((t) => {
            const info = TYPE_LABELS[t];
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(t === typeFilter ? null : t)}
                className={`rounded px-2 py-0.5 text-[10px] transition-colors ${typeFilter === t ? "bg-accent/20 text-accent" : "text-gray-500 hover:text-gray-300"}`}
              >
                {info?.label ?? t}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2 p-4">
        {filtered.map((scene, index) => {
          const expanded = expandedId === scene.id;
          const typeInfo = TYPE_LABELS[scene.type];
          const sceneCacheBuster = `${(scene as SceneInfo).location?.length ?? 0}-${(scene as SceneInfo).image_path ?? ""}`;
          const sceneImageSrc = resolveImageSrc(
            project,
            (scene as SceneInfo).image_url,
            (scene as SceneInfo).image_path,
            "",
            sceneCacheBuster,
          );

          return (
            <motion.div
              key={scene.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03, duration: 0.2 }}
              className={cn(
                "flex flex-col overflow-hidden rounded-lg border transition-colors",
                expanded
                  ? "border-accent/30 bg-surface-2"
                  : "border-white/5 bg-surface-2 hover:border-white/10"
              )}
            >
              <button
                onClick={() => setExpandedId(expanded ? null : scene.id)}
                className="flex gap-3 p-3 text-left"
              >
                {sceneImageSrc ? (
                  <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-surface-3">
                    <FallbackImage
                      src={sceneImageSrc}
                      alt={scene.name}
                      className="h-full w-full object-cover"
                      fallbackClassName="flex h-full w-full items-center justify-center bg-surface-3 text-gray-600"
                      fallbackIcon={<ImageIcon size={20} strokeWidth={1} />}
                    />
                    {(scene as SceneInfo).image_status === "completed" && (
                      <div className="absolute bottom-0.5 right-0.5 rounded-full bg-emerald-500/80 p-0.5">
                        <Sparkles size={10} className="text-white" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-gray-600">
                    <ImageIcon size={24} strokeWidth={1} />
                  </div>
                )}
                <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">
                      {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                    <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-mono text-accent">
                      {scene.id}
                    </span>
                    <h3 className="text-sm font-medium text-white truncate">{scene.name}</h3>
                    {typeInfo && (
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 pl-6 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <MapPin size={11} /> {scene.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} /> {scene.time_period}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare size={11} /> {scene.line_count} 行
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={11} /> {scene.main_characters?.join(", ")}
                    </span>
                  </div>

                  {scene.mood && (
                    <p className="pl-6 text-xs text-gray-500">
                      氛围: {scene.mood}
                    </p>
                  )}
                </div>
              </button>

              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-white/5 bg-surface-1/50 overflow-hidden"
                  >
                    <div className="p-4">
                      {scene.notes && (
                        <p className="mb-3 text-xs italic text-gray-500">{scene.notes}</p>
                      )}
                      {scene.content ? (
                        <div className="max-h-64 overflow-auto rounded-md bg-surface-3/50 p-3">
                          <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-gray-400">
                            {scene.content}
                          </pre>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-600">
                          场景文件暂不可用
                        </p>
                      )}
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={() => setCurrentTab("shots")}
                          className="flex items-center gap-1 rounded bg-white/5 px-2 py-1 text-[10px] text-gray-400 transition-colors hover:bg-white/10 hover:text-gray-200"
                        >
                          <Film size={10} /> 查看分镜
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
