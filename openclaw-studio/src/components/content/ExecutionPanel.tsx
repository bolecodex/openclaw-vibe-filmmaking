import { useRef, useEffect } from "react";
import {
  Loader2,
  X,
  Minimize2,
  Maximize2,
  Square,
  ChevronDown,
  ChevronUp,
  Wrench,
} from "lucide-react";
import { usePipelineStore, type ExecutionLog } from "../../stores/pipeline-store";

function LogEntry({ log }: { log: ExecutionLog }) {
  if (log.type === "text" && log.content) {
    return <span className="text-gray-300">{log.content}</span>;
  }
  if (log.type === "thinking" && log.content) {
    return <span className="italic text-gray-500">{log.content}</span>;
  }
  if (log.type === "tool_start" && log.toolCall) {
    return (
      <span className="flex items-center gap-1 text-blue-400">
        <Wrench size={10} />
        {log.toolCall.title}
        <Loader2 size={10} className="animate-spin" />
      </span>
    );
  }
  if (log.type === "tool_update" && log.toolCall) {
    const isOk = log.toolCall.status === "completed";
    return (
      <span className={`flex items-center gap-1 ${isOk ? "text-emerald-400" : "text-red-400"}`}>
        <Wrench size={10} />
        {log.toolCall.title} — {isOk ? "完成" : "失败"}
      </span>
    );
  }
  if (log.type === "error") {
    return <span className="text-red-400">{log.content}</span>;
  }
  return null;
}

export function ExecutionPanel() {
  const { runningStep, executionLogs, executionMinimized, setExecutionMinimized, stopExecution, steps } =
    usePipelineStore();

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [executionLogs.length]);

  if (!runningStep && executionLogs.length === 0) return null;

  const step = steps.find((s) => s.id === runningStep);
  const stepName = step?.name ?? runningStep ?? "任务";
  const isRunning = !!runningStep;

  if (executionMinimized) {
    return (
      <div className="flex items-center gap-2 border-t border-white/5 bg-surface-2 px-3 py-1.5">
        {isRunning && <Loader2 size={12} className="animate-spin text-accent" />}
        <span className="flex-1 text-[10px] text-gray-400">
          {isRunning ? `执行中: ${stepName}` : "执行完成"}
        </span>
        <button
          onClick={() => setExecutionMinimized(false)}
          className="text-gray-500 hover:text-gray-300"
        >
          <Maximize2 size={12} />
        </button>
        {!isRunning && (
          <button
            onClick={() => usePipelineStore.setState({ executionLogs: [] })}
            className="text-gray-500 hover:text-gray-300"
          >
            <X size={12} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex max-h-48 flex-col border-t border-white/5 bg-surface-2">
      <div className="flex items-center gap-2 border-b border-white/5 px-3 py-1.5">
        {isRunning && <Loader2 size={12} className="animate-spin text-accent" />}
        <span className="flex-1 text-[11px] font-medium text-white">
          {isRunning ? `执行中: ${stepName}` : `执行完成: ${stepName}`}
        </span>
        {isRunning && (
          <button
            onClick={stopExecution}
            className="flex items-center gap-1 rounded bg-red-500/20 px-2 py-0.5 text-[10px] text-red-400 hover:bg-red-500/30"
          >
            <Square size={8} />
            停止
          </button>
        )}
        <button
          onClick={() => setExecutionMinimized(true)}
          className="text-gray-500 hover:text-gray-300"
        >
          <Minimize2 size={12} />
        </button>
        {!isRunning && (
          <button
            onClick={() => usePipelineStore.setState({ executionLogs: [] })}
            className="text-gray-500 hover:text-gray-300"
          >
            <X size={12} />
          </button>
        )}
      </div>
      <div ref={scrollRef} className="flex-1 overflow-auto px-3 py-2">
        <div className="flex flex-col gap-1 font-mono text-[10px]">
          {executionLogs.map((log, i) => (
            <LogEntry key={i} log={log} />
          ))}
          {isRunning && executionLogs.length === 0 && (
            <span className="text-gray-600">等待 Agent 响应...</span>
          )}
        </div>
      </div>
    </div>
  );
}
