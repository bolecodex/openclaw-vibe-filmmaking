import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import YAML from "yaml";
import { getWorkspaceDir } from "./workspace.js";

export type ExecutionStatus =
  | "pending"
  | "ready"
  | "running"
  | "completed"
  | "partial"
  | "error";

export type ReviewStatus =
  | "not_started"
  | "pending_review"
  | "approved"
  | "rejected"
  | "skipped";

export interface CheckItem {
  id: string;
  label: string;
  type: "auto" | "manual";
  passed: boolean | null;
  detail?: string;
}

export interface ReviewState {
  status: ReviewStatus;
  reviewedAt?: string;
  reviewer?: string;
  notes?: string;
  checklist?: CheckItem[];
  score?: number;
}

export interface StepState {
  id: string;
  name: string;
  status: ExecutionStatus;
  completedCount?: number;
  totalCount?: number;
  lastUpdated?: string;
  canRun: boolean;
  review: ReviewState;
}

export interface PipelineState {
  projectName: string;
  projectPath: string;
  overallProgress: number;
  steps: StepState[];
}

function safeReadYaml(filePath: string): Record<string, unknown> | null {
  if (!existsSync(filePath)) return null;
  try {
    return YAML.parse(readFileSync(filePath, "utf-8")) ?? null;
  } catch {
    return null;
  }
}

function countFiles(dir: string, pattern: RegExp): number {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter((f) => pattern.test(f)).length;
}

function latestMtime(dir: string): string | undefined {
  if (!existsSync(dir)) return undefined;
  let latest = 0;
  for (const f of readdirSync(dir)) {
    try {
      const t = statSync(join(dir, f)).mtime.getTime();
      if (t > latest) latest = t;
    } catch {}
  }
  return latest > 0 ? new Date(latest).toISOString() : undefined;
}

function findFile(dir: string, suffix: string): string | null {
  if (!existsSync(dir)) return null;
  const f = readdirSync(dir).find((n) => n.endsWith(suffix));
  return f ? join(dir, f) : null;
}

// --- Per-step detection ---

function detectCharacterStatus(projectDir: string): Omit<StepState, "id" | "name" | "canRun" | "review"> {
  const charFile = findFile(projectDir, "_角色资产.yaml");
  if (!charFile) return { status: "pending" };

  const data = safeReadYaml(charFile);
  const chars = (data?.characters as unknown[]) ?? [];
  const total = chars.length;
  if (total === 0) return { status: "pending" };

  const withImage = chars.filter(
    (c) => (c as Record<string, unknown>).image_url,
  ).length;

  const stat = statSync(charFile);
  return {
    status: withImage === total ? "completed" : "partial",
    completedCount: withImage,
    totalCount: total,
    lastUpdated: stat.mtime.toISOString(),
  };
}

function detectSceneStatus(projectDir: string): Omit<StepState, "id" | "name" | "canRun" | "review"> {
  const scenesDir = join(projectDir, "scenes");
  const sceneCount = countFiles(scenesDir, /^SC_.*\.md$/);
  const indexFile = findFile(projectDir, "_场景索引.yaml");

  if (sceneCount === 0 && !indexFile) return { status: "pending" };

  return {
    status: "completed",
    completedCount: sceneCount,
    totalCount: sceneCount,
    lastUpdated: latestMtime(scenesDir) ?? (indexFile ? statSync(indexFile).mtime.toISOString() : undefined),
  };
}

function detectScenesToImagesStatus(projectDir: string): Omit<StepState, "id" | "name" | "canRun" | "review"> {
  const indexFile = findFile(projectDir, "_场景索引.yaml");
  if (!indexFile) return { status: "pending" };

  const data = safeReadYaml(indexFile);
  const scenes = (data?.scenes as Record<string, unknown>[]) ?? [];
  const total = scenes.length;
  if (total === 0) return { status: "pending" };

  const withImage = scenes.filter(
    (s) => s.image_path || s.image_url || s.image_status === "completed",
  ).length;

  return {
    status: withImage === 0 ? "pending" : withImage === total ? "completed" : "partial",
    completedCount: withImage,
    totalCount: total,
    lastUpdated: statSync(indexFile).mtime.toISOString(),
  };
}

function detectPropsStatus(projectDir: string): Omit<StepState, "id" | "name" | "canRun" | "review"> {
  const propFile = findFile(projectDir, "_道具资产.yaml");
  if (!propFile) return { status: "pending" };

  const data = safeReadYaml(propFile);
  const props = (data?.props ?? data?.items) as Record<string, unknown>[] | undefined;
  const list = Array.isArray(props) ? props : [];
  const total = list.length;
  if (total === 0) return { status: "pending" };

  const withImage = list.filter(
    (p) => p.image_path || p.image_url || p.image_status === "completed",
  ).length;

  return {
    status: withImage === 0 ? "pending" : withImage === total ? "completed" : "partial",
    completedCount: withImage,
    totalCount: total,
    lastUpdated: statSync(propFile).mtime.toISOString(),
  };
}

function detectStoryboardStatus(projectDir: string): Omit<StepState, "id" | "name" | "canRun" | "review"> {
  const shotsDir = join(projectDir, "shots");
  const manifestPath = join(shotsDir, "_manifest.yaml");
  if (!existsSync(manifestPath)) return { status: "pending" };

  const shotFiles = countFiles(shotsDir, /^SC_.*\.yaml$/);
  if (shotFiles === 0) return { status: "pending" };

  let totalShots = 0;
  for (const f of readdirSync(shotsDir).filter((n) => /^SC_.*\.yaml$/.test(n))) {
    const data = safeReadYaml(join(shotsDir, f));
    totalShots += ((data?.shots as unknown[]) ?? []).length;
  }

  return {
    status: totalShots > 0 ? "completed" : "partial",
    completedCount: totalShots,
    totalCount: totalShots,
    lastUpdated: latestMtime(shotsDir),
  };
}

function detectImageStatus(projectDir: string): Omit<StepState, "id" | "name" | "canRun" | "review"> {
  const shotsDir = join(projectDir, "shots");
  if (!existsSync(shotsDir)) return { status: "pending" };

  let total = 0;
  let withImage = 0;

  for (const f of readdirSync(shotsDir).filter((n) => /^SC_.*\.yaml$/.test(n))) {
    const data = safeReadYaml(join(shotsDir, f));
    const shots = (data?.shots as Record<string, unknown>[]) ?? [];
    for (const s of shots) {
      total++;
      if (s.image_url || s.image_path || s.image_status === "completed") withImage++;
    }
  }

  if (total === 0) return { status: "pending" };

  return {
    status: withImage === 0 ? "pending" : withImage === total ? "completed" : "partial",
    completedCount: withImage,
    totalCount: total,
    lastUpdated: latestMtime(shotsDir),
  };
}

function detectAudioStatus(projectDir: string): Omit<StepState, "id" | "name" | "canRun" | "review"> {
  const shotsDir = join(projectDir, "shots");
  if (!existsSync(shotsDir)) return { status: "pending" };

  let total = 0;
  let withAudio = 0;

  for (const f of readdirSync(shotsDir).filter((n) => /^SC_.*\.yaml$/.test(n))) {
    const data = safeReadYaml(join(shotsDir, f));
    const shots = (data?.shots as Record<string, unknown>[]) ?? [];
    for (const s of shots) {
      total++;
      if (s.audio_url || s.audio_path || s.audio_status === "completed") withAudio++;
    }
  }

  if (total === 0) return { status: "pending" };

  return {
    status: withAudio === 0 ? "pending" : withAudio === total ? "completed" : "partial",
    completedCount: withAudio,
    totalCount: total,
    lastUpdated: latestMtime(shotsDir),
  };
}

function detectAiVideoStatus(projectDir: string): Omit<StepState, "id" | "name" | "canRun" | "review"> {
  const shotsDir = join(projectDir, "shots");
  if (!existsSync(shotsDir)) return { status: "pending" };

  let total = 0;
  let withVideo = 0;

  for (const f of readdirSync(shotsDir).filter((n) => /^SC_.*\.yaml$/.test(n))) {
    const data = safeReadYaml(join(shotsDir, f));
    const shots = (data?.shots as Record<string, unknown>[]) ?? [];
    for (const s of shots) {
      total++;
      if (s.video_url || s.video_status === "completed") withVideo++;
    }
  }

  if (total === 0) return { status: "pending" };

  return {
    status: withVideo === 0 ? "pending" : withVideo === total ? "completed" : "partial",
    completedCount: withVideo,
    totalCount: total,
    lastUpdated: latestMtime(shotsDir),
  };
}

function detectLongNovelStatus(projectDir: string): Omit<StepState, "id" | "name" | "canRun" | "review"> {
  const manifestPath = join(projectDir, ".pipeline", "novel_chunks_manifest.json");
  if (!existsSync(manifestPath)) {
    return { status: "pending" };
  }
  try {
    const m = JSON.parse(readFileSync(manifestPath, "utf-8")) as {
      chunks?: Array<{ phases?: { analyzed?: boolean }; status?: string }>;
      total_chunks?: number;
      final_script?: string;
    };
    const chunks = m.chunks ?? [];
    const total = m.total_chunks ?? chunks.length;
    const analyzed = chunks.filter((c) => c.phases?.analyzed || c.status === "completed").length;
    const finalName = m.final_script;
    const finalPath = finalName ? join(projectDir, finalName) : null;
    const hasFinal = finalPath && existsSync(finalPath);
    if (hasFinal && analyzed >= total && total > 0) {
      return {
        status: "completed",
        completedCount: total,
        totalCount: total,
        lastUpdated: statSync(finalPath!).mtime.toISOString(),
      };
    }
    return {
      status: analyzed > 0 ? "partial" : "pending",
      completedCount: analyzed,
      totalCount: total || 1,
      lastUpdated: statSync(manifestPath).mtime.toISOString(),
    };
  } catch {
    return { status: "pending" };
  }
}

function detectAiEditStatus(projectDir: string): Omit<StepState, "id" | "name" | "canRun" | "review"> {
  const edited = join(projectDir, "output", "edited");
  if (!existsSync(edited)) return { status: "pending" };
  const mp4s = readdirSync(edited).filter((f) => f.endsWith(".mp4"));
  if (mp4s.length === 0) return { status: "pending" };
  return {
    status: "completed",
    completedCount: mp4s.length,
    totalCount: mp4s.length,
    lastUpdated: latestMtime(edited),
  };
}

function detectVideoQualityStatus(projectDir: string): Omit<StepState, "id" | "name" | "canRun" | "review"> {
  const p = join(projectDir, ".pipeline", "video_quality.json");
  if (!existsSync(p)) return { status: "pending" };
  try {
    const data = JSON.parse(readFileSync(p, "utf-8")) as { shots?: unknown[] };
    const n = (data.shots as unknown[])?.length ?? 0;
    return {
      status: n > 0 ? "completed" : "partial",
      completedCount: n,
      totalCount: Math.max(n, 1),
      lastUpdated: statSync(p).mtime.toISOString(),
    };
  } catch {
    return { status: "pending" };
  }
}

function detectComposeVideoStatus(projectDir: string): Omit<StepState, "id" | "name" | "canRun" | "review"> {
  const dirs = [
    join(projectDir, "output", "videos"),
    join(projectDir, "output", "remotion", "videos"),
  ];

  let videoCount = 0;
  let lastUpdate: string | undefined;

  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    const mp4s = readdirSync(dir).filter((f) => f.endsWith(".mp4"));
    videoCount += mp4s.length;
    const mt = latestMtime(dir);
    if (mt && (!lastUpdate || mt > lastUpdate)) lastUpdate = mt;
  }

  if (videoCount === 0) return { status: "pending" };

  return {
    status: "completed",
    completedCount: videoCount,
    totalCount: videoCount,
    lastUpdated: lastUpdate,
  };
}

// --- Main detection ---

const DEFAULT_REVIEW: ReviewState = { status: "not_started" };

function loadPersistedReviews(projectDir: string): Record<string, ReviewState> {
  const reviewsPath = join(projectDir, ".pipeline", "reviews.json");
  if (!existsSync(reviewsPath)) return {};
  try {
    return JSON.parse(readFileSync(reviewsPath, "utf-8"));
  } catch {
    return {};
  }
}

export function detectPipelineState(projectName: string): PipelineState {
  const projectDir = join(getWorkspaceDir(), projectName);
  const reviews = loadPersistedReviews(projectDir);

  const charStep = detectCharacterStatus(projectDir);
  const sceneStep = detectSceneStatus(projectDir);
  const storyboardStep = detectStoryboardStatus(projectDir);
  const imageStep = detectImageStatus(projectDir);
  const audioStep = detectAudioStatus(projectDir);
  const aiVideoStep = detectAiVideoStatus(projectDir);
  const composeStep = detectComposeVideoStatus(projectDir);
  const longNovelStep = detectLongNovelStatus(projectDir);
  const aiEditStep = detectAiEditStatus(projectDir);
  const videoQualityStep = detectVideoQualityStatus(projectDir);

  const scenesToImagesStep = detectScenesToImagesStatus(projectDir);
  const hasScenes = sceneStep.status === "completed";
  const hasStoryboard = storyboardStep.status === "completed";

  const propsStep = detectPropsStatus(projectDir);

  const composeDone = composeStep.status === "completed";

  const steps: StepState[] = [
    {
      id: "long-novel-to-script",
      name: "长篇小说→剧本",
      canRun: true,
      review: reviews["long-novel-to-script"] ?? DEFAULT_REVIEW,
      ...longNovelStep,
    },
    {
      id: "extract-characters",
      name: "提取角色",
      canRun: true,
      review: reviews["extract-characters"] ?? DEFAULT_REVIEW,
      ...charStep,
    },
    {
      id: "extract-props",
      name: "提取道具",
      canRun: true,
      review: reviews["extract-props"] ?? DEFAULT_REVIEW,
      ...propsStep,
    },
    {
      id: "script-to-scenes",
      name: "剧本转场景",
      canRun: true,
      review: reviews["script-to-scenes"] ?? DEFAULT_REVIEW,
      ...sceneStep,
    },
    {
      id: "scenes-to-images",
      name: "场景出图",
      canRun: hasScenes,
      review: reviews["scenes-to-images"] ?? DEFAULT_REVIEW,
      ...scenesToImagesStep,
    },
    {
      id: "scenes-to-storyboard",
      name: "场景转分镜",
      canRun: hasScenes,
      review: reviews["scenes-to-storyboard"] ?? DEFAULT_REVIEW,
      ...storyboardStep,
    },
    {
      id: "shots-to-images",
      name: "分镜出图",
      canRun: hasStoryboard,
      review: reviews["shots-to-images"] ?? DEFAULT_REVIEW,
      ...imageStep,
    },
    {
      id: "shots-to-audio",
      name: "分镜配音",
      canRun: hasStoryboard,
      review: reviews["shots-to-audio"] ?? DEFAULT_REVIEW,
      ...audioStep,
    },
    {
      id: "shots-to-ai-video",
      name: "分镜AI视频",
      canRun: hasStoryboard,
      review: reviews["shots-to-ai-video"] ?? DEFAULT_REVIEW,
      ...aiVideoStep,
    },
    {
      id: "compose-video",
      name: "合成长视频",
      canRun: imageStep.status !== "pending" && audioStep.status !== "pending",
      review: reviews["compose-video"] ?? DEFAULT_REVIEW,
      ...composeStep,
    },
    {
      id: "ai-edit-video",
      name: "AI辅助剪辑",
      canRun: composeDone,
      review: reviews["ai-edit-video"] ?? DEFAULT_REVIEW,
      ...aiEditStep,
    },
    {
      id: "video-quality-review",
      name: "视频质量审核",
      canRun: composeDone,
      review: reviews["video-quality-review"] ?? DEFAULT_REVIEW,
      ...videoQualityStep,
    },
  ];

  const completable = steps.filter(
    (s) =>
      ![
        "shots-to-ai-video",
        "long-novel-to-script",
        "ai-edit-video",
        "video-quality-review",
      ].includes(s.id),
  );
  const completed = completable.filter((s) => s.status === "completed").length;
  const overallProgress = completable.length > 0 ? Math.round((completed / completable.length) * 100) : 0;

  return {
    projectName,
    projectPath: projectDir,
    overallProgress,
    steps,
  };
}
