import { join } from "path";
import { randomUUID } from "crypto";
import { getDb } from "../db/client.js";
import { getWorkspaceDir } from "./workspace.js";
import { syncAgentProjectDir } from "./workspace-config.js";
import { getStepDefinition } from "./step-actions.js";
import { buildStepPrompt } from "./prompt-templates.js";
import { getGateway } from "./gateway-client.js";
import {
  dequeueTask,
  markTaskComplete,
  markTaskFailed,
  enqueueNextStep,
  getNextStepId,
  type TaskQueueItem,
} from "./task-queue.js";

import { batchConfig } from "../config/batch.js";

const POLL_MS = batchConfig.pollMs;
const WORKER_ID = batchConfig.workerId;

function getTaskProjectName(taskId: string): string | null {
  const db = getDb();
  const row = db.prepare("SELECT project_name FROM batch_tasks WHERE id = ?").get(taskId) as
    | { project_name: string }
    | undefined;
  return row?.project_name ?? null;
}

function isJobRunning(jobId: string): boolean {
  const db = getDb();
  const row = db.prepare("SELECT status FROM batch_jobs WHERE id = ?").get(jobId) as
    | { status: string }
    | undefined;
  return row?.status === "running";
}

function getJobIdByTaskId(taskId: string): string | null {
  const db = getDb();
  const row = db.prepare("SELECT job_id FROM batch_tasks WHERE id = ?").get(taskId) as
    | { job_id: string }
    | undefined;
  return row?.job_id ?? null;
}

function getDefaultAction(stepId: string): string {
  const step = getStepDefinition(stepId);
  if (!step || step.actions.length === 0) return "run";
  return step.actions[0].id;
}

export async function runOneTask(item: TaskQueueItem): Promise<void> {
  const projectName = getTaskProjectName(item.taskId);
  if (!projectName) {
    markTaskFailed(item.id, "Task or project not found", false);
    return;
  }
  const jobId = getJobIdByTaskId(item.taskId);
  if (jobId && !isJobRunning(jobId)) {
    return;
  }

  const projectDir = join(getWorkspaceDir(), projectName);
  syncAgentProjectDir(projectDir);

  const step = getStepDefinition(item.stepId);
  if (!step) {
    markTaskFailed(item.id, `Unknown step: ${item.stepId}`, false);
    return;
  }

  const action = getDefaultAction(item.stepId);
  const prompt = buildStepPrompt(item.stepId, {
    projectDir,
    projectName,
    action,
    params: {},
  });

  const gateway = getGateway();
  if (!gateway.isConnected) {
    markTaskFailed(item.id, "Gateway not connected", true);
    return;
  }

  const sessionKey = `batch:${projectDir}:${item.stepId}`;
  let lastError: string | null = null;
  const db = getDb();
  const now = Date.now();
  db.prepare(
    "UPDATE batch_tasks SET current_step_id = ?, updated_at = ? WHERE id = ?",
  ).run(item.stepId, now, item.taskId);
  const executionId = randomUUID();
  db.prepare(
    `INSERT INTO task_executions (id, task_id, step_id, status, started_at) VALUES (?, ?, ?, 'running', ?)`,
  ).run(executionId, item.taskId, item.stepId, now);

  try {
    const stream = gateway.promptStream(prompt, {
      sessionKey,
      extraSystemPrompt: `[Batch Pipeline] 步骤: ${step.name} (${action})`,
      timeout: 600_000,
    });

    for await (const event of stream) {
      if (event.type === "error") {
        lastError = event.error ?? "Unknown error";
        break;
      }
      if (event.type === "done") break;
    }

    if (lastError) {
      db.prepare(
        "UPDATE task_executions SET status = 'failed', completed_at = ?, error_message = ? WHERE id = ?",
      ).run(Date.now(), lastError, executionId);
      markTaskFailed(item.id, lastError, true);
      return;
    }

    db.prepare(
      "UPDATE task_executions SET status = 'completed', completed_at = ? WHERE id = ?",
    ).run(Date.now(), executionId);
    markTaskComplete(item.id);
    enqueueNextStep(item.taskId, item.stepId);
    const hasNext = getNextStepId(item.stepId) !== null;
    if (!hasNext) {
      const now = Date.now();
      db.prepare(
        "UPDATE batch_tasks SET status = 'completed', progress = 100, updated_at = ?, completed_at = ? WHERE id = ?",
      ).run(now, now, item.taskId);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    db.prepare(
      "UPDATE task_executions SET status = 'failed', completed_at = ?, error_message = ? WHERE id = ?",
    ).run(Date.now(), msg, executionId);
    markTaskFailed(item.id, msg, true);
  }
}

export async function workerLoop(): Promise<void> {
  const item = dequeueTask(WORKER_ID);
  if (item) {
    await runOneTask(item);
    return;
  }
}

export function startWorkerLoop(intervalMs: number = POLL_MS): NodeJS.Timeout {
  const tick = async () => {
    try {
      await workerLoop();
    } catch (err) {
      console.error("[batch-worker]", (err as Error).message);
    }
  };
  const id = setInterval(tick, intervalMs);
  tick();
  return id;
}
