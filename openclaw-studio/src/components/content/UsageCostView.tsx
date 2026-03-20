import { useProjectStore } from "../../stores/project-store";
import { api } from "../../lib/api-client";
import useSWR from "swr";
import { Receipt, Loader2, AlertCircle, ExternalLink } from "lucide-react";

function formatTokens(n: number): string {
  if (n < 1000) return String(n);
  if (n < 100_000) return `${(n / 1000).toFixed(1)}k`;
  return `${Math.round(n / 1000)}k`;
}

export function UsageCostView() {
  const currentProject = useProjectStore((s) => s.currentProject);

  const { data, error, isLoading, mutate } = useSWR(
    currentProject ? ["usage", currentProject] : null,
    () => (currentProject ? api.usage.get(currentProject) : null),
    { revalidateOnFocus: true }
  );

  if (!currentProject) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-gray-500">
        <Receipt size={40} strokeWidth={1} />
        <p className="text-sm">请先选择项目</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-gray-500">
        <Loader2 size={32} className="animate-spin" />
        <p className="text-sm">加载用量数据...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-gray-500">
        <AlertCircle size={40} className="text-amber-500" />
        <p className="text-sm text-amber-400/90">无法加载用量（请确认 Gateway 已连接）</p>
        <button
          type="button"
          onClick={() => mutate()}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-400 hover:bg-white/10"
        >
          重试
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { totalInput, totalOutput, estimatedCostRmb, pricingDocUrl, bySession } = data;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="rounded-xl border border-white/[0.06] bg-surface-2 p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-300">
          <Receipt size={18} />
          用量与费用
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <div className="text-[11px] text-gray-500">输入 Tokens</div>
            <div className="text-lg font-semibold tabular-nums text-white">
              {formatTokens(totalInput)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-gray-500">输出 Tokens</div>
            <div className="text-lg font-semibold tabular-nums text-white">
              {formatTokens(totalOutput)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-gray-500">预估费用（元）</div>
            <div className="text-lg font-semibold tabular-nums text-white">
              ¥{estimatedCostRmb.toFixed(2)}
            </div>
          </div>
        </div>
        <p className="mt-4 text-[11px] text-gray-500">
          预估费用仅供参考，实际计费以{" "}
          <a
            href={pricingDocUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-gray-400 underline hover:text-white"
          >
            火山方舟模型价格
            <ExternalLink size={10} />
          </a>{" "}
          为准。
        </p>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-surface-2 p-5">
        <h3 className="mb-3 text-xs font-medium text-gray-400">按会话明细</h3>
        {bySession.length === 0 ? (
          <p className="text-[11px] text-gray-500">暂无会话用量数据</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-white/10 text-gray-500">
                  <th className="pb-2 pr-4 font-medium">会话</th>
                  <th className="pb-2 pr-4 font-medium text-right">输入</th>
                  <th className="pb-2 pr-4 font-medium text-right">输出</th>
                  <th className="pb-2 font-medium text-right">预估费用</th>
                </tr>
              </thead>
              <tbody className="text-gray-400">
                {bySession.map((row) => (
                  <tr key={row.sessionId} className="border-b border-white/5">
                    <td className="py-2 pr-4">
                      {row.title || row.sessionId || "—"}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {formatTokens(row.tokenUsage.input)}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {formatTokens(row.tokenUsage.output)}
                    </td>
                    <td className="py-2 text-right tabular-nums text-gray-300">
                      ¥{row.estimatedCostRmb.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
