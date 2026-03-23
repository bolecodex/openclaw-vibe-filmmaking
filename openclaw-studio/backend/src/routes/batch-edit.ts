import { Router, type Response } from "express";
import { getGateway, type StreamEvent } from "../services/gateway-client.js";
import {
  buildContextPrompt,
  buildWorkspaceGuide,
  buildPipelineContext,
  buildReferencesBlock,
  buildImagesBlock,
} from "../services/prompt-builder.js";
import { syncAgentProjectDir } from "../services/workspace-config.js";
import { getBatchTaskById } from "../services/batch-job-service.js";
import { getScenes, getShots, getCharacters, getSourceFiles } from "../services/workspace.js";
import { enqueueTask } from "../services/task-queue.js";
import { getDb } from "../db/client.js";

const router = Router();

function writeSSE(res: Response, event: StreamEvent): void {
  const payload: Record<string, unknown> = { type: event.type };
  if (event.type === "text") {
    payload.content = event.delta ?? event.content ?? "";
  } else if (event.type === "thinking") {
    payload.content = event.delta ?? event.content ?? "";
  } else if (event.type === "tool_start" || event.type === "tool_update" || event.type === "tool_output") {
    payload.toolCall = event.toolCall;
    if (event.content) payload.content = event.content;
  } else if (event.type === "lifecycle") {
    payload.phase = event.phase;
  } else if (event.type === "error") {
    payload.error = event.error;
  } else if (event.type === "usage") {
    payload.usage = event.usage;
  } else if (event.type === "ui_action" && event.uiAction) {
    payload.uiAction = event.uiAction;
  }
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

router.get("/tasks/:taskId/content", (req, res) => {
  try {
    const task = getBatchTaskById(req.params.taskId);
    if (!task) return res.status(404).json({ error: "Task not found" });
    const projectName = task.projectName;
    const scenes = getScenes(projectName);
    const shots = getShots(projectName);
    const characters = getCharacters(projectName);
    const sourceFiles = getSourceFiles(projectName);
    res.json({
      projectName,
      projectPath: task.projectPath,
      novelFile: task.novelFile,
      status: task.status,
      progress: task.progress,
      currentStepId: task.currentStepId,
      scenes: scenes.scenes,
      shots: shots.scenes,
      characters,
      sourceFiles,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/tasks/:taskId/chat", async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const { message, sessionId, attachments, references } = req.body;
    if (!message) return res.status(400).json({ error: "message required" });

    const task = getBatchTaskById(taskId);
    if (!task) return res.status(404).json({ error: "Task not found" });

    syncAgentProjectDir(task.projectPath);

    const gateway = getGateway();
    if (!gateway.isConnected) {
      return res.status(502).json({ error: "Gateway not connected" });
    }

    const context = {
      project: { name: task.projectName, path: task.projectPath },
      view: { currentTab: "dashboard", currentView: "workspace" },
      focus: {},
      summary: {},
      availableViews: [],
    };

    const extraParts = [
      buildContextPrompt(context),
      buildWorkspaceGuide(context),
      buildPipelineContext(context),
      buildReferencesBlock(references, task.projectPath),
      buildImagesBlock(attachments),
    ].filter(Boolean);
    const extraSystemPrompt = extraParts.length ? extraParts.join("\n\n") : undefined;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    res.write(":ok\n\n");

    const sessionKey = sessionId
      ? `batch-edit:${task.projectPath}:${sessionId}`
      : `batch-edit:${task.projectPath}`;

    const stream = gateway.promptStream(message, {
      extraSystemPrompt,
      sessionKey,
    });

    for await (const event of stream) {
      if (res.writableEnded) break;
      writeSSE(res, event);
    }

    if (!res.writableEnded) {
      try {
        const info = await gateway.getSession(sessionKey);
        if (info?.tokenUsage) {
          writeSSE(res, { type: "usage", usage: info.tokenUsage });
        }
      } catch { /* ignore */ }
      res.write("data: [DONE]\n\n");
      res.end();
    }
  } catch (err) {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: "error", error: (err as Error).message })}\n\n`);
      res.end();
    }
  }
});

router.post("/tasks/:taskId/regenerate", (req, res) => {
  try {
    const taskId = req.params.taskId;
    const { stepId } = req.body;
    if (!stepId) return res.status(400).json({ error: "stepId required" });

    const task = getBatchTaskById(taskId);
    if (!task) return res.status(404).json({ error: "Task not found" });

    enqueueTask(taskId, stepId, 0);
    const db = getDb();
    db.prepare(
      "UPDATE batch_tasks SET status = 'queued', error_message = NULL, updated_at = ? WHERE id = ?",
    ).run(Date.now(), taskId);

    res.json({ ok: true, stepId });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
