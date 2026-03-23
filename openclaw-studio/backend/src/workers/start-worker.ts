#!/usr/bin/env node
/**
 * Batch pipeline worker: polls the task queue and runs pipeline steps.
 * Run with: npx tsx src/workers/start-worker.ts
 * Or after build: node dist/workers/start-worker.js
 */
import { startWorkerLoop } from "../services/batch-worker.js";
import { getDb } from "../db/client.js";
import { batchConfig } from "../config/batch.js";

getDb();
const id = startWorkerLoop(batchConfig.pollMs);
console.log(`[batch-worker] Started polling every ${batchConfig.pollMs}ms (PID ${process.pid})`);

process.on("SIGINT", () => {
  clearInterval(id);
  console.log("[batch-worker] Stopped");
  process.exit(0);
});

process.on("SIGTERM", () => {
  clearInterval(id);
  console.log("[batch-worker] Stopped");
  process.exit(0);
});
