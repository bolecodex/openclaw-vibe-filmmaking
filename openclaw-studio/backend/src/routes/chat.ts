import { Router } from "express";
import {
  getGateway,
  type StreamEvent,
} from "../services/gateway-client.js";
import {
  buildContextPrompt,
  buildReferencesBlock,
  buildImagesBlock,
  shouldInjectSourceContent,
  buildSourceContentBlock,
  buildWorkspaceGuide,
  buildPipelineContext,
} from "../services/prompt-builder.js";
import { syncAgentProjectDir } from "../services/workspace-config.js";

const router = Router();

const NAV_KEYWORDS: Array<[string, string[]]> = [
  ["characters", ["角色", "人物", "character"]],
  ["scenes", ["场景", "scene"]],
  ["shots", ["分镜", "镜头", "shot", "storyboard"]],
  ["style", ["风格", "style"]],
  ["images", ["图片", "image", "图像", "配图"]],
  ["audio", ["音频", "配音", "audio", "声音", "语音"]],
  ["video", ["视频", "video"]],
  ["dashboard", ["概览", "总览", "overview", "dashboard"]],
];

function detectAutoNavigation(
  message: string,
  context?: { view?: { currentTab?: string }; availableViews?: Array<{ id: string }> },
): StreamEvent | null {
  if (!context?.view) return null;
  const currentTab = context.view.currentTab;
  const msg = message.toLowerCase();

  for (const [tab, keywords] of NAV_KEYWORDS) {
    if (tab === currentTab) continue;
    if (keywords.some((kw) => msg.includes(kw))) {
      return { type: "ui_action", uiAction: { action: "navigate", target: tab } };
    }
  }
  return null;
}

router.post("/", async (req, res) => {
  try {
    const { message, projectDir, context, attachments, references } = req.body;
    if (!message) return res.status(400).json({ error: "message required" });

    const gateway = getGateway();

    if (!gateway.isConnected) {
      return res.status(502).json({ error: "Gateway not connected" });
    }

    if (context?.project?.path) {
      syncAgentProjectDir(context.project.path);
    }

    const sourceContent = shouldInjectSourceContent(message)
      ? buildSourceContentBlock(context)
      : "";

    const extraParts = [
      buildContextPrompt(context),
      buildWorkspaceGuide(context),
      buildPipelineContext(context),
      sourceContent,
      buildReferencesBlock(references, projectDir),
      buildImagesBlock(attachments),
    ].filter(Boolean);

    const extraSystemPrompt = extraParts.length
      ? extraParts.join("\n\n")
      : undefined;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    res.write(":ok\n\n");

    const autoNav = detectAutoNavigation(message, context);
    if (autoNav) {
      writeSSE(res, autoNav);
    }

    const { sessionId } = req.body;
    let sessionKey: string | undefined;
    if (context?.project?.path) {
      sessionKey = sessionId
        ? `studio:${context.project.path}:${sessionId}`
        : `studio:${context.project.path}`;
    }

    const stream = gateway.promptStream(message, {
      extraSystemPrompt,
      sessionKey,
    });

    for await (const event of stream) {
      if (res.writableEnded) break;
      writeSSE(res, event);
    }

    if (!res.writableEnded) {
      if (sessionKey) {
        try {
          const info = await gateway.getSession(sessionKey);
          if (info?.tokenUsage) {
            writeSSE(res, { type: "usage", usage: info.tokenUsage });
          }
        } catch { /* best-effort */ }
      }
      res.write("data: [DONE]\n\n");
      res.end();
    }
  } catch (err) {
    if (!res.headersSent) {
      res.status(502).json({
        error: "Gateway unavailable",
        detail: (err as Error).message,
      });
    }
  }
});

function writeSSE(res: any, event: StreamEvent): void {
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
    case "ui_action":
      payload.uiAction = event.uiAction;
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
