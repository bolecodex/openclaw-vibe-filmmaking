import { useState } from "react";
import type { TokenUsage } from "../../stores/chat-store";

const CONTEXT_LIMIT = 200_000;

function formatTokens(n: number): string {
  if (n < 1000) return String(n);
  if (n < 100_000) return `${(n / 1000).toFixed(1)}k`;
  return `${Math.round(n / 1000)}k`;
}

interface Props {
  usage: TokenUsage | null;
}

export function TokenBadge({ usage }: Props) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!usage || usage.total === 0) return null;

  const contextUsed = usage.context || usage.total;
  const ratio = Math.min(contextUsed / CONTEXT_LIMIT, 1);
  const percent = Math.round(ratio * 100);

  const barColor =
    ratio < 0.5
      ? "bg-emerald-500"
      : ratio < 0.8
        ? "bg-amber-500"
        : "bg-red-500";

  const textColor =
    ratio < 0.5
      ? "text-emerald-400"
      : ratio < 0.8
        ? "text-amber-400"
        : "text-red-400";

  return (
    <div
      className="relative flex items-center gap-1.5 cursor-default"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="h-1 w-10 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className={`text-[9px] tabular-nums ${textColor}`}>
        {formatTokens(contextUsed)}
      </span>

      {showTooltip && (
        <div className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-surface-0 px-3 py-2 text-[10px] shadow-lg">
          <div className="mb-1.5 font-medium text-gray-300">Token 用量</div>
          <div className="space-y-1 text-gray-400">
            <div className="flex justify-between gap-6">
              <span>输入</span>
              <span className="tabular-nums text-gray-300">{formatTokens(usage.input)}</span>
            </div>
            <div className="flex justify-between gap-6">
              <span>输出</span>
              <span className="tabular-nums text-gray-300">{formatTokens(usage.output)}</span>
            </div>
            <div className="flex justify-between gap-6 border-t border-white/5 pt-1">
              <span>上下文</span>
              <span className={`tabular-nums ${textColor}`}>
                {formatTokens(contextUsed)} / {formatTokens(CONTEXT_LIMIT)}
              </span>
            </div>
          </div>
          {ratio >= 0.8 && (
            <div className="mt-1.5 border-t border-white/5 pt-1.5 text-amber-400">
              {ratio >= 0.95
                ? "上下文已接近上限，请开始新对话"
                : "上下文接近上限，建议开始新对话"}
            </div>
          )}
          <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-l border-t border-white/10 bg-surface-0" />
        </div>
      )}
    </div>
  );
}
