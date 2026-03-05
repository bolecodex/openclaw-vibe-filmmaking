import { Router } from "express";
import { spawn } from "child_process";
import { existsSync, readdirSync, statSync } from "fs";
import { join, resolve, extname } from "path";
import { execSync } from "child_process";
import { getWorkspaceDir } from "../services/workspace.js";

const router = Router();

const REMOTION_DIR = resolve(
  process.env.REMOTION_PROJECT_DIR ??
    join(
      process.env.HOME ?? "/tmp",
      "codes/long_video_skills/.cursor/skills/novel-07-remotion/remotion-project",
    ),
);

interface RenderTask {
  taskId: string;
  project: string;
  scene: string;
  phase: "prepare" | "render" | "done" | "error";
  progress: number;
  message: string;
  outputPath: string | null;
  outputSize: number | null;
  startedAt: number;
  finishedAt: number | null;
  listeners: Set<(event: RenderEvent) => void>;
}

interface RenderEvent {
  type: "progress" | "done" | "error";
  phase: string;
  progress: number;
  message: string;
  outputPath?: string;
  outputSize?: number;
}

const tasks = new Map<string, RenderTask>();
let taskCounter = 0;

function emitToTask(task: RenderTask, event: RenderEvent) {
  for (const listener of task.listeners) {
    try {
      listener(event);
    } catch {}
  }
}

/**
 * POST /api/render - Start a Remotion render task
 */
router.post("/", (req, res) => {
  try {
    const {
      project,
      scene = "all",
      width = 1080,
      height = 1920,
      fps = 30,
      transition = "fade",
      transitionFrames = 15,
      kenburns = true,
      subtitles = true,
    } = req.body;

    if (!project) {
      return res.status(400).json({ error: "project is required" });
    }

    const projectDir = join(getWorkspaceDir(), project);
    if (!existsSync(projectDir)) {
      return res.status(404).json({ error: `project not found: ${project}` });
    }

    const outputDir = join(projectDir, "output", "remotion");
    const taskId = `render_${++taskCounter}_${Date.now()}`;

    const task: RenderTask = {
      taskId,
      project,
      scene,
      phase: "prepare",
      progress: 0,
      message: "启动预处理...",
      outputPath: null,
      outputSize: null,
      startedAt: Date.now(),
      finishedAt: null,
      listeners: new Set(),
    };
    tasks.set(taskId, task);

    res.json({ taskId });

    runRenderPipeline(task, {
      projectDir,
      outputDir,
      scene,
      width,
      height,
      fps,
      transition,
      transitionFrames,
      kenburns,
      subtitles,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

interface PipelineConfig {
  projectDir: string;
  outputDir: string;
  scene: string;
  width: number;
  height: number;
  fps: number;
  transition: string;
  transitionFrames: number;
  kenburns: boolean;
  subtitles: boolean;
}

async function runRenderPipeline(task: RenderTask, cfg: PipelineConfig) {
  try {
    task.phase = "prepare";
    task.message = "预处理数据中...";
    emitToTask(task, {
      type: "progress",
      phase: "prepare",
      progress: 0,
      message: task.message,
    });

    await runScript(
      task,
      "prepare",
      [
        join(REMOTION_DIR, "scripts/prepare-data.ts"),
        "--project", cfg.projectDir,
        "--scene", cfg.scene,
        "--output", cfg.outputDir,
        "--fps", String(cfg.fps),
        "--width", String(cfg.width),
        "--height", String(cfg.height),
        "--transition", cfg.transition,
        "--transition-frames", String(cfg.transitionFrames),
        "--kenburns", String(cfg.kenburns),
        "--subtitles", String(cfg.subtitles),
      ],
    );

    task.phase = "render";
    task.progress = 0;
    task.message = "渲染视频中...";
    emitToTask(task, {
      type: "progress",
      phase: "render",
      progress: 0,
      message: task.message,
    });

    await runScript(
      task,
      "render",
      [
        join(REMOTION_DIR, "scripts/render.ts"),
        "--project", cfg.projectDir,
        "--output", cfg.outputDir,
        "--scene", cfg.scene,
      ],
    );

    const videosDir = join(cfg.outputDir, "videos");
    let outputPath: string | null = null;
    let outputSize = 0;
    if (existsSync(videosDir)) {
      const files = readdirSync(videosDir)
        .filter((f) => f.endsWith(".mp4"))
        .sort((a, b) => {
          const sa = statSync(join(videosDir, a)).mtimeMs;
          const sb = statSync(join(videosDir, b)).mtimeMs;
          return sb - sa;
        });
      if (files.length > 0) {
        outputPath = join(videosDir, files[0]);
        outputSize = statSync(outputPath).size;
      }
    }

    task.phase = "done";
    task.progress = 100;
    task.message = "渲染完成";
    task.outputPath = outputPath;
    task.outputSize = outputSize;
    task.finishedAt = Date.now();

    emitToTask(task, {
      type: "done",
      phase: "done",
      progress: 100,
      message: "渲染完成",
      outputPath: outputPath ?? undefined,
      outputSize,
    });
  } catch (err) {
    task.phase = "error";
    task.message = (err as Error).message;
    task.finishedAt = Date.now();

    emitToTask(task, {
      type: "error",
      phase: "error",
      progress: task.progress,
      message: task.message,
    });
  }
}

function runScript(
  task: RenderTask,
  phase: "prepare" | "render",
  args: string[],
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["tsx", ...args], {
      cwd: REMOTION_DIR,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";

    child.stdout?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      const lines = text.split("\n");

      for (const line of lines) {
        const progressMatch = line.match(/进度:\s*(\d+)%/);
        if (progressMatch) {
          const pct = parseInt(progressMatch[1], 10);
          task.progress = pct;
          task.message = phase === "render" ? `渲染中 ${pct}%` : `预处理中 ${pct}%`;
          emitToTask(task, {
            type: "progress",
            phase,
            progress: pct,
            message: task.message,
          });
        }

        if (line.includes("✓") && phase === "prepare") {
          task.message = line.trim().replace(/^\[.*?\]\s*\[.*?\]\s*/, "");
          emitToTask(task, {
            type: "progress",
            phase,
            progress: task.progress,
            message: task.message,
          });
        }
      }
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${phase} failed (exit ${code}): ${stderr.slice(-500)}`));
      }
    });

    child.on("error", (err) => {
      reject(new Error(`spawn error: ${err.message}`));
    });
  });
}

/**
 * GET /api/render/progress?taskId=xxx - SSE progress stream
 */
router.get("/progress", (req, res) => {
  const taskId = req.query.taskId as string;
  if (!taskId) {
    return res.status(400).json({ error: "taskId required" });
  }

  const task = tasks.get(taskId);
  if (!task) {
    return res.status(404).json({ error: "task not found" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.write(":ok\n\n");

  const write = (event: RenderEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  write({
    type: "progress",
    phase: task.phase,
    progress: task.progress,
    message: task.message,
    outputPath: task.outputPath ?? undefined,
    outputSize: task.outputSize ?? undefined,
  });

  if (task.phase === "done" || task.phase === "error") {
    res.write("data: [DONE]\n\n");
    res.end();
    return;
  }

  const listener = (event: RenderEvent) => {
    write(event);
    if (event.type === "done" || event.type === "error") {
      res.write("data: [DONE]\n\n");
      res.end();
      task.listeners.delete(listener);
    }
  };

  task.listeners.add(listener);

  req.on("close", () => {
    task.listeners.delete(listener);
  });
});

/**
 * GET /api/render/history?project=xxx - List rendered videos
 */
router.get("/history", (req, res) => {
  try {
    const project = req.query.project as string;
    if (!project) {
      return res.status(400).json({ error: "project required" });
    }

    const videosDir = join(getWorkspaceDir(), project, "output", "remotion", "videos");
    if (!existsSync(videosDir)) {
      return res.json({ videos: [] });
    }

    const videos = readdirSync(videosDir)
      .filter((f) => {
        const ext = extname(f).toLowerCase();
        return [".mp4", ".webm", ".mov"].includes(ext);
      })
      .map((name) => {
        const fullPath = join(videosDir, name);
        const stat = statSync(fullPath);

        let duration: number | null = null;
        try {
          const result = execSync(
            `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${fullPath}"`,
            { encoding: "utf-8", timeout: 5000 },
          );
          duration = parseFloat(result.trim()) || null;
        } catch {}

        return {
          name,
          path: fullPath,
          size: stat.size,
          mtime: stat.mtime.toISOString(),
          duration,
        };
      })
      .sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime());

    res.json({ videos });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
