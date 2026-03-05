import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { getWorkspaceDir } from "./workspace.js";
import { detectPipelineState, type StepState, type ReviewState, type CheckItem } from "./pipeline-state.js";
import { runAutoReview } from "./step-review.js";
import { STEP_DEFINITIONS } from "./step-actions.js";

export interface TestStepResult {
  stepId: string;
  stepName: string;
  executionStatus: "completed" | "failed" | "skipped" | "pending";
  executionDuration: number;
  reviewChecklist: CheckItem[];
  autoChecksPassRate: number;
  artifacts: {
    type: string;
    count: number;
    samples: string[];
  };
  error?: string;
}

export interface TestRun {
  id: string;
  project: string;
  status: "running" | "completed" | "failed" | "aborted";
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

function pipelineDir(projectDir: string): string {
  return join(projectDir, ".pipeline");
}

function testRunsDir(projectDir: string): string {
  return join(pipelineDir(projectDir), "test-runs");
}

function buildStepResult(step: StepState, review: ReviewState): TestStepResult {
  const checklist = review.checklist ?? [];
  const autoChecks = checklist.filter((c: CheckItem) => c.type === "auto");
  const passRate = autoChecks.length > 0
    ? autoChecks.filter((c: CheckItem) => c.passed).length / autoChecks.length
    : 1;

  let execStatus: TestStepResult["executionStatus"] = "pending";
  if (step.status === "completed") execStatus = "completed";
  else if (step.status === "partial") execStatus = "completed";
  else if (step.status === "error") execStatus = "failed";

  return {
    stepId: step.id,
    stepName: step.name,
    executionStatus: execStatus,
    executionDuration: 0,
    reviewChecklist: checklist,
    autoChecksPassRate: passRate,
    artifacts: {
      type: step.id,
      count: step.completedCount ?? 0,
      samples: [],
    },
  };
}

/**
 * Generate a test report from the current pipeline state.
 * Does NOT execute steps — just inspects current project files and runs auto-review.
 */
export function generateTestReport(projectName: string): TestRun {
  const state = detectPipelineState(projectName);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "").slice(0, 15);
  const id = `test_${timestamp}`;

  const steps: TestStepResult[] = [];

  for (const stepDef of STEP_DEFINITIONS) {
    const pipelineStep = state.steps.find((s) => s.id === stepDef.id);
    if (!pipelineStep) continue;

    const review = runAutoReview(projectName, stepDef.id);
    steps.push(buildStepResult(pipelineStep, review));
  }

  const passed = steps.filter((s) => s.executionStatus === "completed" && s.autoChecksPassRate === 1).length;
  const failed = steps.filter((s) => s.executionStatus === "failed").length;
  const skipped = steps.filter((s) => s.executionStatus === "skipped").length;
  const pending = steps.filter((s) => s.executionStatus === "pending").length;
  const totalScore = steps.length > 0
    ? Math.round(steps.reduce((acc, s) => acc + s.autoChecksPassRate * 100, 0) / steps.length)
    : 0;

  const report: TestRun = {
    id,
    project: projectName,
    status: failed > 0 ? "failed" : pending > 0 ? "running" : "completed",
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    steps,
    summary: {
      totalSteps: steps.length,
      passed,
      failed,
      skipped,
      pending,
      duration: 0,
      autoScore: totalScore,
    },
  };

  saveTestReport(projectName, report);
  return report;
}

function saveTestReport(projectName: string, report: TestRun): void {
  const projectDir = join(getWorkspaceDir(), projectName);
  const dir = testRunsDir(projectDir);
  mkdirSync(dir, { recursive: true });
  const fileName = `${report.id}.json`;
  writeFileSync(join(dir, fileName), JSON.stringify(report, null, 2), "utf-8");
}

export function listTestReports(projectName: string): TestRun[] {
  const projectDir = join(getWorkspaceDir(), projectName);
  const dir = testRunsDir(projectDir);
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse()
    .slice(0, 20)
    .map((f) => {
      try {
        return JSON.parse(readFileSync(join(dir, f), "utf-8")) as TestRun;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as TestRun[];
}

export function getTestReport(projectName: string, reportId: string): TestRun | null {
  const projectDir = join(getWorkspaceDir(), projectName);
  const filePath = join(testRunsDir(projectDir), `${reportId}.json`);
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}
