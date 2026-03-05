import { useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Circle,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { usePipelineStore, type StepState, type CheckItem } from "../../stores/pipeline-store";
import { useProjectStore } from "../../stores/project-store";

function AutoCheckRow({ item }: { item: CheckItem }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      {item.passed ? (
        <CheckCircle2 size={13} className="shrink-0 text-emerald-400" />
      ) : (
        <AlertCircle size={13} className="shrink-0 text-red-400" />
      )}
      <span className={item.passed ? "text-gray-300" : "text-red-300"}>{item.label}</span>
      {item.detail && <span className="text-gray-600">({item.detail})</span>}
    </div>
  );
}

function ManualCheckRow({
  item,
  checked,
  onChange,
  onNavigate,
}: {
  item: CheckItem;
  checked: boolean;
  onChange: (v: boolean) => void;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <button
        onClick={() => onChange(!checked)}
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
          checked
            ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
            : "border-gray-600 bg-transparent text-transparent"
        }`}
      >
        {checked && <CheckCircle2 size={10} />}
      </button>
      <span className="text-gray-300">{item.label}</span>
      {onNavigate && (
        <button onClick={onNavigate} className="text-accent hover:text-accent/80">
          <ExternalLink size={10} />
        </button>
      )}
    </div>
  );
}

export function StepReviewPanel({
  step,
  project,
}: {
  step: StepState;
  project: string;
}) {
  const { submitReview } = usePipelineStore();
  const setTab = useProjectStore((s) => s.setCurrentTab);
  const [notes, setNotes] = useState("");
  const [manualChecks, setManualChecks] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState(true);

  const checklist = step.review.checklist ?? [];
  const autoChecks = checklist.filter((c) => c.type === "auto");
  const manualCheckItems = checklist.filter((c) => c.type === "manual");
  const autoPassCount = autoChecks.filter((c) => c.passed).length;
  const allManualChecked = manualCheckItems.every((c) => manualChecks[c.id]);

  if (step.review.status === "not_started") return null;

  const NAV_MAP: Record<string, string> = {
    "extract-characters": "characters",
    "script-to-scenes": "scenes",
    "scenes-to-storyboard": "shots",
    "shots-to-images": "images",
    "shots-to-audio": "audio",
    "compose-video": "video",
  };

  return (
    <div className="rounded-lg border border-white/5 bg-surface-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-2.5"
      >
        <div className="flex items-center gap-2">
          <MessageSquare size={13} className="text-amber-400" />
          <span className="text-xs font-medium text-white">验收: {step.name}</span>
          {step.review.score != null && (
            <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[9px] text-gray-400">
              {step.review.score}/100
            </span>
          )}
        </div>
        {expanded ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 border-t border-white/5 px-4 py-3">
          {autoChecks.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
                自动检查 ({autoPassCount}/{autoChecks.length})
              </span>
              {autoChecks.map((item) => (
                <AutoCheckRow key={item.id} item={item} />
              ))}
            </div>
          )}

          {manualCheckItems.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
                人工确认
              </span>
              {manualCheckItems.map((item) => (
                <ManualCheckRow
                  key={item.id}
                  item={item}
                  checked={manualChecks[item.id] ?? false}
                  onChange={(v) => setManualChecks((prev) => ({ ...prev, [item.id]: v }))}
                  onNavigate={NAV_MAP[step.id] ? () => setTab(NAV_MAP[step.id]) : undefined}
                />
              ))}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-500">备注 (驳回时填写原因)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="rounded border border-white/10 bg-surface-3 px-2 py-1.5 text-[11px] text-white placeholder:text-gray-600"
              placeholder="可选..."
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => submitReview(project, step.id, "approve", { notes, checklist: manualChecks })}
              className="rounded bg-emerald-500/20 px-4 py-1.5 text-[11px] font-medium text-emerald-400 transition-colors hover:bg-emerald-500/30"
            >
              通过
            </button>
            <button
              onClick={() => submitReview(project, step.id, "reject", { notes, checklist: manualChecks })}
              className="rounded bg-red-500/20 px-4 py-1.5 text-[11px] font-medium text-red-400 transition-colors hover:bg-red-500/30"
            >
              驳回并重做
            </button>
            <button
              onClick={() => submitReview(project, step.id, "skip", { notes })}
              className="rounded bg-gray-500/20 px-4 py-1.5 text-[11px] font-medium text-gray-400 transition-colors hover:bg-gray-500/30"
            >
              跳过
            </button>
          </div>

          {step.review.status === "approved" && (
            <div className="rounded bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-400">
              已通过{step.review.reviewer === "auto" ? " (自动)" : ""}{step.review.reviewedAt ? ` — ${new Date(step.review.reviewedAt).toLocaleString()}` : ""}
            </div>
          )}
          {step.review.status === "rejected" && (
            <div className="rounded bg-red-500/10 px-3 py-2 text-[11px] text-red-400">
              已驳回{step.review.notes ? `: ${step.review.notes}` : ""}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
