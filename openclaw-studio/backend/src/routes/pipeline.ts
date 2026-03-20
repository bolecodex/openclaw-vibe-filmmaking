import { Router } from "express";
import { detectPipelineState } from "../services/pipeline-state.js";
import { STEP_DEFINITIONS, getStepDefinition } from "../services/step-actions.js";
import { buildStepPrompt } from "../services/prompt-templates.js";
import {
  runAutoReview,
  submitReview,
  loadReviews,
  loadPipelineConfig,
  savePipelineConfig,
} from "../services/step-review.js";
import {
  generateTestReport,
  listTestReports,
  getTestReport,
} from "../services/test-runner.js";
import {
  getGateway,
  type StreamEvent,
} from "../services/gateway-client.js";
import { syncAgentProjectDir } from "../services/workspace-config.js";
import { getWorkspaceDir } from "../services/workspace.js";
import { join, resolve } from "path";
import { existsSync, readFileSync } from "fs";

const router = Router();

// --- Read project artifact (relative path under project dir) ---

router.get("/:project/artifact", (req, res) => {
  try {
    const rel = String(req.query.path ?? "").trim();
    if (!rel || rel.includes("..")) {
      return res.status(400).json({ error: "Invalid path" });
    }
    const projectDir = resolve(join(getWorkspaceDir(), req.params.project));
    const full = resolve(join(projectDir, rel));
    if (!full.startsWith(projectDir) || full === projectDir) {
      return res.status(400).json({ error: "Path outside project" });
    }
    if (!existsSync(full)) {
      return res.status(404).json({ error: "Not found" });
    }
    const raw = readFileSync(full, "utf-8");
    if (rel.endsWith(".json")) {
      try {
        return res.json(JSON.parse(raw));
      } catch {
        return res.type("application/json").send(raw);
      }
    }
    return res.type("text/plain; charset=utf-8").send(raw);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/:project/long-novel-manifest", (req, res) => {
  try {
    const projectDir = join(getWorkspaceDir(), req.params.project);
    const p = join(projectDir, ".pipeline", "novel_chunks_manifest.json");
    if (!existsSync(p)) return res.status(404).json({ error: "No manifest" });
    res.json(JSON.parse(readFileSync(p, "utf-8")));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// --- Pipeline state ---

router.get("/:project", (req, res) => {
  try {
    const state = detectPipelineState(req.params.project);
    const config = loadPipelineConfig(req.params.project);
    const definitions = STEP_DEFINITIONS.map((d) => ({
      id: d.id,
      name: d.name,
      skill: d.skill,
      order: d.order,
      dependsOn: d.dependsOn,
      optional: d.optional,
      parallelWith: d.parallelWith,
      actions: d.actions,
      params: d.params,
      contentTab: d.contentTab,
    }));
    res.json({ ...state, config, definitions });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// --- Run a step ---

router.post("/:project/run", async (req, res) => {
  const { project } = req.params;
  const { stepId, action, params, selectedIds } = req.body;

  if (!stepId || !action) {
    return res.status(400).json({ error: "stepId and action required" });
  }

  const step = getStepDefinition(stepId);
  if (!step) {
    return res.status(404).json({ error: `Unknown step: ${stepId}` });
  }

  const projectDir = join(getWorkspaceDir(), project);
  syncAgentProjectDir(projectDir);

  const gateway = getGateway();
  if (!gateway.isConnected) {
    return res.status(502).json({ error: "Gateway not connected" });
  }

  const prompt = buildStepPrompt(stepId, {
    projectDir,
    projectName: project,
    action,
    params: params ?? {},
    selectedIds,
  });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  res.write(":ok\n\n");

  const sessionKey = `pipeline:${projectDir}:${stepId}`;

  try {
    const stream = gateway.promptStream(prompt, {
      sessionKey,
      extraSystemPrompt: `[Pipeline自动任务] 正在执行步骤: ${step.name} (${action})`,
    });

    for await (const event of stream) {
      if (res.writableEnded) break;
      writePipelineSSE(res, event);
    }

    try {
      const info = await gateway.getSession(sessionKey);
      if (info?.tokenUsage && (info.tokenUsage.input > 0 || info.tokenUsage.output > 0)) {
        writePipelineSSE(res, { type: "usage", usage: info.tokenUsage });
      }
    } catch { /* best-effort */ }

    const review = runAutoReview(project, stepId);
    writePipelineSSE(res, {
      type: "text",
      content: "",
      delta: "",
    });

    const freshState = detectPipelineState(project);
    res.write(`data: ${JSON.stringify({ type: "pipeline_state", state: freshState, review })}\n\n`);
  } catch (err) {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: "error", error: (err as Error).message })}\n\n`);
    }
  } finally {
    if (!res.writableEnded) {
      res.write("data: [DONE]\n\n");
      res.end();
    }
  }
});

// --- Reset a step ---

router.post("/:project/reset", (req, res) => {
  const { stepId } = req.body;
  if (!stepId) return res.status(400).json({ error: "stepId required" });

  try {
    submitReview(req.params.project, stepId, "reject", { notes: "手动重置" });
    const state = detectPipelineState(req.params.project);
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// --- Review endpoints ---

router.get("/:project/review/:stepId", (req, res) => {
  try {
    const reviews = loadReviews(req.params.project);
    const review = reviews[req.params.stepId];
    if (!review) {
      const freshReview = runAutoReview(req.params.project, req.params.stepId);
      return res.json(freshReview);
    }
    res.json(review);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/:project/review/:stepId", (req, res) => {
  const { action, notes, checklist } = req.body;
  if (!action || !["approve", "reject", "skip"].includes(action)) {
    return res.status(400).json({ error: "action must be approve, reject, or skip" });
  }

  try {
    const review = submitReview(req.params.project, req.params.stepId, action, { notes, checklist });
    res.json(review);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// --- Pipeline config ---

router.get("/:project/config", (req, res) => {
  try {
    res.json(loadPipelineConfig(req.params.project));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.patch("/:project/config", (req, res) => {
  try {
    const config = loadPipelineConfig(req.params.project);
    if (req.body.gateMode) config.gateMode = req.body.gateMode;
    savePipelineConfig(req.params.project, config);
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// --- Test reports ---

router.post("/:project/test", (req, res) => {
  try {
    const report = generateTestReport(req.params.project);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/:project/test/reports", (req, res) => {
  try {
    res.json(listTestReports(req.params.project));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/:project/test/report/:reportId", (req, res) => {
  try {
    const report = getTestReport(req.params.project, req.params.reportId);
    if (!report) return res.status(404).json({ error: "Report not found" });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// --- SSE helper ---

function writePipelineSSE(res: any, event: StreamEvent): void {
  const payload: Record<string, unknown> = { type: event.type };

  switch (event.type) {
    case "text":
      payload.content = event.delta ?? event.content ?? "";
      break;
    case "thinking":
      payload.content = event.delta ?? event.content ?? "";
      break;
    case "tool_start":
    case "tool_update":
      payload.toolCall = event.toolCall;
      break;
    case "tool_output":
      payload.toolCall = event.toolCall;
      payload.content = event.content;
      break;
    case "lifecycle":
      payload.phase = event.phase;
      break;
    case "error":
      payload.error = event.error;
      break;
    case "usage":
      payload.usage = event.usage;
      break;
    case "done":
      break;
  }

  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export default router;
