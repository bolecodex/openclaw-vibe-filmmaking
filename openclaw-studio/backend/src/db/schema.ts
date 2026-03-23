import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from "drizzle-orm/sqlite-core";

export const batchJobStatuses = [
  "pending",
  "running",
  "paused",
  "completed",
  "failed",
  "cancelled",
] as const;
export type BatchJobStatus = (typeof batchJobStatuses)[number];

export const batchTaskStatuses = [
  "pending",
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
] as const;
export type BatchTaskStatus = (typeof batchTaskStatuses)[number];

export const queueItemStatuses = ["pending", "running", "completed", "failed"] as const;
export type QueueItemStatus = (typeof queueItemStatuses)[number];

export const batchJobs = sqliteTable("batch_jobs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status", { enum: batchJobStatuses }).notNull().default("pending"),
  inputFolder: text("input_folder").notNull(),
  workspacePath: text("workspace_path").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  meta: text("meta", { mode: "json" }), // optional JSON: { totalTasks, options }
});

export const batchTasks = sqliteTable("batch_tasks", {
  id: text("id").primaryKey(),
  jobId: text("job_id")
    .notNull()
    .references(() => batchJobs.id, { onDelete: "cascade" }),
  projectName: text("project_name").notNull(),
  novelFile: text("novel_file").notNull(),
  status: text("status", { enum: batchTaskStatuses }).notNull().default("pending"),
  currentStepId: text("current_step_id"),
  errorMessage: text("error_message"),
  progress: integer("progress").notNull().default(0), // 0-100
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

export const taskExecutions = sqliteTable("task_executions", {
  id: text("id").primaryKey(),
  taskId: text("task_id")
    .notNull()
    .references(() => batchTasks.id, { onDelete: "cascade" }),
  stepId: text("step_id").notNull(),
  status: text("status", { enum: ["running", "completed", "failed"] }).notNull(),
  startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  errorMessage: text("error_message"),
  tokenUsage: text("token_usage", { mode: "json" }), // { input, output }
});

export const taskQueue = sqliteTable("task_queue", {
  id: text("id").primaryKey(),
  taskId: text("task_id")
    .notNull()
    .references(() => batchTasks.id, { onDelete: "cascade" }),
  stepId: text("step_id").notNull(),
  priority: integer("priority").notNull().default(0),
  status: text("status", { enum: queueItemStatuses }).notNull().default("pending"),
  workerId: text("worker_id"),
  scheduledAt: integer("scheduled_at", { mode: "timestamp" }).notNull(),
  startedAt: integer("started_at", { mode: "timestamp" }),
  retryCount: integer("retry_count").notNull().default(0),
  maxRetries: integer("max_retries").notNull().default(3),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export type BatchJob = typeof batchJobs.$inferSelect;
export type BatchTask = typeof batchTasks.$inferSelect;
export type TaskExecution = typeof taskExecutions.$inferSelect;
export type TaskQueueRow = typeof taskQueue.$inferSelect;
