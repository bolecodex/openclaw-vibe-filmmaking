import { motion } from "framer-motion";
import { useProps } from "../../hooks/use-api";
import { useProjectStore } from "../../stores/project-store";
import { resolveImageSrc } from "../../lib/asset-resolver";
import { FallbackImage } from "../ui/FallbackImage";
import { Package, ImageIcon, ChevronRight, Sparkles } from "lucide-react";
import type { PropItem } from "../../lib/types";
import { cn } from "../../lib/utils";

export function PropsView({ project }: { project: string }) {
  const { data: props, isLoading } = useProps(project);
  const setCurrentTab = useProjectStore((s) => s.setCurrentTab);
  const expandedId = useProjectStore((s) => s.getFocusedId("prop"));
  const setExpandedId = (id: string | null) => {
    const store = useProjectStore.getState();
    if (id) store.setFocusedItem("prop", id);
    else store.clearFocus();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-600">
        <span className="text-sm">加载中...</span>
      </div>
    );
  }

  const list = Array.isArray(props) ? props : [];
  if (list.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center justify-center gap-2 py-12 text-gray-600"
      >
        <Package size={32} strokeWidth={1} />
        <p className="text-sm">暂无道具/物品数据</p>
        <p className="text-xs">在流水线「提取道具」步骤或 Agent 中执行「提取道具」开始</p>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2">
        <Package size={14} className="text-accent" />
        <span className="text-xs font-medium text-gray-300">道具 / 物品 ({list.length})</span>
      </div>

      <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((item: PropItem, index: number) => {
          const expanded = expandedId === item.id;
          const cacheBuster = `${(item.description?.length ?? 0)}-${item.image_path ?? ""}`;
          const src = resolveImageSrc(
            project,
            item.image_url,
            item.image_path,
            "",
            cacheBuster,
          );

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03, duration: 0.2 }}
              className={cn(
                "flex overflow-hidden rounded-lg border transition-colors",
                expanded
                  ? "border-accent/30 bg-surface-2"
                  : "border-white/5 bg-surface-2 hover:border-white/10",
              )}
            >
              <button
                onClick={() => setExpandedId(expanded ? null : item.id)}
                className="flex w-full gap-3 p-3 text-left"
              >
                {src ? (
                  <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-md bg-surface-3">
                    <FallbackImage
                      src={src}
                      alt={item.name}
                      className="h-full w-full object-cover"
                      fallbackClassName="flex h-full w-full items-center justify-center bg-surface-3 text-gray-600"
                      fallbackIcon={<ImageIcon size={18} strokeWidth={1} />}
                    />
                    {item.image_status === "completed" && (
                      <div className="absolute bottom-0.5 right-0.5 rounded-full bg-emerald-500/80 p-0.5">
                        <Sparkles size={8} className="text-white" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-md bg-surface-3 text-gray-600">
                    <ImageIcon size={20} strokeWidth={1} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-mono text-accent">
                      {item.id}
                    </span>
                    <span className="truncate text-sm font-medium text-white">
                      {item.name}
                    </span>
                    {item.category && (
                      <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-gray-400">
                        {item.category}
                      </span>
                    )}
                    <ChevronRight
                      size={12}
                      className={cn(
                        "shrink-0 text-gray-500 transition-transform",
                        expanded && "rotate-90",
                      )}
                    />
                  </div>
                  {item.description && (
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-gray-500">
                      {item.description}
                    </p>
                  )}
                </div>
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
