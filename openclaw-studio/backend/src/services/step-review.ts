import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";
import YAML from "yaml";
import { getWorkspaceDir } from "./workspace.js";
import type { ReviewState, CheckItem } from "./pipeline-state.js";

export type GateMode = "none" | "auto" | "manual" | "strict";

export interface PipelineConfig {
  gateMode: GateMode;
}

interface ReviewRule {
  id: string;
  label: string;
  type: "auto" | "manual";
  check?: (projectDir: string) => { passed: boolean; detail?: string };
}

function safeReadYaml(path: string): Record<string, unknown> | null {
  if (!existsSync(path)) return null;
  try { return YAML.parse(readFileSync(path, "utf-8")); } catch { return null; }
}

function findFile(dir: string, suffix: string): string | null {
  if (!existsSync(dir)) return null;
  const f = readdirSync(dir).find((n) => n.endsWith(suffix));
  return f ? join(dir, f) : null;
}

function countCharacters(projectDir: string): number {
  const f = findFile(projectDir, "_角色资产.yaml");
  if (!f) return 0;
  const d = safeReadYaml(f);
  return ((d?.characters as unknown[]) ?? []).length;
}

function allCharactersHaveImages(projectDir: string): { passed: boolean; detail: string } {
  const f = findFile(projectDir, "_角色资产.yaml");
  if (!f) return { passed: false, detail: "角色资产文件不存在" };
  const d = safeReadYaml(f);
  const chars = (d?.characters as Record<string, unknown>[]) ?? [];
  const withImg = chars.filter((c) => c.image_url).length;
  return { passed: withImg === chars.length, detail: `${withImg}/${chars.length}` };
}

function countSceneFiles(projectDir: string): number {
  const scenesDir = join(projectDir, "scenes");
  if (!existsSync(scenesDir)) return 0;
  return readdirSync(scenesDir).filter((f) => /^SC_.*\.md$/.test(f)).length;
}

function getShotStats(projectDir: string): { total: number; images: number; audio: number; video: number } {
  const shotsDir = join(projectDir, "shots");
  if (!existsSync(shotsDir)) return { total: 0, images: 0, audio: 0, video: 0 };
  let total = 0, images = 0, audio = 0, video = 0;
  for (const f of readdirSync(shotsDir).filter((n) => /^SC_.*\.yaml$/.test(n))) {
    const d = safeReadYaml(join(shotsDir, f));
    for (const s of (d?.shots as Record<string, unknown>[]) ?? []) {
      total++;
      if (s.image_url || s.image_status === "completed") images++;
      if (s.audio_url || s.audio_status === "completed") audio++;
      if (s.video_url || s.video_status === "completed") video++;
    }
  }
  return { total, images, audio, video };
}

const REVIEW_RULES: Record<string, ReviewRule[]> = {
  "extract-characters": [
    {
      id: "has-output", label: "角色资产文件已生成", type: "auto",
      check: (p) => ({ passed: !!findFile(p, "_角色资产.yaml"), detail: undefined }),
    },
    {
      id: "min-count", label: "角色数量 >= 2", type: "auto",
      check: (p) => { const n = countCharacters(p); return { passed: n >= 2, detail: `实际: ${n}` }; },
    },
    {
      id: "has-images", label: "所有角色已有肖像图", type: "auto",
      check: (p) => allCharactersHaveImages(p),
    },
    { id: "names-correct", label: "角色名称准确", type: "manual" },
    { id: "style-match", label: "角色风格与 style.yaml 一致", type: "manual" },
  ],
  "extract-props": [
    {
      id: "has-output", label: "道具资产文件已生成", type: "auto",
      check: (p) => ({ passed: !!findFile(p, "_道具资产.yaml"), detail: undefined }),
    },
    {
      id: "has-items", label: "道具数量 >= 1", type: "auto",
      check: (p) => {
        const f = findFile(p, "_道具资产.yaml");
        if (!f) return { passed: false, detail: "无文件" };
        const d = safeReadYaml(f);
        const list = (d?.props ?? d?.items) as unknown[] | undefined;
        const n = Array.isArray(list) ? list.length : 0;
        return { passed: n >= 1, detail: `${n} 个道具` };
      },
    },
    { id: "props-match-style", label: "道具风格与剧本一致", type: "manual" },
  ],
  "script-to-scenes": [
    {
      id: "has-scenes", label: "场景文件已生成", type: "auto",
      check: (p) => ({ passed: countSceneFiles(p) > 0, detail: `${countSceneFiles(p)} 个场景` }),
    },
    {
      id: "has-index", label: "场景索引 YAML 已生成", type: "auto",
      check: (p) => ({ passed: !!findFile(p, "_场景索引.yaml") }),
    },
    {
      id: "scene-count", label: "场景数量合理 (3-50)", type: "auto",
      check: (p) => { const n = countSceneFiles(p); return { passed: n >= 3 && n <= 50, detail: `实际: ${n}` }; },
    },
    { id: "content-check", label: "场景内容完整无遗漏", type: "manual" },
  ],
  "scenes-to-images": [
    {
      id: "has-scene-images", label: "所有场景已有场景图", type: "auto",
      check: (p) => {
        const indexFile = findFile(p, "_场景索引.yaml");
        if (!indexFile) return { passed: false, detail: "无场景索引" };
        const data = safeReadYaml(indexFile);
        const scenes = (data?.scenes as Record<string, unknown>[]) ?? [];
        const withImage = scenes.filter((s) => s.image_path || s.image_url || s.image_status === "completed").length;
        return { passed: scenes.length > 0 && withImage === scenes.length, detail: `${withImage}/${scenes.length}` };
      },
    },
    { id: "scene-image-quality", label: "场景图风格统一、符合设定", type: "manual" },
  ],
  "scenes-to-storyboard": [
    {
      id: "has-manifest", label: "shots/_manifest.yaml 存在", type: "auto",
      check: (p) => ({ passed: existsSync(join(p, "shots", "_manifest.yaml")) }),
    },
    {
      id: "has-prompts", label: "每个分镜都有配图提示词", type: "auto",
      check: (p) => {
        const stats = getShotStats(p);
        return { passed: stats.total > 0, detail: `${stats.total} 个分镜` };
      },
    },
    { id: "visual-review", label: "分镜节奏和镜头感合理", type: "manual" },
  ],
  "shots-to-images": [
    {
      id: "all-images", label: "所有分镜已配图", type: "auto",
      check: (p) => {
        const { total, images } = getShotStats(p);
        return { passed: total > 0 && images === total, detail: `${images}/${total}` };
      },
    },
    {
      id: "no-errors", label: "无生成失败的图片", type: "auto",
      check: (p) => {
        const { total, images } = getShotStats(p);
        return { passed: images >= total, detail: `${total - images} 个失败` };
      },
    },
    { id: "consistency", label: "角色形象跨镜头一致", type: "manual" },
    { id: "quality-check", label: "图片质量可接受", type: "manual" },
  ],
  "shots-to-audio": [
    {
      id: "all-audio", label: "所有台词已配音", type: "auto",
      check: (p) => {
        const { total, audio } = getShotStats(p);
        return { passed: total > 0 && audio === total, detail: `${audio}/${total}` };
      },
    },
    { id: "voice-match", label: "音色与角色匹配", type: "manual" },
    { id: "emotion-ok", label: "语气情感表达合适", type: "manual" },
  ],
  "shots-to-ai-video": [
    {
      id: "all-video", label: "所有分镜已生成AI视频", type: "auto",
      check: (p) => {
        const { total, video } = getShotStats(p);
        return { passed: total > 0 && video === total, detail: `${video}/${total}` };
      },
    },
    { id: "motion-ok", label: "动作自然流畅", type: "manual" },
  ],
  "compose-video": [
    {
      id: "has-output", label: "输出视频文件存在", type: "auto",
      check: (p) => {
        const dirs = [join(p, "output", "videos"), join(p, "output", "remotion", "videos")];
        const hasVideo = dirs.some((d) => existsSync(d) && readdirSync(d).some((f) => f.endsWith(".mp4")));
        return { passed: hasVideo };
      },
    },
    { id: "playback-ok", label: "视频可正常播放", type: "manual" },
    { id: "sync-ok", label: "音画同步", type: "manual" },
    { id: "final-ok", label: "整体效果满意", type: "manual" },
  ],
  "long-novel-to-script": [
    {
      id: "has-manifest", label: "切块 manifest 已生成", type: "auto",
      check: (p) => ({
        passed: existsSync(join(p, ".pipeline", "novel_chunks_manifest.json")),
      }),
    },
    {
      id: "has-final-script", label: "最终剧本文件已汇编", type: "auto",
      check: (p) => {
        const mp = join(p, ".pipeline", "novel_chunks_manifest.json");
        if (!existsSync(mp)) return { passed: false, detail: "无 manifest" };
        try {
          const m = JSON.parse(readFileSync(mp, "utf-8")) as { final_script?: string };
          const fn = m.final_script;
          if (!fn) return { passed: false };
          return { passed: existsSync(join(p, fn)), detail: fn };
        } catch {
          return { passed: false };
        }
      },
    },
    { id: "bible-ok", label: "圣经人物地名与正文一致", type: "manual" },
  ],
  "ai-edit-video": [
    {
      id: "has-edited", label: "edited 目录有输出 mp4", type: "auto",
      check: (p) => {
        const ed = join(p, "output", "edited");
        if (!existsSync(ed)) return { passed: false, detail: "无 output/edited" };
        const n = readdirSync(ed).filter((f) => f.endsWith(".mp4")).length;
        return { passed: n > 0, detail: `${n} 个文件` };
      },
    },
    { id: "edit-ok", label: "剪辑节奏与成片满意", type: "manual" },
  ],
  "video-quality-review": [
    {
      id: "has-report", label: "video_quality.json 已生成", type: "auto",
      check: (p) => ({
        passed: existsSync(join(p, ".pipeline", "video_quality.json")),
      }),
    },
    {
      id: "has-shots", label: "至少一条镜头评审记录", type: "auto",
      check: (p) => {
        const vp = join(p, ".pipeline", "video_quality.json");
        if (!existsSync(vp)) return { passed: false };
        try {
          const j = JSON.parse(readFileSync(vp, "utf-8")) as { shots?: unknown[] };
          const n = (j.shots ?? []).length;
          return { passed: n > 0, detail: `${n} 条` };
        } catch {
          return { passed: false };
        }
      },
    },
    { id: "scores-ok", label: "低分镜头已处理或接受", type: "manual" },
  ],
};

// --- Persistence ---

function pipelineDir(projectDir: string): string {
  return join(projectDir, ".pipeline");
}

function ensurePipelineDir(projectDir: string): string {
  const dir = pipelineDir(projectDir);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function loadReviews(projectName: string): Record<string, ReviewState> {
  const projectDir = join(getWorkspaceDir(), projectName);
  const reviewsPath = join(pipelineDir(projectDir), "reviews.json");
  if (!existsSync(reviewsPath)) return {};
  try { return JSON.parse(readFileSync(reviewsPath, "utf-8")); } catch { return {}; }
}

export function saveReview(projectName: string, stepId: string, review: ReviewState): void {
  const projectDir = join(getWorkspaceDir(), projectName);
  const dir = ensurePipelineDir(projectDir);
  const reviewsPath = join(dir, "reviews.json");
  const reviews = loadReviews(projectName);
  reviews[stepId] = review;
  writeFileSync(reviewsPath, JSON.stringify(reviews, null, 2), "utf-8");
}

export function loadPipelineConfig(projectName: string): PipelineConfig {
  const projectDir = join(getWorkspaceDir(), projectName);
  const configPath = join(pipelineDir(projectDir), "config.json");
  if (!existsSync(configPath)) return { gateMode: "auto" };
  try { return JSON.parse(readFileSync(configPath, "utf-8")); } catch { return { gateMode: "auto" }; }
}

export function savePipelineConfig(projectName: string, config: PipelineConfig): void {
  const projectDir = join(getWorkspaceDir(), projectName);
  const dir = ensurePipelineDir(projectDir);
  writeFileSync(join(dir, "config.json"), JSON.stringify(config, null, 2), "utf-8");
}

// --- Review execution ---

export function runAutoReview(projectName: string, stepId: string): ReviewState {
  const projectDir = join(getWorkspaceDir(), projectName);
  const rules = REVIEW_RULES[stepId] ?? [];

  const checklist: CheckItem[] = rules.map((rule) => {
    if (rule.type === "manual") {
      return { id: rule.id, label: rule.label, type: "manual", passed: null };
    }
    const result = rule.check?.(projectDir);
    return {
      id: rule.id,
      label: rule.label,
      type: "auto",
      passed: result?.passed ?? false,
      detail: result?.detail,
    };
  });

  const autoChecks = checklist.filter((c) => c.type === "auto");
  const autoPassCount = autoChecks.filter((c) => c.passed).length;
  const score = autoChecks.length > 0 ? Math.round((autoPassCount / autoChecks.length) * 100) : 100;

  const config = loadPipelineConfig(projectName);
  const allAutoPassed = autoPassCount === autoChecks.length;

  let status: ReviewState["status"] = "pending_review";
  if (config.gateMode === "none") {
    status = "approved";
  } else if (config.gateMode === "auto" && allAutoPassed) {
    status = "approved";
  }

  const review: ReviewState = {
    status,
    reviewedAt: status === "approved" ? new Date().toISOString() : undefined,
    reviewer: status === "approved" ? "auto" : undefined,
    checklist,
    score,
  };

  saveReview(projectName, stepId, review);
  return review;
}

export function submitReview(
  projectName: string,
  stepId: string,
  action: "approve" | "reject" | "skip",
  opts?: { notes?: string; checklist?: Record<string, boolean> },
): ReviewState {
  const existing = loadReviews(projectName)[stepId];
  const checklist = existing?.checklist ?? [];

  if (opts?.checklist) {
    for (const item of checklist) {
      if (item.type === "manual" && opts.checklist[item.id] !== undefined) {
        item.passed = opts.checklist[item.id];
      }
    }
  }

  const review: ReviewState = {
    status: action === "approve" ? "approved" : action === "reject" ? "rejected" : "skipped",
    reviewedAt: new Date().toISOString(),
    reviewer: "user",
    notes: opts?.notes,
    checklist,
    score: existing?.score,
  };

  saveReview(projectName, stepId, review);
  return review;
}

export function getReviewRules(stepId: string): ReviewRule[] {
  return REVIEW_RULES[stepId] ?? [];
}
