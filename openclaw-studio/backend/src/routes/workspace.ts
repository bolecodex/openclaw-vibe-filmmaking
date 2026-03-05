import { Router } from "express";
import multer from "multer";
import {
  scanProjects,
  listDir,
  readWorkspaceFile,
  writeWorkspaceFile,
  createProject,
  deleteProject,
  getCharacters,
  getScenes,
  getShots,
  getMedia,
  getWorkspaceDir,
  setWorkspaceDir,
  getStyle,
  updateStyle,
  updateCharacter,
  updateScene,
  updateShot,
  uploadNovelFiles,
  getSourceFiles,
  listDirs,
} from "../services/workspace.js";
import { downloadAsset, downloadProjectAssets } from "../services/asset-downloader.js";
import { watcherManager, type FileChangeEvent } from "../services/file-watcher.js";
import { join, extname } from "path";
import { mkdirSync, existsSync } from "fs";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const router = Router();

router.get("/root", (_req, res) => {
  try {
    res.json({ path: getWorkspaceDir() });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/list-dirs", (req, res) => {
  try {
    const path = (req.query.path as string) || undefined;
    res.json(listDirs(path));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post("/root", (req, res) => {
  try {
    const { path, create } = req.body;
    if (!path || typeof path !== "string")
      return res.status(400).json({ error: "path required" });
    if (create && !existsSync(path)) {
      mkdirSync(path, { recursive: true });
    }
    setWorkspaceDir(path);
    res.json({ path: getWorkspaceDir() });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/projects", (_req, res) => {
  try {
    res.json(scanProjects());
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/project", (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "name required" });
    const project = createProject(name);
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.delete("/project", (req, res) => {
  try {
    const name = req.query.name as string;
    if (!name) return res.status(400).json({ error: "name required" });
    const ok = deleteProject(name);
    if (!ok) return res.status(404).json({ error: "project not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/tree", (req, res) => {
  try {
    const root = (req.query.root as string) || "";
    const recursive = req.query.recursive === "true";
    const absPath = root
      ? join(getWorkspaceDir(), root)
      : getWorkspaceDir();
    res.json(listDir(absPath, recursive));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/file", (req, res) => {
  try {
    const path = req.query.path as string;
    if (!path) return res.status(400).json({ error: "path required" });
    const result = readWorkspaceFile(path);
    res.json(result);
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

const MIME_MAP: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".flac": "audio/flac",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

router.get("/file-raw", (req, res) => {
  try {
    const filePath = req.query.path as string;
    if (!filePath) return res.status(400).json({ error: "path required" });
    const abs = filePath.startsWith("/") ? filePath : join(getWorkspaceDir(), filePath);
    if (!existsSync(abs)) return res.status(404).json({ error: "file not found" });
    const ext = extname(abs).toLowerCase();
    const mime = MIME_MAP[ext];
    if (mime) res.setHeader("Content-Type", mime);
    res.setHeader("Cache-Control", "public, max-age=60");
    res.sendFile(abs);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.put("/file", (req, res) => {
  try {
    const path = req.query.path as string;
    const { content } = req.body;
    if (!path || content === undefined)
      return res.status(400).json({ error: "path and content required" });
    writeWorkspaceFile(path, content);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/characters", (req, res) => {
  try {
    const project = req.query.project as string;
    if (!project) return res.status(400).json({ error: "project required" });
    res.json(getCharacters(project));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/scenes", (req, res) => {
  try {
    const project = req.query.project as string;
    if (!project) return res.status(400).json({ error: "project required" });
    res.json(getScenes(project));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/shots", (req, res) => {
  try {
    const project = req.query.project as string;
    const sceneId = req.query.sceneId as string | undefined;
    if (!project) return res.status(400).json({ error: "project required" });
    res.json(getShots(project, sceneId));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/media", (req, res) => {
  try {
    const project = req.query.project as string;
    const type = req.query.type as "images" | "audio" | "video";
    if (!project || !type)
      return res.status(400).json({ error: "project and type required" });
    if (!["images", "audio", "video"].includes(type))
      return res.status(400).json({ error: "type must be images|audio|video" });
    res.json(getMedia(project, type));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// --- Novel upload ---

router.post("/upload-novel", upload.array("files", 200), (req, res) => {
  try {
    const project = req.query.project as string;
    if (!project) return res.status(400).json({ error: "project required" });
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0)
      return res.status(400).json({ error: "no files uploaded" });
    const folderName = (req.query.folder as string) || undefined;
    const result = uploadNovelFiles(project, files, folderName);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/source-files", (req, res) => {
  try {
    const project = req.query.project as string;
    if (!project) return res.status(400).json({ error: "project required" });
    res.json(getSourceFiles(project));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// --- SSE file watcher ---

router.get("/watch", (req, res) => {
  const project = req.query.project as string;
  if (!project) {
    res.status(400).json({ error: "project required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  watcherManager.watchProject(project);

  const handler = (evt: FileChangeEvent) => {
    if (evt.project === project) {
      res.write(`data: ${JSON.stringify(evt)}\n\n`);
    }
  };

  watcherManager.on("file-change", handler);

  req.on("close", () => {
    watcherManager.removeListener("file-change", handler);
  });
});

// --- Style API ---

router.get("/style", (req, res) => {
  try {
    const project = req.query.project as string;
    if (!project) return res.status(400).json({ error: "project required" });
    const style = getStyle(project);
    if (!style) return res.status(404).json({ error: "style.yaml not found" });
    res.json(style);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.put("/style", (req, res) => {
  try {
    const project = req.query.project as string;
    if (!project) return res.status(400).json({ error: "project required" });
    updateStyle(project, req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// --- Update APIs (partial merge) ---

router.put("/character", (req, res) => {
  try {
    const project = req.query.project as string;
    const id = req.query.id as string;
    if (!project || !id)
      return res.status(400).json({ error: "project and id required" });
    const ok = updateCharacter(project, id, req.body);
    if (!ok) return res.status(404).json({ error: "character not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.put("/scene", (req, res) => {
  try {
    const project = req.query.project as string;
    const id = req.query.id as string;
    if (!project || !id)
      return res.status(400).json({ error: "project and id required" });
    const ok = updateScene(project, id, req.body);
    if (!ok) return res.status(404).json({ error: "scene not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.put("/shot", (req, res) => {
  try {
    const project = req.query.project as string;
    const file = req.query.file as string;
    const id = req.query.id as string;
    if (!project || !file || !id)
      return res.status(400).json({ error: "project, file, and id required" });
    const ok = updateShot(project, file, id, req.body);
    if (!ok) return res.status(404).json({ error: "shot not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// --- Asset download ---

router.post("/download-asset", async (req, res) => {
  try {
    const { url, destPath } = req.body;
    if (!url || !destPath)
      return res.status(400).json({ error: "url and destPath required" });
    const result = await downloadAsset(url, destPath);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/download-assets", async (req, res) => {
  try {
    const project = req.query.project as string;
    if (!project)
      return res.status(400).json({ error: "project required" });
    const report = await downloadProjectAssets(project);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
