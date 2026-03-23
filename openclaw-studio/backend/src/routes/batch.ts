import { Router } from "express";
import {
  createBatchJob,
  getBatchJobSummary,
  listBatchJobs,
  getBatchTasks,
  pauseJob,
  resumeJob,
} from "../services/batch-job-service.js";
import { updateJobStatus } from "../services/batch-job-service.js";
import { enqueueJobFirstSteps } from "../services/task-queue.js";

const router = Router();

router.post("/jobs", (req, res) => {
  try {
    const { name, inputFolder } = req.body;
    if (!name || !inputFolder) {
      return res.status(400).json({ error: "name and inputFolder required" });
    }
    const summary = createBatchJob({ name, inputFolder });
    res.status(201).json(summary);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/jobs", (req, res) => {
  try {
    const limit = parseInt((req.query.limit as string) || "50", 10);
    const list = listBatchJobs(limit);
    res.json({ jobs: list });
  } catch (err) {
    const error = err as Error;
    console.error("[batch] GET /jobs error:", error);
    res.status(500).json({
      error: error.message || "Failed to list batch jobs",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

router.get("/jobs/:jobId", (req, res) => {
  try {
    const summary = getBatchJobSummary(req.params.jobId);
    if (!summary) return res.status(404).json({ error: "Job not found" });
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/jobs/:jobId/tasks", (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const limit = parseInt((req.query.limit as string) || "100", 10);
    const offset = parseInt((req.query.offset as string) || "0", 10);
    const tasks = getBatchTasks(req.params.jobId, { status, limit, offset });
    res.json({ tasks });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/jobs/:jobId/start", (req, res) => {
  try {
    const summary = getBatchJobSummary(req.params.jobId);
    if (!summary) return res.status(404).json({ error: "Job not found" });
    if (summary.status !== "pending" && summary.status !== "paused") {
      return res.status(400).json({
        error: `Job cannot be started (status: ${summary.status})`,
      });
    }
    updateJobStatus(req.params.jobId, "running");
    const enqueued = enqueueJobFirstSteps(req.params.jobId);
    res.json({ ok: true, enqueued });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/jobs/:jobId/pause", (req, res) => {
  try {
    pauseJob(req.params.jobId);
    const summary = getBatchJobSummary(req.params.jobId);
    res.json(summary);
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("not found")) return res.status(404).json({ error: msg });
    res.status(400).json({ error: msg });
  }
});

router.get("/jobs/:jobId/progress", (req, res) => {
  const jobId = req.params.jobId;
  const summary = getBatchJobSummary(jobId);
  if (!summary) {
    return res.status(404).json({ error: "Job not found" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  res.write(":ok\n\n");

  const send = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  send({ type: "progress", job: summary });

  const intervalMs = parseInt((req.query.interval as string) || "2000", 10) || 2000;
  const interval = setInterval(() => {
    const next = getBatchJobSummary(jobId);
    if (!next) {
      clearInterval(interval);
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }
    send({ type: "progress", job: next });
    if (next.status === "completed" || next.status === "failed" || next.status === "cancelled") {
      clearInterval(interval);
      res.write("data: [DONE]\n\n");
      res.end();
    }
  }, intervalMs);

  req.on("close", () => {
    clearInterval(interval);
  });
});

router.post("/jobs/:jobId/resume", (req, res) => {
  try {
    resumeJob(req.params.jobId);
    const summary = getBatchJobSummary(req.params.jobId);
    res.json(summary);
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("not found")) return res.status(404).json({ error: msg });
    res.status(400).json({ error: msg });
  }
});

export default router;
