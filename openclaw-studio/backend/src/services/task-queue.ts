import { getDb } from "../db/client.js";
import { randomUUID } from "crypto";
import { STEP_DEFINITIONS } from "./step-actions.js";

export interface TaskQueueItem {
  id: string;
  taskId: string;
  stepId: string;
  priority: number;
  status: string;
  workerId: string | null;
  scheduledAt: number;
  startedAt: number | null;
  retryCount: number;
  maxRetries: number;
  createdAt: number;
}

const FIRST_STEP_IDS = [
  "long-novel-to-script",
  "extract-characters",
  "extract-props",
  "script-to-scenes",
];

function getFirstStepId(): string {
  return FIRST_STEP_IDS[0];
}

export function enqueueTask(
  taskId: string,
  stepId: string,
  priority: number = 0,
  retryCount: number = 0,
): string {
  const db = getDb();
  const id = randomUUID();
  const now = Date.now();
  db.prepare(
    `INSERT INTO task_queue (id, task_id, step_id, priority, status, scheduled_at, retry_count, max_retries, created_at)
     VALUES (?, ?, ?, ?, 'pending', ?, ?, 3, ?)`,
  ).run(id, taskId, stepId, priority, now, retryCount, now);
  return id;
}

export function enqueueJobFirstSteps(jobId: string): number {
  const db = getDb();
  const rows = db.prepare(
    "SELECT id FROM batch_tasks WHERE job_id = ? AND status IN ('pending', 'queued')",
  ).all(jobId) as Array<{ id: string }>;
  const stepId = getFirstStepId();
  for (const r of rows) {
    enqueueTask(r.id, stepId, 0);
    db.prepare("UPDATE batch_tasks SET status = 'queued' WHERE id = ?").run(r.id);
  }
  return rows.length;
}

export function dequeueTask(workerId: string): TaskQueueItem | null {
  const db = getDb();
  const now = Date.now();
  const job = db.prepare(
    `SELECT id, task_id, step_id, priority, scheduled_at, retry_count, max_retries, created_at
     FROM task_queue
     WHERE status = 'pending' AND scheduled_at <= ?
     ORDER BY priority DESC, scheduled_at ASC
     LIMIT 1`,
  ).get(now) as {
    id: string;
    task_id: string;
    step_id: string;
    priority: number;
    scheduled_at: number;
    retry_count: number;
    max_retries: number;
    created_at: number;
  } | undefined;

  if (!job) return null;

  db.prepare(
    "UPDATE task_queue SET status = 'running', worker_id = ?, started_at = ? WHERE id = ?",
  ).run(workerId, now, job.id);
  db.prepare("UPDATE batch_tasks SET status = 'running', updated_at = ? WHERE id = ?").run(now, job.task_id);

  return {
    id: job.id,
    taskId: job.task_id,
    stepId: job.step_id,
    priority: job.priority,
    status: "running",
    workerId,
    scheduledAt: job.scheduled_at,
    startedAt: now,
    retryCount: job.retry_count,
    maxRetries: job.max_retries,
    createdAt: job.created_at,
  };
}

export function markTaskComplete(queueId: string, _result?: unknown): void {
  const db = getDb();
  const now = Date.now();
  const row = db.prepare("SELECT task_id, step_id FROM task_queue WHERE id = ?").get(queueId) as
    | { task_id: string; step_id: string }
    | undefined;
  if (!row) return;
  db.prepare("UPDATE task_queue SET status = 'completed', started_at = started_at WHERE id = ?").run(queueId);
  db.prepare("UPDATE batch_tasks SET updated_at = ? WHERE id = ?").run(now, row.task_id);
}

export function markTaskFailed(queueId: string, error: string, retry: boolean): void {
  const db = getDb();
  const now = Date.now();
  const row = db.prepare("SELECT task_id, step_id, retry_count, max_retries FROM task_queue WHERE id = ?").get(
    queueId,
  ) as { task_id: string; step_id: string; retry_count: number; max_retries: number } | undefined;
  if (!row) return;
  db.prepare("UPDATE task_queue SET status = 'failed' WHERE id = ?").run(queueId);
  db.prepare(
    "UPDATE batch_tasks SET status = 'failed', error_message = ?, updated_at = ? WHERE id = ?",
  ).run(error, now, row.task_id);
  if (retry && row.retry_count < row.max_retries) {
    enqueueTask(row.task_id, row.step_id, 0, row.retry_count + 1);
  }
}

export function getNextStepId(currentStepId: string): string | null {
  const ordered = [...STEP_DEFINITIONS].sort((a, b) => a.order - b.order);
  const idx = ordered.findIndex((s) => s.id === currentStepId);
  if (idx < 0 || idx >= ordered.length - 1) return null;
  return ordered[idx + 1].id;
}

export function enqueueNextStep(taskId: string, completedStepId: string): void {
  const nextId = getNextStepId(completedStepId);
  if (nextId) enqueueTask(taskId, nextId, 0);
}
