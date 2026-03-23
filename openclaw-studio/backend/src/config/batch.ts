/**
 * Batch pipeline configuration.
 * Override via env: BATCH_DB_PATH, BATCH_WORKER_POLL_MS, BATCH_WORKER_ID.
 */
export const batchConfig = {
  /** SQLite path for batch_jobs, batch_tasks, task_queue */
  dbPath: process.env.BATCH_DB_PATH || undefined,

  /** Worker poll interval (ms) */
  pollMs: parseInt(process.env.BATCH_WORKER_POLL_MS || "3000", 10),

  /** Worker ID for queue claim */
  workerId: process.env.BATCH_WORKER_ID || `worker-${process.pid}`,

  /** Max retries per queue item */
  maxRetries: 3,

  /** Step timeout (ms) for gateway promptStream */
  stepTimeoutMs: 600_000,
};
