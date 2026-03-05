import { useState, useEffect, useRef, useCallback } from "react";
import { FileText, Users, Film, Clapperboard, Zap } from "lucide-react";
import type { MentionItem, MentionType } from "../../lib/types";

const CATEGORIES: { type: MentionType | null; label: string; icon: typeof FileText }[] = [
  { type: null, label: "全部", icon: FileText },
  { type: "file", label: "文件", icon: FileText },
  { type: "character", label: "角色", icon: Users },
  { type: "scene", label: "场景", icon: Film },
  { type: "shot", label: "分镜", icon: Clapperboard },
  { type: "skill", label: "技能", icon: Zap },
];

const TYPE_COLORS: Record<MentionType, string> = {
  file: "text-gray-400",
  character: "text-amber-400",
  scene: "text-emerald-400",
  shot: "text-blue-400",
  skill: "text-purple-400",
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

  if (!visible) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 z-50 mb-1 overflow-hidden rounded-lg border border-white/10 bg-surface-1 shadow-xl">
      <div className="flex items-center gap-0.5 border-b border-white/5 px-2 py-1.5">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.type;
          return (
            <button
              key={cat.label}
              onClick={() => setActiveCategory(cat.type)}
              className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] transition-colors ${
                isActive
                  ? "bg-accent/20 text-accent"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Icon size={10} />
              {cat.label}
            </button>
          );
        })}
        {query && (
          <span className="ml-auto text-[10px] text-gray-600">
            搜索: {query}
          </span>
        )}
      </div>

      <div ref={listRef} className="max-h-48 overflow-auto py-1">
        {filtered.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-gray-600">
            无匹配结果
          </div>
        ) : (
          filtered.slice(0, 50).map((item, idx) => (
            <button
              key={`${item.type}-${item.id}`}
              onClick={() => onSelect(item)}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors ${
                idx === selectedIndex
                  ? "bg-accent/10 text-white"
                  : "text-gray-300 hover:bg-white/5"
              }`}
            >
              <span className={`text-[10px] ${TYPE_COLORS[item.type]}`}>
                {CATEGORIES.find((c) => c.type === item.type)?.label}
              </span>
              <span className="flex-1 truncate text-xs">{item.label}</span>
              {item.subtitle && (
                <span className="truncate text-[10px] text-gray-600">
                  {item.subtitle}
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
