import { useEffect } from "react";
import {
  GitBranch,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Circle,
  Loader2,
  ChevronRight,
  FlaskConical,
  Settings2,
} from "lucide-react";
import { usePipelineStore, type StepState, type StepDefinition } from "../../stores/pipeline-store";
import { useProjectStore } from "../../stores/project-store";

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: typeof CheckCircle2 }> = {
  completed: { color: "text-emerald-400", bg: "bg-emerald-500/20", icon: CheckCircle2 },
  partial: { color: "text-amber-400", bg: "bg-amber-500/20", icon: AlertCircle },
  running: { color: "text-blue-400", bg: "bg-blue-500/20", icon: Loader2 },
  error: { color: "text-red-400", bg: "bg-red-500/20", icon: AlertCircle },
  pending: { color: "text-gray-500", bg: "bg-gray-500/10", icon: Circle },
  ready: { color: "text-gray-400", bg: "bg-gray-500/10", icon: Circle },
};

const REVIEW_LABELS: Record<string, { label: string; color: string }> = {
  not_started: { label: "", color: "" },
  pending_review: { label: "待验收", color: "text-amber-400" },
  approved: { label: "已通过", color: "text-emerald-400" },
  rejected: { label: "已驳回", color: "text-red-400" },
  skipped: { label: "已跳过", color: "text-gray-500" },
};

const GATE_MODES = [
  { id: "none" as const, label: "无门控" },
  { id: "auto" as const, label: "自动放行" },
  { id: "manual" as const, label: "人工确认" },
  { id: "strict" as const, label: "严格模式" },
];

function StepNode({
  step,
  def,
  isSelected,
  isRunning,
  onClick,
}: {
  step: StepState;
  def?: StepDefinition;
  isSelected: boolean;
  isRunning: boolean;
  onClick: () => void;
}) {
  const cfg = STATUS_CONFIG[step.status] ?? STATUS_CONFIG.pending;
  const Icon = isRunning ? Loader2 : cfg.icon;
  const reviewInfo = REVIEW_LABELS[step.review.status];

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all ${
        isSelected
          ? "border-accent/50 bg-accent/5"
          : "border-white/5 bg-surface-2 hover:border-white/10"
      }`}
    >
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cfg.bg}`}>
        <Icon size={14} className={`${isRunning ? "animate-spin text-blue-400" : cfg.color}`} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-white">
            {def?.order ? `${def.order}. ` : ""}{step.name}
          </span>
          {def?.optional && (
            <span className="rounded bg-gray-700/50 px-1 text-[9px] text-gray-500">可选</span>
          )}
          {reviewInfo.label && (
            <span className={`text-[9px] ${reviewInfo.color}`}>{reviewInfo.label}</span>
          )}
        </div>
        {step.totalCount != null && step.totalCount > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
              <div
                className={`h-full rounded-full transition-all ${
                  step.status === "completed" ? "bg-emerald-500" : "bg-accent"
                }`}
                style={{
                  width: `${Math.round(((step.completedCount ?? 0) / step.totalCount) * 100)}%`,
                }}
              />
            </div>
            <span className="text-[10px] text-gray-500">
              {step.completedCount ?? 0}/{step.totalCount}
            </span>
          </div>
        )}
        {step.status === "pending" && !step.canRun && (
          <span className="text-[10px] text-gray-600">等待前置步骤完成</span>
        )}
      </div>
      <ChevronRight size={14} className="shrink-0 text-gray-600" />
    </button>
  );
}

function StepDetailPanel({
  step,
  def,
  project,
}: {
  step: StepState;
  def: StepDefinition;
  project: string;
}) {
  const { runStep, runningStep, stepParams, setStepParam, submitReview } = usePipelineStore();
  const isRunning = runningStep === step.id;
  const params = stepParams[step.id] ?? {};

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-white/5 bg-surface-2 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">{step.name}</h3>
        <span className="rounded bg-gray-800 px-2 py-0.5 text-[10px] text-gray-400">
          {def.skill}
        </span>
      </div>

      {def.params.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">参数</span>
          {def.params.map((p) => (
            <div key={p.key} className="flex items-center gap-2">
              <label className="w-24 text-[11px] text-gray-400">{p.label}</label>
              {p.type === "select" && (
                <select
                  value={String(params[p.key] ?? p.default ?? "")}
                  onChange={(e) => setStepParam(step.id, p.key, e.target.value)}
                  className="flex-1 rounded border border-white/10 bg-surface-3 px-2 py-1 text-[11px] text-white"
                >
                  {p.options?.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              )}
              {p.type === "number" && (
                <input
                  type="number"
                  value={String(params[p.key] ?? p.default ?? "")}
                  onChange={(e) => setStepParam(step.id, p.key, Number(e.target.value))}
                  className="w-20 rounded border border-white/10 bg-surface-3 px-2 py-1 text-[11px] text-white"
                />
              )}
              {p.type === "toggle" && (
                <button
                  onClick={() => setStepParam(step.id, p.key, !(params[p.key] ?? p.default))}
                  className={`h-5 w-9 rounded-full transition-colors ${
                    (params[p.key] ?? p.default) ? "bg-accent" : "bg-gray-700"
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded-full bg-white transition-transform ${
                      (params[p.key] ?? p.default) ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {def.actions.filter((a) => !a.requiresSelection).map((action) => (
          <button
            key={action.id}
            onClick={() => runStep(project, step.id, action.id)}
            disabled={isRunning || !step.canRun}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-[11px] font-medium transition-colors disabled:opacity-40 ${
              action.variant === "primary"
                ? "bg-accent text-white hover:bg-accent/80"
                : action.variant === "danger"
                  ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                  : "bg-white/5 text-gray-300 hover:bg-white/10"
            }`}
          >
            {isRunning ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
            {action.label}
          </button>
        ))}
      </div>

      {step.review.status === "pending_review" && (
        <div className="flex flex-col gap-2 rounded border border-amber-500/20 bg-amber-500/5 p-3">
          <span className="text-[11px] font-medium text-amber-400">待验收</span>
          {step.review.checklist?.map((item) => (
            <div key={item.id} className="flex items-center gap-2 text-[11px]">
              {item.type === "auto" ? (
                item.passed ? (
                  <CheckCircle2 size={12} className="text-emerald-400" />
                ) : (
                  <AlertCircle size={12} className="text-red-400" />
                )
              ) : (
                <Circle size={12} className="text-gray-500" />
              )}
              <span className={item.passed === false ? "text-red-400" : "text-gray-300"}>
                {item.label}
              </span>
              {item.detail && <span className="text-gray-600">({item.detail})</span>}
            </div>
          ))}
          <div className="mt-1 flex gap-2">
            <button
              onClick={() => submitReview(project, step.id, "approve")}
              className="rounded bg-emerald-500/20 px-3 py-1 text-[11px] text-emerald-400 hover:bg-emerald-500/30"
            >
              通过
            </button>
            <button
              onClick={() => submitReview(project, step.id, "reject")}
              className="rounded bg-red-500/20 px-3 py-1 text-[11px] text-red-400 hover:bg-red-500/30"
            >
              驳回
            </button>
            <button
              onClick={() => submitReview(project, step.id, "skip")}
              className="rounded bg-gray-500/20 px-3 py-1 text-[11px] text-gray-400 hover:bg-gray-500/30"
            >
              跳过
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function PipelineView({ project }: { project: string }) {
  const {
    steps,
    definitions,
    config,
    overallProgress,
    runningStep,
    selectedStep,
    setSelectedStep,
    fetchState,
    updateConfig,
  } = usePipelineStore();

  const setTab = useProjectStore((s) => s.setCurrentTab);

  useEffect(() => {
    fetchState(project);
    const interval = setInterval(() => fetchState(project), 5000);
    return () => clearInterval(interval);
  }, [project, fetchState]);

  const selectedStepState = steps.find((s) => s.id === selectedStep);
  const selectedStepDef = definitions.find((d) => d.id === selectedStep);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch size={16} className="text-accent" />
          <h2 className="text-sm font-medium text-white">创作流水线</h2>
          <span className="text-[10px] text-gray-600">{project}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Settings2 size={12} className="text-gray-500" />
            <span className="text-[10px] text-gray-500">门控:</span>
            <select
              value={config.gateMode}
              onChange={(e) => updateConfig(project, { gateMode: e.target.value as typeof config.gateMode })}
              className="rounded border border-white/10 bg-surface-3 px-1.5 py-0.5 text-[10px] text-gray-300"
            >
              {GATE_MODES.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
          <span className="text-[11px] text-gray-400">{overallProgress}%</span>
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          {steps.map((step) => {
            const def = definitions.find((d) => d.id === step.id);
            return (
              <StepNode
                key={step.id}
                step={step}
                def={def}
                isSelected={selectedStep === step.id}
                isRunning={runningStep === step.id}
                onClick={() => {
                  setSelectedStep(step.id === selectedStep ? null : step.id);
                  if (def?.contentTab) {
                    setTab(def.contentTab);
                  }
                }}
              />
            );
          })}

          <button
            onClick={async () => {
              const res = await fetch(`/api/pipeline/${encodeURIComponent(project)}/test`, { method: "POST" });
              if (res.ok) fetchState(project);
            }}
            className="mt-2 flex items-center justify-center gap-1.5 rounded border border-white/5 bg-surface-2 py-2 text-[11px] text-gray-400 transition-colors hover:border-white/10 hover:text-gray-300"
          >
            <FlaskConical size={12} />
            运行测试验收
          </button>
        </div>

        <div>
          {selectedStepState && selectedStepDef ? (
            <StepDetailPanel
              step={selectedStepState}
              def={selectedStepDef}
              project={project}
            />
          ) : (
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-white/5 text-[11px] text-gray-600">
              选择一个步骤查看详情
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
