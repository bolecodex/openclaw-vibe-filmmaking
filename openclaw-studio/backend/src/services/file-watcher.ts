import { watch, type FSWatcher } from "chokidar";
import { join, relative, basename } from "path";
import { EventEmitter } from "events";
import { getWorkspaceDir } from "./workspace.js";

export type PanelType =
  | "style"
  | "characters"
  | "scenes"
  | "props"
  | "shots"
  | "images"
  | "audio"
  | "video";

export interface FileChangeEvent {
  type: "change" | "add" | "unlink";
  file: string;
  panel: PanelType | null;
  project: string;
  timestamp: number;
}

function inferPanel(filePath: string): PanelType | null {
  const name = basename(filePath);
  if (name === "style.yaml") return "style";
  if (name.endsWith("_角色资产.yaml")) return "characters";
  if (name.endsWith("_场景索引.yaml")) return "scenes";
  if (name.endsWith("_道具资产.yaml")) return "props";
  if (filePath.includes("/scenes/")) return "scenes";
  if (filePath.includes("/shots/")) return "shots";
  if (filePath.includes("/images/")) return "images";
  if (filePath.includes("/audio/")) return "audio";
  if (filePath.includes("/video/")) return "video";
  return null;
}

function inferProject(filePath: string, wsDir: string): string {
  const rel = relative(wsDir, filePath);
  return rel.split("/")[0] || "";
}

class ProjectWatcherManager extends EventEmitter {
  private watchers = new Map<string, FSWatcher>();

  watchProject(project: string): void {
    if (this.watchers.has(project)) return;

    const wsDir = getWorkspaceDir();
    const projectDir = join(wsDir, project);

    const watcher = watch(projectDir, {
      ignoreInitial: true,
      ignored: /(^|[/\\])\./,
      depth: 3,
      awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
    });

    const handler = (type: "change" | "add" | "unlink") => (path: string) => {
      const evt: FileChangeEvent = {
        type,
        file: relative(wsDir, path),
        panel: inferPanel(path),
        project: inferProject(path, wsDir),
        timestamp: Date.now(),
      };
      if (evt.panel) {
        this.emit("file-change", evt);
      }
    };

    watcher.on("change", handler("change"));
    watcher.on("add", handler("add"));
    watcher.on("unlink", handler("unlink"));

    this.watchers.set(project, watcher);
  }

  unwatch(project: string): void {
    const watcher = this.watchers.get(project);
    if (watcher) {
      watcher.close();
      this.watchers.delete(project);
    }
  }

  getActiveProjects(): string[] {
    return [...this.watchers.keys()];
  }
}

export const watcherManager = new ProjectWatcherManager();
