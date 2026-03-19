import { Circle } from "lucide-react";

interface SkillCardProps {
  name: string;
  displayName: string;
  description: string;
  source: "workspace" | "managed" | "bundled" | "project";
  enabled: boolean;
  overridden?: boolean;
  pipelineStep?: number;
  onClick: () => void;
  isSelected: boolean;
}

const SOURCE_BADGE: Record<
  string,
  { label: string; className: string; modifiedLabel?: string }
> = {
  bundled: {
    label: "系统",
    className: "bg-indigo-500/20 text-indigo-300",
    modifiedLabel: "系统 · 已修改",
  },
  managed: {
    label: "托管",
    className: "bg-surface-3 text-gray-400",
  },
  workspace: {
    label: "工作区",
    className: "bg-emerald-500/20 text-emerald-300",
  },
  project: {
    label: "项目",
    className: "bg-amber-500/20 text-amber-300",
  },
};

export function SkillCard({
  name,
  displayName,
  description,
  source,
  enabled,
  overridden,
  pipelineStep,
  onClick,
  isSelected,
}: SkillCardProps) {
  const badge = SOURCE_BADGE[source] ?? SOURCE_BADGE.workspace;
  const badgeLabel =
    source === "bundled" && overridden ? badge.modifiedLabel : badge.label;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
        isSelected
          ? "border-accent bg-surface-2"
          : "border-transparent bg-surface-1 hover:bg-surface-2"
      }`}
    >
      <div className="flex items-start gap-2">
        {pipelineStep ? (
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-[10px] font-bold text-indigo-300">
            {pipelineStep}
          </span>
        ) : (
          <Circle
            className={`mt-1 h-2 w-2 shrink-0 ${
              source === "bundled" || source === "project"
                ? "fill-indigo-400 text-indigo-400"
                : enabled
                  ? "fill-emerald-500 text-emerald-500"
                  : "fill-gray-600 text-gray-600"
            }`}
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-xs font-medium text-gray-100">
              {displayName || name}
            </span>
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${badge.className}`}
            >
              {badgeLabel}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-gray-400">
            {description || "无描述"}
          </p>
        </div>
      </div>
    </button>
  );
}
