import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { FileText, Users, Film, Clapperboard, Zap, AudioLines, Video } from "lucide-react";
import type { MentionItem, MentionType } from "../../lib/types";

const CATEGORIES: { type: MentionType | null; label: string; icon: typeof FileText }[] = [
  { type: null, label: "全部", icon: FileText },
  { type: "file", label: "文件", icon: FileText },
  { type: "character", label: "角色", icon: Users },
  { type: "scene", label: "场景", icon: Film },
  { type: "shot", label: "分镜", icon: Clapperboard },
  { type: "audio", label: "音频", icon: AudioLines },
  { type: "video", label: "视频", icon: Video },
  { type: "skill", label: "技能", icon: Zap },
];

function countByType(items: MentionItem[]): Map<MentionType | "all", number> {
  const m = new Map<MentionType | "all", number>();
  m.set("all", items.length);
  for (const t of [
    "file",
    "character",
    "scene",
    "shot",
    "audio",
    "video",
    "skill",
  ] as MentionType[]) {
    m.set(t, 0);
  }
  for (const i of items) {
    m.set(i.type, (m.get(i.type) ?? 0) + 1);
  }
  return m;
}

const TYPE_COLORS: Record<MentionType, string> = {
  file: "text-gray-400",
  character: "text-amber-400",
  scene: "text-emerald-400",
  shot: "text-blue-400",
  skill: "text-violet-400/90",
  audio: "text-cyan-400",
  video: "text-orange-400",
};

const EMPTY_HINTS: Record<MentionType, string> = {
  file: "当前项目暂无文件",
  character: "暂无角色，请先在流水线执行「提取角色」",
  scene: "暂无场景，请先执行「切分场景」",
  shot: "暂无分镜，请先执行「生成分镜」",
  audio: "暂无音频，完成「分镜配音」后会出现",
  video: "暂无视频，完成「分镜生视频」或「选中生视频」后会出现",
  skill: "暂无可用技能",
};

interface MentionDropdownProps {
  items: MentionItem[];
  onSelect: (item: MentionItem) => void;
  onClose: () => void;
  query: string;
  visible: boolean;
}

export function MentionDropdown({
  items,
  onSelect,
  onClose,
  query,
  visible,
}: MentionDropdownProps) {
  const [activeCategory, setActiveCategory] = useState<MentionType | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = activeCategory
    ? items.filter((i) => i.type === activeCategory)
    : items;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeCategory]);

  const scrollToSelected = useCallback((index: number) => {
    const list = listRef.current;
    if (!list) return;
    const el = list.children[index] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, []);

  useEffect(() => {
    if (!visible) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const next = Math.min(prev + 1, filtered.length - 1);
          scrollToSelected(next);
          return next;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const next = Math.max(prev - 1, 0);
          scrollToSelected(next);
          return next;
        });
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onSelect(filtered[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Tab") {
        e.preventDefault();
        const catIdx = CATEGORIES.findIndex((c) => c.type === activeCategory);
        const nextIdx = (catIdx + 1) % CATEGORIES.length;
        setActiveCategory(CATEGORIES[nextIdx].type);
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [visible, filtered, selectedIndex, onSelect, onClose, activeCategory, scrollToSelected]);

  const counts = useMemo(() => countByType(items), [items]);

  if (!visible) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 z-50 mb-1 flex max-h-[min(36vh,240px)] flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#121214] shadow-lg shadow-black/30">
      <div className="shrink-0 border-b border-white/[0.06] px-1.5 py-1">
        <div
          className="-mx-0.5 flex snap-x snap-mandatory items-center gap-1 overflow-x-auto pb-0.5 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20"
        >
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.type;
            const n =
              cat.type === null
                ? counts.get("all") ?? 0
                : counts.get(cat.type) ?? 0;
            return (
              <button
                key={cat.label}
                type="button"
                onClick={() => setActiveCategory(cat.type)}
                className={`flex shrink-0 snap-start items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-colors ${
                  isActive
                    ? "bg-violet-600/50 text-white"
                    : "text-gray-500 hover:bg-white/[0.06] hover:text-gray-400"
                }`}
              >
                <Icon size={11} strokeWidth={2} className={isActive ? "text-violet-100/90" : "opacity-70"} />
                <span>{cat.label}</span>
                {n > 0 && (
                  <span
                    className={`min-w-[1rem] rounded px-0.5 py-px text-center text-[9px] tabular-nums leading-none ${
                      isActive
                        ? "bg-violet-400/30 text-violet-100"
                        : "bg-white/[0.06] text-gray-500"
                    }`}
                  >
                    {n > 99 ? "99+" : n}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {query ? (
          <div className="mt-0.5 px-0.5 text-[10px] leading-tight text-gray-500">
            搜索「<span className="text-violet-400/80">{query}</span>」
          </div>
        ) : null}
      </div>

      <div
        ref={listRef}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain py-0.5 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20"
      >
        {filtered.length === 0 ? (
          <div className="px-2 py-2 text-center text-[11px] leading-snug text-gray-500">
            {query ? (
              "无匹配结果"
            ) : activeCategory && EMPTY_HINTS[activeCategory] ? (
              EMPTY_HINTS[activeCategory]
            ) : (
              "无匹配结果"
            )}
          </div>
        ) : (
          filtered.slice(0, 50).map((item, idx) => {
            const typeLabel = CATEGORIES.find((c) => c.type === item.type)?.label ?? "";
            const title = [item.label, item.subtitle].filter(Boolean).join(" · ");
            return (
              <button
                key={`${item.type}-${item.id}`}
                type="button"
                onClick={() => onSelect(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                title={title}
                className={`flex w-full items-center gap-1.5 px-2 py-0.5 text-left leading-tight transition-colors ${
                  idx === selectedIndex
                    ? "bg-violet-500/15 text-gray-100"
                    : "text-gray-300 hover:bg-white/[0.04]"
                }`}
              >
                <span
                  className={`w-7 shrink-0 text-[10px] font-medium leading-none ${TYPE_COLORS[item.type]}`}
                >
                  {typeLabel}
                </span>
                <span className="min-w-0 flex-1 truncate text-[11px] leading-[1.35] text-gray-200">
                  {item.label}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
