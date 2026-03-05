import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "fs";
import { join, extname, dirname, basename } from "path";
import { pipeline } from "stream/promises";
import http from "http";
import https from "https";
import YAML from "yaml";
import { getWorkspaceDir } from "./workspace.js";

export interface DownloadResult {
  url: string;
  localPath: string;
  skipped: boolean;
}

export interface DownloadReport {
  downloaded: DownloadResult[];
  failed: Array<{ url: string; error: string }>;
  skipped: number;
}

function inferExtension(url: string, contentType?: string): string {
  const urlPath = new URL(url).pathname;
  const ext = extname(urlPath).toLowerCase();
  if (ext && ext.length <= 5) return ext;

  if (contentType) {
    if (contentType.includes("png")) return ".png";
    if (contentType.includes("jpeg") || contentType.includes("jpg")) return ".jpg";
    if (contentType.includes("webp")) return ".webp";
    if (contentType.includes("gif")) return ".gif";
    if (contentType.includes("mp3") || contentType.includes("mpeg")) return ".mp3";
    if (contentType.includes("wav")) return ".wav";
    if (contentType.includes("mp4")) return ".mp4";
    if (contentType.includes("ogg")) return ".ogg";
  }

  return ".png";
}

function httpGet(url: string, maxRedirects = 5): Promise<http.IncomingMessage> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (maxRedirects <= 0) return reject(new Error("Too many redirects"));
        return httpGet(res.headers.location, maxRedirects - 1).then(resolve, reject);
      }
      if (res.statusCode && res.statusCode >= 400) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      resolve(res);
    }).on("error", reject);
  });
}

export async function downloadAsset(
  url: string,
  destPath: string,
  skipIfExists = true,
): Promise<DownloadResult> {
  const abs = destPath.startsWith("/") ? destPath : join(getWorkspaceDir(), destPath);

  if (skipIfExists && existsSync(abs)) {
    return { url, localPath: destPath, skipped: true };
  }

  mkdirSync(dirname(abs), { recursive: true });

  const res = await httpGet(url);
  const contentType = res.headers["content-type"] ?? "";

  let finalPath = abs;
  if (!extname(abs)) {
    const ext = inferExtension(url, contentType);
    finalPath = abs + ext;
  }

  await pipeline(res, createWriteStream(finalPath));

  const relPath = finalPath.startsWith(getWorkspaceDir())
    ? finalPath.slice(getWorkspaceDir().length + 1)
    : finalPath;

  return { url, localPath: relPath, skipped: false };
}

function isRemoteUrl(val: unknown): val is string {
  return typeof val === "string" && (val.startsWith("http://") || val.startsWith("https://"));
}

export async function downloadProjectAssets(project: string): Promise<DownloadReport> {
  const report: DownloadReport = { downloaded: [], failed: [], skipped: 0 };
  const ws = getWorkspaceDir();
  const projectDir = join(ws, project);

  if (!existsSync(projectDir)) {
    return report;
  }

  await downloadCharacterAssets(project, report);
  await downloadShotAssets(project, report);

  return report;
}

async function downloadCharacterAssets(project: string, report: DownloadReport) {
  const ws = getWorkspaceDir();
  const projectDir = join(ws, project);
  const files = readdirSync(projectDir);
  const charFile = files.find((f) => f.endsWith("_角色资产.yaml"));
  if (!charFile) return;

  const filePath = join(projectDir, charFile);
  const data = YAML.parse(readFileSync(filePath, "utf-8"));
  if (!data?.characters) return;

  let modified = false;

  for (const char of data.characters as Record<string, unknown>[]) {
    if (!isRemoteUrl(char.image_url)) continue;
    if (char.image_path && existsSync(join(ws, project, String(char.image_path)))) {
      report.skipped++;
      continue;
    }

    const charId = String(char.id ?? "unknown").replace(/^@/, "");
    const destRelative = `${project}/assets/characters/${charId}.png`;

    try {
      const result = await downloadAsset(String(char.image_url), destRelative);
      if (result.skipped) {
        report.skipped++;
      } else {
        report.downloaded.push(result);
      }
      const pathFromProject = result.localPath.startsWith(project + "/")
        ? result.localPath.slice(project.length + 1)
        : result.localPath;
      char.image_path = pathFromProject;
      modified = true;
    } catch (err) {
      report.failed.push({ url: String(char.image_url), error: (err as Error).message });
    }
  }

  if (modified) {
    writeFileSync(filePath, YAML.stringify(data, { lineWidth: 0 }), "utf-8");
  }
}

async function downloadShotAssets(project: string, report: DownloadReport) {
  const ws = getWorkspaceDir();
  const shotsDir = join(ws, project, "shots");
  if (!existsSync(shotsDir)) return;

  const yamlFiles = readdirSync(shotsDir).filter(
    (f) => f.endsWith(".yaml") && f !== "_manifest.yaml",
  );

  for (const file of yamlFiles) {
    const filePath = join(shotsDir, file);
    const data = YAML.parse(readFileSync(filePath, "utf-8"));
    if (!data?.shots) continue;

    let modified = false;
    const sceneName = basename(file, ".yaml");

    for (const shot of data.shots as Record<string, unknown>[]) {
      const shotId = String(shot.shot_id ?? shot.id ?? "unknown");

      if (isRemoteUrl(shot.image_url)) {
        const existingPath = shot.image_path ? join(ws, project, "shots", String(shot.image_path)) : null;
        if (existingPath && existsSync(existingPath)) {
          report.skipped++;
        } else {
          const shotNum = shotId.replace(/.*_(\d+)$/, "$1") || shotId;
          const destRelative = `${project}/shots/${sceneName}/shot_${shotNum}.png`;
          try {
            const result = await downloadAsset(String(shot.image_url), destRelative);
            if (result.skipped) {
              report.skipped++;
            } else {
              report.downloaded.push(result);
            }
            const pathFromShots = result.localPath.startsWith(`${project}/shots/`)
              ? result.localPath.slice(`${project}/shots/`.length)
              : result.localPath;
            shot.image_path = pathFromShots;
            modified = true;
          } catch (err) {
            report.failed.push({ url: String(shot.image_url), error: (err as Error).message });
          }
        }
      }

      const lines = (shot.lines ?? []) as Record<string, unknown>[];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!isRemoteUrl(line.audio_url)) continue;
        const existingAudio = line.audio_path ? join(ws, project, String(line.audio_path)) : null;
        if (existingAudio && existsSync(existingAudio)) {
          report.skipped++;
          continue;
        }

        const destRelative = `${project}/assets/audio/${shotId}_line_${i}.mp3`;
        try {
          const result = await downloadAsset(String(line.audio_url), destRelative);
          if (result.skipped) {
            report.skipped++;
          } else {
            report.downloaded.push(result);
          }
          const pathFromProject = result.localPath.startsWith(project + "/")
            ? result.localPath.slice(project.length + 1)
            : result.localPath;
          line.audio_path = pathFromProject;
          modified = true;
        } catch (err) {
          report.failed.push({ url: String(line.audio_url), error: (err as Error).message });
        }
      }

      if (isRemoteUrl(shot.audio_url)) {
        const existingAudio = shot.audio_path ? join(ws, project, String(shot.audio_path)) : null;
        if (existingAudio && existsSync(existingAudio)) {
          report.skipped++;
        } else {
          const destRelative = `${project}/assets/audio/${shotId}.mp3`;
          try {
            const result = await downloadAsset(String(shot.audio_url), destRelative);
            if (result.skipped) {
              report.skipped++;
            } else {
              report.downloaded.push(result);
            }
            const pathFromProject = result.localPath.startsWith(project + "/")
              ? result.localPath.slice(project.length + 1)
              : result.localPath;
            shot.audio_path = pathFromProject;
            modified = true;
          } catch (err) {
            report.failed.push({ url: String(shot.audio_url), error: (err as Error).message });
          }
        }
      }
    }

    if (modified) {
      writeFileSync(filePath, YAML.stringify(data, { lineWidth: 0 }), "utf-8");
    }
  }
}
