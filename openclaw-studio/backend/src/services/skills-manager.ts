import {
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  existsSync,
  statSync,
  type Dirent,
} from "fs";
import { join, dirname, normalize } from "path";
import { homedir } from "os";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const OPENCLAW_HOME =
  process.env.OPENCLAW_STATE_DIR || join(homedir(), ".openclaw");

const WORKSPACE_SKILLS = join(OPENCLAW_HOME, "workspace", "skills");
const MANAGED_SKILLS = join(OPENCLAW_HOME, "skills");
const BUNDLED_SKILLS = join(OPENCLAW_HOME, "bundled-skills");
const OPENCLAW_JSON = join(OPENCLAW_HOME, "openclaw.json");

/** 仓库内 skills-openclaw（开发时无需先 deploy 到 ~/.openclaw） */
function resolveProjectSkillsDir(): string | null {
  const envDir = process.env.SKILLS_OPENCLAW_DIR?.trim();
  if (envDir) {
    const p = normalize(envDir);
    if (existsSync(p)) return p;
    console.warn("[skills] SKILLS_OPENCLAW_DIR set but path does not exist:", p);
  }
  const here = dirname(fileURLToPath(import.meta.url));
  // backend/src/services -> ../../../.. = monorepo 根目录（与 openclaw-studio 并列的 skills-openclaw）
  const repoRoot = join(here, "..", "..", "..", "..");
  const candidate = join(repoRoot, "skills-openclaw");
  if (existsSync(candidate)) return candidate;
  return null;
}

const PROJECT_SKILLS_DIR = resolveProjectSkillsDir();

function skillMdPath(dir: string, name: string): string {
  return join(dir, name, "SKILL.md");
}

function hasProjectSkill(name: string): boolean {
  if (!PROJECT_SKILLS_DIR) return false;
  return existsSync(skillMdPath(PROJECT_SKILLS_DIR, name));
}

function parseFrontmatter(content: string): { frontmatter: Record<string, unknown>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: content };
  const [, fm, body] = match;
  const frontmatter: Record<string, unknown> = {};
  for (const line of fm.split("\n")) {
    const colon = line.indexOf(":");
    if (colon > 0) {
      const key = line.slice(0, colon).trim();
      let val: unknown = line.slice(colon + 1).trim();
      const s = String(val);
      if (s.startsWith('"') && s.endsWith('"')) val = s.slice(1, -1);
      else if (s === "true") val = true;
      else if (s === "false") val = false;
      else if (/^\d+$/.test(s)) val = parseInt(s, 10);
      frontmatter[key] = val;
    }
  }
  return { frontmatter, body };
}

function readOpenclawJson(): Record<string, unknown> {
  if (!existsSync(OPENCLAW_JSON)) return {};
  try {
    return JSON.parse(readFileSync(OPENCLAW_JSON, "utf-8"));
  } catch {
    return {};
  }
}

function writeOpenclawJson(data: Record<string, unknown>) {
  mkdirSync(OPENCLAW_HOME, { recursive: true });
  writeFileSync(OPENCLAW_JSON, JSON.stringify(data, null, 2), "utf-8");
}

function scanDir(dir: string, source: "workspace" | "managed" | "bundled" | "project"): Array<Record<string, unknown>> {
  if (!existsSync(dir)) return [];
  const results: Array<Record<string, unknown>> = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    if (!name.isDirectory()) continue;
    const skillPath = join(dir, name.name);
    const skillMd = join(skillPath, "SKILL.md");
    if (!existsSync(skillMd)) continue;
    const raw = readFileSync(skillMd, "utf-8");
    const { frontmatter } = parseFrontmatter(raw);
    const config = readOpenclawJson();
    const entries = (config?.skills as Record<string, unknown>)?.entries as Record<string, unknown> ?? {};
    const skillConfig = entries[name.name] as Record<string, unknown> ?? {};
    const hasScripts = existsSync(join(skillPath, "scripts"));
    const hasReferences = existsSync(join(skillPath, "references"));
    const stat = existsSync(skillMd) ? statSync(skillMd) : null;
    const displayName =
      (frontmatter.displayName ??
        frontmatter.display_name ??
        frontmatter.name ??
        name.name) as string;
    const pipelineStep = frontmatter.pipeline_step ?? frontmatter.pipelineStep;
    const pipelineId = frontmatter.pipeline_id ?? frontmatter.pipelineId;
    results.push({
      name: name.name,
      displayName,
      description: (frontmatter.description ?? "") as string,
      version: frontmatter.version,
      source,
      path: skillPath,
      enabled: (skillConfig.enabled as boolean) ?? true,
      config: (skillConfig.env as Record<string, string>) ?? {},
      metadata: frontmatter,
      content: raw,
      hasScripts,
      hasReferences,
      updatedAt: stat?.mtime?.toISOString?.() ?? new Date().toISOString(),
      ...(pipelineStep !== undefined && pipelineStep !== null ? { pipelineStep } : {}),
      ...(pipelineId ? { pipelineId } : {}),
    });
  }
  return results;
}

export function scanSkills(): Array<Record<string, unknown>> {
  const workspace = scanDir(WORKSPACE_SKILLS, "workspace");
  const managed = scanDir(MANAGED_SKILLS, "managed");
  const bundled = scanDir(BUNDLED_SKILLS, "bundled");
  const project = PROJECT_SKILLS_DIR ? scanDir(PROJECT_SKILLS_DIR, "project") : [];
  const bundledNames = new Set(bundled.map((b) => b.name as string));
  const projectNames = new Set(project.map((p) => p.name as string));

  const seen = new Set<string>();
  const merged: Array<Record<string, unknown>> = [];

  for (const s of workspace) {
    const n = s.name as string;
    if (bundledNames.has(n)) {
      const orig = bundled.find((b) => b.name === n)!;
      s.source = "bundled";
      s.overridden = true;
      s.bundledPath = orig.path;
      if (!s.pipelineStep && orig.pipelineStep) s.pipelineStep = orig.pipelineStep;
      if (!s.pipelineId && orig.pipelineId) s.pipelineId = orig.pipelineId;
      if (!s.displayName || s.displayName === n) s.displayName = orig.displayName;
    } else if (projectNames.has(n)) {
      const orig = project.find((p) => p.name === n)!;
      s.source = "project";
      s.overridden = true;
      (s as Record<string, unknown>).repoPath = orig.path;
      if (!s.pipelineStep && orig.pipelineStep) s.pipelineStep = orig.pipelineStep;
      if (!s.pipelineId && orig.pipelineId) s.pipelineId = orig.pipelineId;
      if (!s.displayName || s.displayName === n) s.displayName = orig.displayName;
    }
    seen.add(n);
    merged.push(s);
  }

  for (const s of [...managed, ...bundled]) {
    const n = s.name as string;
    if (seen.has(n)) continue;
    seen.add(n);
    if (s.source === "bundled") s.overridden = false;
    merged.push(s);
  }

  // 仓库 skills-openclaw：补齐未部署到 ~/.openclaw 的技能（开发环境默认可见）
  for (const s of project) {
    const n = s.name as string;
    if (seen.has(n)) continue;
    seen.add(n);
    s.overridden = false;
    merged.push(s);
  }

  return merged.sort((a, b) => ((a.name as string) ?? "").localeCompare((b.name as string) ?? ""));
}

export function getSkill(name: string): Record<string, unknown> | null {
  const bundledMd = join(BUNDLED_SKILLS, name, "SKILL.md");
  const isBundled = existsSync(bundledMd);
  let bundledFm: Record<string, unknown> | null = null;
  if (isBundled) {
    bundledFm = parseFrontmatter(readFileSync(bundledMd, "utf-8")).frontmatter;
  }

  const repoMd =
    PROJECT_SKILLS_DIR ? skillMdPath(PROJECT_SKILLS_DIR, name) : "";
  const hasRepo = Boolean(repoMd && existsSync(repoMd));
  let repoFm: Record<string, unknown> | null = null;
  if (hasRepo && repoMd) {
    repoFm = parseFrontmatter(readFileSync(repoMd, "utf-8")).frontmatter;
  }

  const searchDirs = [WORKSPACE_SKILLS, MANAGED_SKILLS, BUNDLED_SKILLS];
  if (PROJECT_SKILLS_DIR) searchDirs.push(PROJECT_SKILLS_DIR);

  for (const dir of searchDirs) {
    const skillPath = join(dir, name);
    const skillMd = join(skillPath, "SKILL.md");
    if (!existsSync(skillMd)) continue;
    const raw = readFileSync(skillMd, "utf-8");
    const { frontmatter } = parseFrontmatter(raw);
    const config = readOpenclawJson();
    const entries = (config?.skills as Record<string, unknown>)?.entries as Record<string, unknown> ?? {};
    const skillConfig = entries[name] as Record<string, unknown> ?? {};
    const hasScripts = existsSync(join(skillPath, "scripts"));
    const hasReferences = existsSync(join(skillPath, "references"));
    const stat = statSync(skillMd);

    let source: string;
    let overridden = false;
    if (dir === WORKSPACE_SKILLS) {
      if (isBundled) {
        source = "bundled";
        overridden = true;
      } else if (hasRepo) {
        source = "project";
        overridden = true;
      } else {
        source = "workspace";
      }
    } else if (dir === MANAGED_SKILLS) {
      source = "managed";
    } else if (dir === BUNDLED_SKILLS) {
      source = "bundled";
    } else {
      source = "project";
    }

    const pipelineStep =
      frontmatter.pipeline_step ??
      frontmatter.pipelineStep ??
      bundledFm?.pipeline_step ??
      repoFm?.pipeline_step ??
      repoFm?.pipelineStep;
    const pipelineId =
      frontmatter.pipeline_id ??
      frontmatter.pipelineId ??
      bundledFm?.pipeline_id ??
      repoFm?.pipeline_id;

    const displayName = (frontmatter.displayName ??
      frontmatter.display_name ??
      bundledFm?.displayName ??
      bundledFm?.display_name ??
      repoFm?.displayName ??
      repoFm?.display_name ??
      frontmatter.name ??
      name) as string;

    const out: Record<string, unknown> = {
      name,
      displayName,
      description: (frontmatter.description ?? "") as string,
      version: frontmatter.version,
      source,
      path: skillPath,
      enabled: (skillConfig.enabled as boolean) ?? true,
      config: (skillConfig.env as Record<string, string>) ?? {},
      metadata: frontmatter,
      content: raw,
      hasScripts,
      hasReferences,
      updatedAt: stat.mtime.toISOString(),
      overridden,
    };
    if (isBundled) out.bundledPath = join(BUNDLED_SKILLS, name);
    if (hasRepo && PROJECT_SKILLS_DIR) out.repoPath = join(PROJECT_SKILLS_DIR, name);
    if (pipelineStep !== undefined && pipelineStep !== null) out.pipelineStep = pipelineStep;
    if (pipelineId) out.pipelineId = pipelineId;
    return out;
  }
  return null;
}

export function createSkill(name: string, content: string): Record<string, unknown> {
  const skillPath = join(WORKSPACE_SKILLS, name);
  mkdirSync(skillPath, { recursive: true });
  const skillMd = join(skillPath, "SKILL.md");
  writeFileSync(skillMd, content, "utf-8");
  return getSkill(name)!;
}

export function updateSkill(name: string, content: string): Record<string, unknown> | null {
  if (existsSync(join(BUNDLED_SKILLS, name, "SKILL.md"))) {
    const overridePath = join(WORKSPACE_SKILLS, name);
    mkdirSync(overridePath, { recursive: true });
    writeFileSync(join(overridePath, "SKILL.md"), content, "utf-8");
    return getSkill(name);
  }
  if (hasProjectSkill(name)) {
    const overridePath = join(WORKSPACE_SKILLS, name);
    mkdirSync(overridePath, { recursive: true });
    writeFileSync(join(overridePath, "SKILL.md"), content, "utf-8");
    return getSkill(name);
  }
  for (const dir of [WORKSPACE_SKILLS, MANAGED_SKILLS]) {
    const skillMd = join(dir, name, "SKILL.md");
    if (existsSync(skillMd)) {
      writeFileSync(skillMd, content, "utf-8");
      return getSkill(name);
    }
  }
  return null;
}

export function deleteSkill(name: string): boolean {
  if (existsSync(join(BUNDLED_SKILLS, name, "SKILL.md"))) {
    throw new Error("系统技能不可删除");
  }
  for (const dir of [WORKSPACE_SKILLS, MANAGED_SKILLS]) {
    const skillPath = join(dir, name);
    if (existsSync(skillPath)) {
      rmSync(skillPath, { recursive: true });
      return true;
    }
  }
  if (hasProjectSkill(name)) {
    throw new Error("仓库内置技能不可删除（仅可删除 ~/.openclaw/workspace/skills 下的覆盖副本）");
  }
  return false;
}

export function resetSkill(name: string): boolean {
  const inBundled = existsSync(join(BUNDLED_SKILLS, name, "SKILL.md"));
  if (!inBundled && !hasProjectSkill(name)) return false;
  const overridePath = join(WORKSPACE_SKILLS, name);
  if (existsSync(overridePath)) {
    rmSync(overridePath, { recursive: true });
  }
  return true;
}

function walkSkillFiles(root: string, rel = ""): Array<{ path: string; type: "file" | "dir" }> {
  const out: Array<{ path: string; type: "file" | "dir" }> = [];
  const base = rel ? join(root, rel) : root;
  let list: Dirent[];
  try {
    list = readdirSync(base, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const d of list) {
    const p = rel ? `${rel}/${d.name}` : d.name;
    if (d.isDirectory()) {
      out.push({ path: p, type: "dir" });
      out.push(...walkSkillFiles(root, p));
    } else {
      out.push({ path: p, type: "file" });
    }
  }
  return out;
}

export function listSkillFileEntries(
  name: string,
): { entries: Array<{ path: string; type: "file" | "dir" }>; skillRoot: string } | null {
  const meta = getSkill(name);
  const skillRoot = meta?.path;
  if (typeof skillRoot !== "string" || !existsSync(skillRoot)) return null;
  const entries = walkSkillFiles(skillRoot).sort((a, b) => a.path.localeCompare(b.path));
  return { entries, skillRoot };
}

export function updateConfig(name: string, config: { enabled?: boolean; env?: Record<string, string> }): void {
  const data = readOpenclawJson();
  const skills = (data.skills as Record<string, unknown>) ?? {};
  const entries = (skills.entries as Record<string, unknown>) ?? {};
  const current = (entries[name] as Record<string, unknown>) ?? {};
  if (config.enabled !== undefined) current.enabled = config.enabled;
  if (config.env !== undefined) current.env = config.env;
  entries[name] = current;
  skills.entries = entries;
  data.skills = skills;
  writeOpenclawJson(data);
}

export function installFromClawHub(slug: string): void {
  execSync(`clawhub install ${slug}`, {
    cwd: OPENCLAW_HOME,
    timeout: 60000,
    stdio: "inherit",
  });
}

export function installFromGithub(url: string): void {
  const tmpDir = join(OPENCLAW_HOME, ".tmp-install");
  mkdirSync(tmpDir, { recursive: true });
  try {
    execSync(`git clone --depth 1 ${url} repo`, {
      cwd: tmpDir,
      timeout: 60000,
    });
    const repoDir = join(tmpDir, "repo");
    const skillMd = join(repoDir, "SKILL.md");
    if (!existsSync(skillMd)) throw new Error("No SKILL.md in repository");
    const match = url.match(/\/([^/]+?)(?:\.git)?$/);
    const skillName = match?.[1] ?? "skill";
    const skillPath = join(WORKSPACE_SKILLS, skillName);
    mkdirSync(dirname(skillPath), { recursive: true });
    if (existsSync(skillPath)) rmSync(skillPath, { recursive: true });
    execSync(`cp -r "${repoDir}" "${skillPath}"`);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

export function publishSkill(name: string): void {
  const skillPath = join(WORKSPACE_SKILLS, name) || join(MANAGED_SKILLS, name);
  if (!existsSync(join(skillPath, "SKILL.md"))) throw new Error(`Skill ${name} not found`);
  execSync(`clawhub publish "${skillPath}"`, {
    timeout: 60000,
    stdio: "inherit",
  });
}

export function searchMarketplace(query: string): Array<Record<string, unknown>> {
  try {
    const raw = execSync(`clawhub search "${query.replace(/"/g, '\\"')}"`, {
      encoding: "utf-8",
      timeout: 15000,
    });
    const lines = raw.trim().split("\n").slice(1);
    const skills = scanSkills();
    const names = new Set(skills.map((s) => s.name));
    return lines.map((line: string) => {
      const parts = line.split(/\s{2,}/);
      const slug = parts[0] ?? "";
      const name = slug.split("/").pop() ?? slug;
      return {
        slug,
        name,
        description: parts[1] ?? "",
        version: parts[2] ?? "",
        author: parts[3] ?? "",
        downloads: parseInt(parts[4] ?? "0", 10) || 0,
        tags: [],
        installed: names.has(name),
      };
    });
  } catch {
    return [];
  }
}
