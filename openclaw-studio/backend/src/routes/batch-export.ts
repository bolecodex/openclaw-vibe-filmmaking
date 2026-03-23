import { Router } from "express";
import archiver from "archiver";
import { createWriteStream, createReadStream, existsSync, mkdirSync, statSync } from "fs";
import { join } from "path";
import { getWorkspaceDir } from "../services/workspace.js";
import { getBatchJobSummary } from "../services/batch-job-service.js";
import { getBatchTasks } from "../services/batch-job-service.js";

const router = Router();

const EXPORT_DIR = join(process.cwd(), "data", "exports");
const exportState = new Map<
  string,
  { status: "pending" | "exporting" | "completed" | "failed"; path?: string; error?: string }
>();

type ExportScope = "videos" | "full";

function ensureExportDir(): void {
  if (!existsSync(EXPORT_DIR)) mkdirSync(EXPORT_DIR, { recursive: true });
}

router.post("/jobs/:jobId/export", async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const summary = getBatchJobSummary(jobId);
    if (!summary) return res.status(404).json({ error: "Job not found" });

    const scope: ExportScope = (req.body?.scope as ExportScope) || "full";
    ensureExportDir();
    const zipPath = join(EXPORT_DIR, `${jobId}.zip`);
    exportState.set(jobId, { status: "exporting" });

    res.json({ jobId, status: "exporting" });

    (async () => {
      try {
        const archive = archiver("zip", { zlib: { level: 9 } });
        const out = createWriteStream(zipPath);
        archive.pipe(out);

        const workspacePath = getWorkspaceDir();
        const tasks = getBatchTasks(jobId, { limit: 1000 });
        for (const task of tasks) {
          const projectDir = join(workspacePath, task.projectName);
          if (!existsSync(projectDir)) continue;
          const prefix = task.projectName;
          if (scope === "videos") {
            const videosDir = join(projectDir, "output", "remotion", "videos");
            const videosDir2 = join(projectDir, "output", "videos");
            if (existsSync(videosDir)) {
              archive.directory(videosDir, join(prefix, "output", "remotion", "videos"));
            }
            if (existsSync(videosDir2)) {
              archive.directory(videosDir2, join(prefix, "output", "videos"));
            }
          } else {
            archive.directory(projectDir, prefix);
          }
        }

        await archive.finalize();
        await new Promise<void>((resolve, reject) => {
          out.on("finish", () => resolve());
          out.on("error", reject);
        });
        exportState.set(jobId, { status: "completed", path: zipPath });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        exportState.set(jobId, { status: "failed", error: msg });
      }
    })();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/jobs/:jobId/export/status", (req, res) => {
  try {
    const jobId = req.params.jobId;
    const state = exportState.get(jobId);
    if (!state) {
      const zipPath = join(EXPORT_DIR, `${jobId}.zip`);
      if (existsSync(zipPath)) {
        return res.json({ jobId, status: "completed", path: zipPath });
      }
      return res.status(404).json({ error: "Export not found" });
    }
    res.json({ jobId, ...state });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/jobs/:jobId/export/download", (req, res) => {
  try {
    const jobId = req.params.jobId;
    let zipPath: string;
    const state = exportState.get(jobId);
    if (state?.path) {
      zipPath = state.path;
    } else {
      zipPath = join(EXPORT_DIR, `${jobId}.zip`);
    }
    if (!existsSync(zipPath)) {
      return res.status(404).json({ error: "Export file not found" });
    }
    const stat = statSync(zipPath);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="batch-${jobId}.zip"`);
    res.setHeader("Content-Length", stat.size);
    createReadStream(zipPath).pipe(res);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
