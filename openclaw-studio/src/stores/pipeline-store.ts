import { create } from "zustand";
import { api } from "../lib/api-client";

export interface CheckItem {
  id: string;
  label: string;
  type: "auto" | "manual";
  passed: boolean | null;
  detail?: string;
}

export interface ReviewState {
  status: "not_started" | "pending_review" | "approved" | "rejected" | "skipped";
  reviewedAt?: string;
  reviewer?: string;
  notes?: string;
  checklist?: CheckItem[];
  score?: number;
}

export interface StepState {
  id: string;
  name: string;
  status: "pending" | "ready" | "running" | "completed" | "partial" | "error";
  completedCount?: number;
  totalCount?: number;
  lastUpdated?: string;
  canRun: boolean;
  review: ReviewState;
}

export interface ParamSchema {
  key: string;
  label: string;
  type: "select" | "text" | "number" | "toggle";
  options?: Array<{ value: string; label: string }>;
  default?: unknown;
}

export interface StepAction {
  id: string;
  label: string;
  variant: "primary" | "secondary" | "danger";
  requiresSelection?: boolean;
}

export interface StepDefinition {
  id: string;
  name: string;
  skill: string;
  order: number;
  dependsOn: string[];
  optional: boolean;
  parallelWith?: string[];
  actions: StepAction[];
  params: ParamSchema[];
  contentTab: string;
}

export interface PipelineConfig {
  gateMode: "none" | "auto" | "manual" | "strict";
}

export interface ExecutionLog {
  type: string;
  content?: string;
  toolCall?: { id: string; title: string; status: string; output?: string };
  usage?: { input: number; output: number; total: number; context: number };
}

interface PipelineStore {
  steps: StepState[];
  definitions: StepDefinition[];
  config: PipelineConfig;
  overallProgress: number;
  runningStep: string | null;
  selectedStep: string | null;
  stepParams: Record<string, Record<string, unknown>>;
  executionLogs: ExecutionLog[];
  executionMinimized: boolean;

  fetchState: (project: string) => Promise<void>;
  runStep: (project: string, stepId: string, action: string, params?: Record<string, unknown>, selectedIds?: string[]) => Promise<void>;
  setSelectedStep: (stepId: string | null) => void;
  setStepParam: (stepId: string, key: string, value: unknown) => void;
  setExecutionMinimized: (v: boolean) => void;
  stopExecution: () => void;
  submitReview: (project: string, stepId: string, action: "approve" | "reject" | "skip", opts?: { notes?: string; checklist?: Record<string, boolean> }) => Promise<void>;
  updateConfig: (project: string, config: Partial<PipelineConfig>) => Promise<void>;
}

let abortController: AbortController | null = null;

export const usePipelineStore = create<PipelineStore>((set, get) => ({
  steps: [],
  definitions: [],
  config: { gateMode: "auto" },
  overallProgress: 0,
  runningStep: null,
  selectedStep: null,
  stepParams: {},
  executionLogs: [],
  executionMinimized: false,

  fetchState: async (project) => {
    try {
      const data = await api.pipeline.state(project);
      set({
        steps: data.steps,
        definitions: data.definitions,
        config: data.config,
        overallProgress: data.overallProgress,
      });
    } catch {}
  },

  runStep: async (project, stepId, action, params, selectedIds) => {
    set({ runningStep: stepId, executionLogs: [], executionMinimized: false });

    abortController = new AbortController();

    try {
      const res = await fetch(`/api/pipeline/${encodeURIComponent(project)}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stepId,
          action,
          params: { ...get().stepParams[stepId], ...params },
          selectedIds,
        }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        set((s) => ({
          executionLogs: [...s.executionLogs, { type: "error", content: text }],
          runningStep: null,
        }));
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6);
          if (raw === "[DONE]") continue;

          try {
            const parsed = JSON.parse(raw);

            if (parsed.type === "pipeline_state") {
              set({
                steps: parsed.state.steps,
                overallProgress: parsed.state.overallProgress,
              });
              continue;
            }

            set((s) => ({
              executionLogs: [...s.executionLogs, parsed],
            }));
          } catch {}
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        set((s) => ({
          executionLogs: [...s.executionLogs, { type: "error", content: (err as Error).message }],
        }));
      }
    } finally {
      abortController = null;
      set({ runningStep: null });
      await get().fetchState(project);
    }
  },

  setSelectedStep: (stepId) => set({ selectedStep: stepId }),
  setStepParam: (stepId, key, value) =>
    set((s) => ({
      stepParams: {
        ...s.stepParams,
        [stepId]: { ...s.stepParams[stepId], [key]: value },
      },
    })),
  setExecutionMinimized: (v) => set({ executionMinimized: v }),
  stopExecution: () => {
    abortController?.abort();
    set({ runningStep: null });
  },

  submitReview: async (project, stepId, action, opts) => {
    try {
      await api.pipeline.submitReview(project, stepId, { action, ...opts });
      await get().fetchState(project);
    } catch {}
  },

  updateConfig: async (project, patch) => {
    try {
      await api.pipeline.updateConfig(project, patch);
      set((s) => ({ config: { ...s.config, ...patch } }));
    } catch {}
  },
}));
