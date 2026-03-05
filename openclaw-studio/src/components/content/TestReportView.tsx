import { useState } from "react";
import {
  FlaskConical,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Circle,
} from "lucide-react";
import { useTestReports } from "../../hooks/use-pipeline";

interface TestStepResult {
  stepId: string;
  stepName: string;
  executionStatus: "completed" | "failed" | "skipped" | "pending";
  executionDuration: number;
  autoChecksPassRate: number;
  artifacts: { type: string; count: number };
  reviewChecklist: Array<{ id: string; label: string; type: string; passed: boolean | null; detail?: string }>;
  error?: string;
}

interface TestRun {
  id: string;
  project: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  steps: TestStepResult[];
  summary: {
    totalSteps: number;
    passed: number;
    failed: number;
    skipped: number;
    pending: number;
    duration: number;
    autoScore: number;
  };
}

const STATUS_ICON = {
  completed: { icon: CheckCircle2, color: "text-emerald-400" },
  failed: { icon: AlertCircle, color: "text-red-400" },
  skipped: { icon: Circle, color: "text-gray-500" },
  pending: { icon: Clock, color: "text-gray-500" },
} as const;

function StepResultRow({ step }: { step: TestStepResult }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_ICON[step.executionStatus] ?? STATUS_ICON.pending;
  const Icon = cfg.icon;

  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-white/[.02]"
      >
        <Icon size={13} className={cfg.color} />
        <span className="flex-1 text-[11px] text-white">{step.stepName}</span>
        <span className="text-[10px] text-gray-500">
          {Math.round(step.autoChecksPassRate * 100)}%
        </span>
        <span className="w-14 text-right text-[10px] text-gray-600">
          {step.artifacts.count} 产物
        </span>
        {step.error ? (
          <ChevronDown size={12} className="text-gray-600" />
        ) : expanded ? (
          <ChevronUp size={12} className="text-gray-600" />
        ) : (
          <ChevronDown size={12} className="text-gray-600" />
        )}
      </button>
      {expanded && (
        <div className="flex flex-col gap-1 bg-surface-3/50 px-6 py-2">
          {step.reviewChecklist.map((c) => (
            <div key={c.id} className="flex items-center gap-2 text-[10px]">
              {c.passed === true ? (
                <CheckCircle2 size={10} className="text-emerald-400" />
              ) : c.passed === false ? (
                <AlertCircle size={10} className="text-red-400" />
              ) : (
                <Circle size={10} className="text-gray-600" />
              )}
              <span className="text-gray-400">{c.label}</span>
              {c.detail && <span className="text-gray-600">({c.detail})</span>}
            </div>
          ))}
          {step.error && (
            <div className="mt-1 rounded bg-red-500/10 px-2 py-1 text-[10px] text-red-400">
              {step.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReportCard({ report, isLatest }: { report: TestRun; isLatest: boolean }) {
  const [expanded, setExpanded] = useState(isLatest);

  return (
    <div className="rounded-lg border border-white/5 bg-surface-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <FlaskConical size={14} className={report.status === "completed" ? "text-emerald-400" : "text-amber-400"} />
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="text-[11px] font-medium text-white">
            {new Date(report.startedAt).toLocaleString()}
          </span>
          <span className="text-[10px] text-gray-500">
            {report.summary.passed} 通过 / {report.summary.failed} 失败 / {report.summary.pending} 待定
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${report.summary.autoScore >= 80 ? "text-emerald-400" : report.summary.autoScore >= 50 ? "text-amber-400" : "text-red-400"}`}>
            {report.summary.autoScore}
          </span>
          <span className="text-[10px] text-gray-600">/100</span>
        </div>
        {expanded ? <ChevronUp size={14} className="text-gray-600" /> : <ChevronDown size={14} className="text-gray-600" />}
      </button>
      {expanded && (
        <div className="border-t border-white/5">
          {report.steps.map((step) => (
            <StepResultRow key={step.stepId} step={step} />
          ))}
        </div>
      )}
    </div>
  );
}

export function TestReportView({ project }: { project: string }) {
  const { data: reports, mutate } = useTestReports(project);

  const handleRunTest = async () => {
    await fetch(`/api/pipeline/${encodeURIComponent(project)}/test`, { method: "POST" });
    mutate();
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical size={16} className="text-accent" />
          <h2 className="text-sm font-medium text-white">测试报告</h2>
        </div>
        <button
          onClick={handleRunTest}
          className="flex items-center gap-1.5 rounded bg-accent/80 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-accent"
        >
          <RefreshCw size={12} />
          运行测试
        </button>
      </div>

      {!reports?.length ? (
        <div className="flex h-32 items-center justify-center text-[11px] text-gray-600">
          暂无测试报告，点击"运行测试"开始
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map((report: TestRun, i: number) => (
            <ReportCard key={report.id} report={report} isLatest={i === 0} />
          ))}
        </div>
      )}
    </div>
  );
}
