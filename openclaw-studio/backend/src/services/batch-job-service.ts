import { readdirSync, statSync, copyFileSync, existsSync, mkdirSync } from "fs";
import { join, basename, extname } from "path";
import { getDb } from "../db/client.js";
import { getWorkspaceDir } from "./workspace.js";
import { createProject } from "./workspace.js";
import { randomUUID } from "crypto";

const NOVEL_EXT = [".md", ".txt"];

export interface CreateBatchJobInput {
  name: string;
  inputFolder: string; // absolute path or relative to workspace
}

export interface BatchJobSummary {
  id: string;
  name: string;
  status: string;
  inputFolder: string;
  workspacePath: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  pendingTasks: number;
  runningTasks: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

function resolveInputFolder(inputFolder: string): string {
  if (inputFolder.startsWith("/")) return inputFolder;
  return join(getWorkspaceDir(), inputFolder);
}

function sanitizeProjectName(name: string): string {
  return name.replace(/[^\p{L}\p{N}\-_]/gu, "_").slice(0, 80) || "novel";
}

export function scanNovelFiles(inputFolder: string): string[] {
  const resolved = resolveInputFolder(inputFolder);
  if (!existsSync(resolved) || !statSync(resolved).isDirectory()) {
    throw new Error(`Folder not found: ${inputFolder}`);
  }
  const files: string[] = [];
  for (const entry of readdirSync(resolved, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const ext = extname(entry.name).toLowerCase();
    if (NOVEL_EXT.includes(ext)) {
      files.push(join(resolved, entry.name));
    }
  }
  return files.sort();
}

export function createBatchJob(input: CreateBatchJobInput): BatchJobSummary {
  const db = getDb();
  const workspacePath = getWorkspaceDir();
  const inputFolderResolved = resolveInputFolder(input.inputFolder);
  const novelFiles = scanNovelFiles(input.inputFolder);
  if (novelFiles.length === 0) {
    throw new Error("No novel files (.md or .txt) found in folder");
  }

  const jobId = randomUUID();
  const now = Date.now();

  db.prepare(
    `INSERT INTO batch_jobs (id, name, status, input_folder, workspace_path, created_at, updated_at, meta)
     VALUES (?, ?, 'pending', ?, ?, ?, ?, ?)`,
  ).run(
    jobId,
    input.name,
    inputFolderResolved,
    workspacePath,
    now,
    now,
    JSON.stringify({ totalTasks: novelFiles.length }),
  );

  const taskIds: string[] = [];
  for (const novelPath of novelFiles) {
    const base = basename(novelPath, extname(novelPath));
    const projectName = sanitizeProjectName(base);
    const taskId = randomUUID();
    taskIds.push(taskId);

    createProject(projectName);
    const projectDir = join(workspacePath, projectName);
    const destName = basename(novelPath);
    const destPath = join(projectDir, destName);
    copyFileSync(novelPath, destPath);

    db.prepare(
      `INSERT INTO batch_tasks (id, job_id, project_name, novel_file, status, progress, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'pending', 0, ?, ?)`,
    ).run(taskId, jobId, projectName, destName, now, now);
  }

  return getBatchJobSummary(jobId)!;
}

export function getBatchJobSummary(jobId: string): BatchJobSummary | null {
  const db = getDb();
  const row = db.prepare(
    "SELECT * FROM batch_jobs WHERE id = ?",
  ).get(jobId) as {
    id: string;
    name: string;
    status: string;
    input_folder: string;
    workspace_path: string;
    created_at: number;
    updated_at: number;
    completed_at: number | null;
    meta: string | null;
  } | undefined;
  if (!row) return null;

  const taskRows = db.prepare(
    "SELECT status FROM batch_tasks WHERE job_id = ?",
  ).all(jobId) as Array<{ status: string }>;
  const totalTasks = taskRows.length;
  const completedTasks = taskRows.filter((r) => r.status === "completed").length;
  const failedTasks = taskRows.filter((r) => r.status === "failed").length;
  const runningTasks = taskRows.filter((r) => r.status === "running").length;
  const pendingTasks = totalTasks - completedTasks - failedTasks - runningTasks;

  return {
    id: row.id,
    name: row.name,
    status: row.status,
    inputFolder: row.input_folder,
    workspacePath: row.workspace_path,
    totalTasks,
    completedTasks,
    failedTasks,
    pendingTasks,
    runningTasks,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
  };
}

export function listBatchJobs(limit = 50): BatchJobSummary[] {
  const db = getDb();
  const rows = db.prepare(
    "SELECT id FROM batch_jobs ORDER BY created_at DESC LIMIT ?",
  ).all(limit) as Array<{ id: string }>;
  const result: BatchJobSummary[] = [];
  for (const r of rows) {
    const summary = getBatchJobSummary(r.id);
    if (summary) result.push(summary);
  }
  return result;
}

export function getBatchTaskById(taskId: string): {
  id: string;
  jobId: string;
  projectName: string;
  projectPath: string;
  novelFile: string;
  status: string;
  currentStepId: string | null;
  errorMessage: string | null;
  progress: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
} | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM batch_tasks WHERE id = ?").get(taskId) as {
    id: string;
    job_id: string;
    project_name: string;
    novel_file: string;
    status: string;
    current_step_id: string | null;
    error_message: string | null;
    progress: number;
    created_at: number;
    updated_at: number;
    completed_at: number | null;
  } | undefined;
  if (!row) return null;
  const projectPath = join(getWorkspaceDir(), row.project_name);
  return {
    id: row.id,
    jobId: row.job_id,
    projectName: row.project_name,
    projectPath,
    novelFile: row.novel_file,
    status: row.status,
    currentStepId: row.current_step_id,
    errorMessage: row.error_message,
    progress: row.progress,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
  };
}

export function getBatchTasks(
  jobId: string,
  opts: { status?: string; limit?: number; offset?: number } = {},
): Array<{
  id: string;
  jobId: string;
  projectName: string;
  novelFile: string;
  status: string;
  currentStepId: string | null;
  errorMessage: string | null;
  progress: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}> {
  const db = getDb();
  let sql = "SELECT * FROM batch_tasks WHERE job_id = ?";
  const params: (string | number)[] = [jobId];
  if (opts.status) {
    sql += " AND status = ?";
    params.push(opts.status);
  }
  sql += " ORDER BY created_at ASC";
  const limit = opts.limit ?? 100;
  const offset = opts.offset ?? 0;
  sql += " LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const rows = db.prepare(sql).all(...params) as Array<{
    id: string;
    job_id: string;
    project_name: string;
    novel_file: string;
    status: string;
    current_step_id: string | null;
    error_message: string | null;
    progress: number;
    created_at: number;
    updated_at: number;
    completed_at: number | null;
  }>;
  return rows.map((r) => ({
    id: r.id,
    jobId: r.job_id,
    projectName: r.project_name,
    novelFile: r.novel_file,
    status: r.status,
    currentStepId: r.current_step_id,
    errorMessage: r.error_message,
    progress: r.progress,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
    completedAt: r.completed_at ? new Date(r.completed_at).toISOString() : null,
  }));
}

export function updateJobStatus(
  jobId: string,
  status: "pending" | "running" | "paused" | "completed" | "failed" | "cancelled",
): void {
  const db = getDb();
  const now = Date.now();
  db.prepare(
    "UPDATE batch_jobs SET status = ?, updated_at = ? WHERE id = ?",
  ).run(status, now, jobId);
  if (status === "completed" || status === "failed" || status === "cancelled") {
    db.prepare(
      "UPDATE batch_jobs SET completed_at = ? WHERE id = ?",
    ).run(now, jobId);
  }
}

export function pauseJob(jobId: string): void {
  const summary = getBatchJobSummary(jobId);
  if (!summary) throw new Error("Job not found");
  if (summary.status !== "running") {
    throw new Error(`Job is not running (status: ${summary.status})`);
  }
  updateJobStatus(jobId, "paused");
}

export function resumeJob(jobId: string): void {
  const summary = getBatchJobSummary(jobId);
  if (!summary) throw new Error("Job not found");
  if (summary.status !== "paused") {
    throw new Error(`Job is not paused (status: ${summary.status})`);
  }
  updateJobStatus(jobId, "running");
}
