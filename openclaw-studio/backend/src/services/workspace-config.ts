import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { execFile } from "child_process";

const CONFIG_DIR = join(homedir(), ".openclaw");
const CONFIG_FILE = join(CONFIG_DIR, "openclaw-studio.json");

interface StudioConfig {
  workspaceDir?: string;
}

function loadConfig(): StudioConfig {
  if (!existsSync(CONFIG_FILE)) return {};
  try {
    const raw = readFileSync(CONFIG_FILE, "utf-8");
    return JSON.parse(raw) as StudioConfig;
  } catch {
    return {};
  }
}

function saveConfig(config: StudioConfig): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

export function getWorkspaceDirFromConfig(): string | null {
  return loadConfig().workspaceDir ?? null;
}

export function setWorkspaceDir(path: string): void {
  const config = loadConfig();
  config.workspaceDir = path;
  saveConfig(config);
  syncOpenClawWorkspace(path);
}

function syncOpenClawWorkspace(wsPath: string): void {
  writeAgentWorkspace(wsPath);
  restartGateway();
}

let lastSyncedProjectDir: string | null = null;

/**
 * Sync the agent workspace config to a specific project directory.
 * Only writes config (no Gateway restart) to avoid disrupting active connections.
 * The prompt guide handles immediate routing; config update ensures skills
 * use the right path on next Gateway restart.
 */
export function syncAgentProjectDir(projectDir: string): void {
  if (projectDir === lastSyncedProjectDir) return;
  writeAgentWorkspace(projectDir);
  lastSyncedProjectDir = projectDir;
  console.log("[workspace-config] synced agent workspace to:", projectDir);
}

function writeAgentWorkspace(wsPath: string): void {
  const oclawConfigFile = join(homedir(), ".openclaw", "openclaw.json");
  if (!existsSync(oclawConfigFile)) return;
  try {
    const raw = readFileSync(oclawConfigFile, "utf-8");
    const oclawConfig = JSON.parse(raw);
    if (!oclawConfig.agents) oclawConfig.agents = {};
    if (!oclawConfig.agents.defaults) oclawConfig.agents.defaults = {};
    oclawConfig.agents.defaults.workspace = wsPath;
    writeFileSync(oclawConfigFile, JSON.stringify(oclawConfig, null, 2), "utf-8");
  } catch {
    // non-critical
  }
}

function restartGateway(): void {
  execFile("openclaw", ["gateway", "restart"], (err, stdout, stderr) => {
    if (err) {
      console.warn("[workspace-config] failed to restart gateway:", err.message);
      return;
    }
    console.log("[workspace-config] gateway restarted:", stdout.trim() || stderr.trim());
  });
}
