import YAML from "yaml";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import {
  getCharacters,
  getScenes,
  getShots,
  getWorkspaceDir,
} from "./workspace.js";

interface AvailableView {
  id: string;
  label: string;
  focusType?: string;
  focusLabel?: string;
}

interface SourceFileInfo {
  name: string;
  path: string;
  size: number;
}

interface AgentContext {
  project: { name: string; path: string } | null;
  view: { currentTab: string; currentView: string };
  focus: {
    characterId?: string;
    characterName?: string;
    sceneId?: string;
    sceneName?: string;
    shotId?: string;
    selectedFile?: string;
  };
  summary: {
    totalCharacters?: number;
    totalScenes?: number;
    totalShots?: number;
    hasStyle?: boolean;
    sourceFiles?: SourceFileInfo[];
  };
  availableViews?: AvailableView[];
}

interface MentionRef {
  type: "file" | "character" | "scene" | "shot" | "skill" | "audio" | "video";
  id: string;
  label: string;
}

interface ImageAttachment {
  id: string;
  dataUrl: string;
  name?: string;
  size: number;
}

function buildTabLabelsFromViews(views?: AvailableView[]): Record<string, string> {
  if (!views?.length) return {};
  return Object.fromEntries(views.map((v) => [v.id, v.label]));
}

function buildUiInstructions(views?: AvailableView[]): string {
  if (!views?.length) return "";

  const lines: string[] = [
    "\n[UI 控制 - 重要]",
    "你必须在回复的最开头嵌入 UI 导航标记来同步界面。标记会被系统自动处理，用户不会看到。",
    "规则：当用户提到某类数据时，你的回复必须以对应的 [UI:navigate:xxx] 开头。",
    "",
    "可用标记：",
  ];

  for (const v of views) {
    lines.push(`- [UI:navigate:${v.id}] -- 切换到${v.label}页面`);
    if (v.focusType && v.focusLabel) {
      lines.push(`- [UI:focus:${v.focusType}:ID] -- 聚焦具体${v.focusLabel}`);
    }
  }

  lines.push("");
  lines.push("示例：用户说\"看看角色\"，你的回复应为：[UI:navigate:characters]好的，以下是项目角色...");
  lines.push("示例：用户说\"查看场景\"，你的回复应为：[UI:navigate:scenes]好的，以下是场景列表...");
  lines.push("");
  lines.push("[流水线自动执行 - 重要]");
  lines.push(
    "当用户要求重新生成分镜图、分镜视频、配音、角色图等，且你已完成文件修改（如 YAML 中 prompt、image_status 等）后，必须在回复**末尾**单独一行输出以下标记（无其它文字在同一行）。系统会解析并自动调用流水线，用户无需再点「选中出图」「选中生视频」等按钮。",
  );
  lines.push("格式：[UI:pipeline:<stepId>:<action>:<分镜或角色ID>[,ID2...]]");
  lines.push("常用：");
  lines.push("  - 分镜重新出图：[UI:pipeline:shots-to-images:run-selected:SH_01_002]");
  lines.push("  - 分镜重新生视频：[UI:pipeline:shots-to-ai-video:run-selected:SH_01_002]");
  lines.push("  - 分镜重新配音：[UI:pipeline:shots-to-audio:run-selected:SH_01_002]");
  lines.push("  - 角色肖像重绘：[UI:pipeline:extract-characters:regenerate-one:角色ID]");
  lines.push("  - 全部失败重试（无 ID）：[UI:pipeline:shots-to-images:retry-failed:] （action 为 retry-failed 时冒号后可为空）");
  lines.push("规则：多个 ID 用英文逗号分隔；每完成一次「需要触发生成」的操作，在当条回复末尾输出对应一行标记；标记会被界面隐藏，勿在标记行写解释。");
  return lines.join("\n");
}

export function buildContextPrompt(context?: AgentContext | null): string {
  if (!context) return "";

  const tabLabels = buildTabLabelsFromViews(context.availableViews);
  const lines: string[] = ["[当前上下文]"];

  const parts: string[] = [];
  if (context.project?.name) parts.push(`项目: ${context.project.name}`);
  const tabLabel = tabLabels[context.view?.currentTab] ?? context.view?.currentTab;
  if (tabLabel) parts.push(`页面: ${tabLabel}`);

  const focusParts: string[] = [];
  if (context.focus?.characterName) {
    focusParts.push(`角色: ${context.focus.characterName} (${context.focus.characterId})`);
  }
  if (context.focus?.sceneName) {
    focusParts.push(`场景: ${context.focus.sceneName} (${context.focus.sceneId})`);
  }
  if (context.focus?.shotId) focusParts.push(`分镜: ${context.focus.shotId}`);
  if (context.focus?.selectedFile) focusParts.push(`文件: ${context.focus.selectedFile}`);

  if (focusParts.length > 0) parts.push(`聚焦: ${focusParts.join(", ")}`);
  if (parts.length > 0) lines.push(parts.join(" | "));

  if (context.focus?.characterName || context.focus?.sceneId || context.focus?.shotId) {
    const focusInstructions: string[] = [
      "⚠️ 聚焦规则（最高优先级）：用户界面已选中上述聚焦对象。",
      "当用户说「这个角色」「当前角色」「这个」「重新制作」「换图」「重新生成」等指代当前对象的表述时，必须且只能操作聚焦的对象：",
    ];
    if (context.focus.characterName) {
      focusInstructions.push(`  → 目标角色: ${context.focus.characterName} (ID: ${context.focus.characterId})`);
      focusInstructions.push(
        "  → 角色改图：更新该角色 YAML 中的提示词/描述后，在回复末尾输出一行 [UI:pipeline:extract-characters:regenerate-one:角色ID]（使用上文 ID），系统将自动为该角色重新出图，无需用户手动点「选中出图」。",
      );
    }
    if (context.focus.sceneName) {
      focusInstructions.push(`  → 目标场景: ${context.focus.sceneName} (ID: ${context.focus.sceneId})`);
    }
    if (context.focus.shotId) {
      focusInstructions.push(`  → 目标分镜: ${context.focus.shotId}`);
      focusInstructions.push(
        "  → 分镜出图/视频/配音：修改该分镜 YAML（如 prompt、image_status、video_status）后，在回复末尾输出一行标记以自动触发生成，无需用户手动点按钮：",
      );
      focusInstructions.push(
        `     出图：[UI:pipeline:shots-to-images:run-selected:${context.focus.shotId}]`,
      );
      focusInstructions.push(
        `     生视频：[UI:pipeline:shots-to-ai-video:run-selected:${context.focus.shotId}]`,
      );
      focusInstructions.push(
        `     配音：[UI:pipeline:shots-to-audio:run-selected:${context.focus.shotId}]`,
      );
      focusInstructions.push(
        "     若用户只要其中一种，只输出对应一行；若同时要图和视频，可分两行输出。",
      );
    }
    focusInstructions.push("严禁操作其他未聚焦的对象。如有歧义，优先使用聚焦对象。");
    lines.push(focusInstructions.join("\n"));
  }

  const summaryParts: string[] = [];
  if (context.summary?.totalCharacters != null)
    summaryParts.push(`${context.summary.totalCharacters}角色`);
  if (context.summary?.totalScenes != null)
    summaryParts.push(`${context.summary.totalScenes}场景`);
  if (context.summary?.totalShots != null)
    summaryParts.push(`${context.summary.totalShots}分镜`);
  if (summaryParts.length > 0)
    lines.push(`数据: ${summaryParts.join(", ")}`);

  if (context.summary?.sourceFiles?.length) {
    const fileList = context.summary.sourceFiles
      .map((f) => `  - ${f.name} (${(f.size / 1024).toFixed(1)}KB) @ ${f.path}`)
      .join("\n");
    lines.push(`源文件（小说/剧本）:\n${fileList}`);
  }

  const uiInstructions = buildUiInstructions(context.availableViews);
  if (uiInstructions) lines.push(uiInstructions);

  return lines.length > 1 ? lines.join("\n") : "";
}

export function resolveReference(
  ref: MentionRef,
  projectDir?: string,
): string {
  try {
    switch (ref.type) {
      case "file": {
        const base = projectDir || getWorkspaceDir();
        const filePath = join(base, ref.id);
        if (!existsSync(filePath)) return `[文件不存在: ${ref.id}]`;
        return readFileSync(filePath, "utf-8");
      }
      case "character": {
        if (!projectDir) return `[未知角色: ${ref.id}]`;
        const projectName = projectDir.split("/").pop()!;
        const chars = getCharacters(projectName) as Record<string, unknown>[];
        const char = chars.find((c) => c.id === ref.id);
        if (!char) return `[角色未找到: ${ref.id}]`;
        return YAML.stringify(char);
      }
      case "scene": {
        if (!projectDir) return `[未知场景: ${ref.id}]`;
        const projectName = projectDir.split("/").pop()!;
        const { scenes } = getScenes(projectName);
        const scene = (scenes as Record<string, unknown>[]).find(
          (s) => s.id === ref.id,
        );
        if (!scene) return `[场景未找到: ${ref.id}]`;
        return YAML.stringify(scene);
      }
      case "shot": {
        if (!projectDir) return `[未知分镜: ${ref.id}]`;
        const projectName = projectDir.split("/").pop()!;
        const { scenes: shotScenes } = getShots(projectName);
        for (const sc of shotScenes) {
          const shot = (sc.shots as Record<string, unknown>[]).find(
            (s) => s.id === ref.id,
          );
          if (shot) return YAML.stringify(shot);
        }
        return `[分镜未找到: ${ref.id}]`;
      }
      case "audio":
        return `[音频文件]\n名称: ${ref.label}\n路径: ${ref.id}\n（项目内生成的配音/音频资源，可用于剪辑或检查）`;
      case "video":
        return `[视频文件]\n名称: ${ref.label}\n路径: ${ref.id}\n（项目内生成的视频片段，可用于剪辑或检查）`;
      case "skill":
        return `[技能: ${ref.label}]`;
      default:
        return `[未知引用类型: ${ref.type}]`;
    }
  } catch {
    return `[解析引用失败: ${ref.type}:${ref.id}]`;
  }
}

export function buildReferencesBlock(
  references?: MentionRef[],
  projectDir?: string,
): string {
  if (!references || references.length === 0) return "";

  const blocks = references.map((ref) => {
    const content = resolveReference(ref, projectDir);
    return `[引用: @${ref.label} (${ref.type})]\n${content}`;
  });

  return blocks.join("\n\n");
}

export function buildImagesBlock(
  attachments?: ImageAttachment[],
): string {
  if (!attachments || attachments.length === 0) return "";

  if (attachments.length === 1) {
    return `[附件: 1张图片]\n<image>${attachments[0].dataUrl}</image>`;
  }

  return attachments
    .map(
      (att, i) =>
        `[附件: 图片${i + 1}/${attachments.length}]\n<image>${att.dataUrl}</image>`,
    )
    .join("\n\n");
}

const CONTENT_KEYWORDS = [
  "提取角色", "角色提取", "提取人物", "人物提取",
  "提取场景", "场景提取", "分析角色", "分析人物",
  "分析场景", "提取道具", "剧本分析", "分析剧本",
  "分析小说", "小说分析", "读一下", "读取小说",
  "看看小说", "看看内容", "原文", "正文",
  "转换剧本", "改编", "场景切分", "拆分场景",
  "故事梗概", "梗概", "摘要", "总结",
  "extract character", "extract scene",
];

export function buildWorkspaceGuide(context?: AgentContext | null): string {
  if (!context?.project?.name) return "";

  const projectDir = context.project.path || join(getWorkspaceDir(), context.project.name);
  const projectName = context.project.name;

  const lines = [
    "[工作空间操作指南 - 最高优先级]",
    "",
    `⚠️ 所有文件必须保存到以下项目目录，不允许使用任何其他路径：`,
    `项目目录: ${projectDir}`,
    "",
    "===== 目录覆盖规则 =====",
    `你的 workspace 已被设置为: ${projectDir}`,
    "如果你的技能（skill）要自动创建子目录或使用其他路径，你必须覆盖它：",
    `- 所有产物直接写入 ${projectDir}/ 下`,
    `- 不要在 ${projectDir} 下再创建以小说标题命名的子目录`,
    `- 文件名前缀使用「${projectName}」，不是小说标题`,
    "=============================",
    "",
    "执行前先确认目录存在：",
    `  mkdir -p "${projectDir}"`,
    "",
    "项目文件结构规范:",
    `  ${projectDir}/`,
    `  ├── style.yaml                          # 全局风格配置`,
    `  ├── ${projectName}_角色资产.yaml          # 角色数据`,
    `  ├── ${projectName}_角色资产.md            # 角色可读版`,
    `  ├── ${projectName}_角色展示.html          # 角色可视化`,
    `  ├── scenes/                             # 场景文件`,
    `  └── shots/                              # 分镜文件`,
    "",
    "关键要求：",
    "1. 完成提取后，必须用 exec/write 工具将结果写入上述路径的文件",
    "2. 只在回复中口头描述结果是不够的，用户需要实际的文件产物",
    `3. 绝对禁止写入 ${projectDir} 以外的任何路径`,
  ];

  return lines.join("\n");
}

const MAX_INJECT_CHARS = 80000;

export function shouldInjectSourceContent(message: string): boolean {
  const msg = message.toLowerCase();
  return CONTENT_KEYWORDS.some((kw) => msg.includes(kw));
}

export function buildSourceContentBlock(
  context?: AgentContext | null,
): string {
  if (!context?.project?.name) return "";
  const files = context.summary?.sourceFiles;
  if (!files?.length) return "";

  const lines: string[] = ["[项目源文件内容]"];
  let totalChars = 0;

  for (const f of files) {
    if (totalChars >= MAX_INJECT_CHARS) {
      lines.push(`\n... 已达上下文限制，剩余文件省略 ...`);
      break;
    }
    try {
      const base = getWorkspaceDir();
      const filePath = join(base, f.path);
      if (!existsSync(filePath)) continue;
      let content = readFileSync(filePath, "utf-8");
      const remaining = MAX_INJECT_CHARS - totalChars;
      if (content.length > remaining) {
        content = content.slice(0, remaining) + `\n\n... [已截断，原文共 ${content.length} 字] ...`;
      }
      lines.push(`\n--- ${f.name} ---`);
      lines.push(content);
      totalChars += content.length;
    } catch {
      lines.push(`\n--- ${f.name} [读取失败] ---`);
    }
  }

  return lines.length > 1 ? lines.join("\n") : "";
}

interface PipelineStep {
  id: string;
  name: string;
  skill: string | null;
  order: number;
  requires?: string[];
  optional?: boolean;
}

function loadPipelineManifest(): { name: string; steps: PipelineStep[] } | null {
  const oclawHome = process.env.OPENCLAW_STATE_DIR || join(homedir(), ".openclaw");
  const manifestPath = join(oclawHome, "bundled-skills", "_pipeline.yaml");
  if (!existsSync(manifestPath)) return null;
  try {
    return YAML.parse(readFileSync(manifestPath, "utf-8"));
  } catch {
    return null;
  }
}

const ARTIFACT_CHECKS: Record<string, (dir: string, name: string) => boolean> = {
  "novel-00-long-novel-to-script": (dir, name) =>
    existsSync(join(dir, `${name}_剧本.md`)) ||
    existsSync(join(dir, ".pipeline", "novel_chunks_manifest.json")),
  "novel-to-script": (dir) =>
    existsSync(join(dir, "scenes")) || existsSync(join(dir, "style.yaml")),
  "novel-01-character-extractor": (dir, name) =>
    existsSync(join(dir, `${name}_角色资产.yaml`)),
  "novel-02-script-to-scenes": (dir) => existsSync(join(dir, "scenes")),
  "novel-03-scenes-to-storyboard": (dir) => existsSync(join(dir, "shots", "_manifest.yaml")),
  "novel-04-shots-to-images": (dir) => existsSync(join(dir, "index.html")),
  "novel-05-shots-to-audio": (dir) => existsSync(join(dir, "shots", "_manifest.yaml")),
  "novel-07-remotion": (dir) => existsSync(join(dir, "output", "remotion")),
  "novel-07-shots-to-video": (dir) => existsSync(join(dir, "output", "videos")),
  "novel-08-ai-edit-video": (dir) => {
    const ed = join(dir, "output", "edited");
    return (
      existsSync(ed) && readdirSync(ed).some((f) => f.endsWith(".mp4"))
    );
  },
  "novel-09-video-quality-review": (dir) =>
    existsSync(join(dir, ".pipeline", "video_quality.json")),
};

export function buildPipelineContext(context?: AgentContext | null): string {
  if (!context?.project?.path) return "";
  const pipeline = loadPipelineManifest();
  if (!pipeline) return "";

  const projectDir = context.project.path;
  const projectName = context.project.name;

  const lines = [
    `[创作流水线: ${pipeline.name}]`,
    "",
  ];

  for (const step of pipeline.steps) {
    const check = step.skill ? ARTIFACT_CHECKS[step.skill] : null;
    const done = check ? check(projectDir, projectName) : false;
    const status = done ? "✓" : "○";
    const optional = step.optional ? " (可选)" : "";
    lines.push(`  ${status} ${step.order}. ${step.name}${optional}`);
  }

  lines.push("");
  lines.push("流水线规则: 按步骤顺序执行，可跳过标记为可选的步骤。步骤 6(出图) 和 7(配音) 可并行。");

  return lines.join("\n");
}

export function buildEnhancedPrompt(
  message: string,
  options: {
    context?: AgentContext | null;
    references?: MentionRef[];
    attachments?: ImageAttachment[];
    projectDir?: string;
  },
): string {
  const parts = [
    buildContextPrompt(options.context),
    buildReferencesBlock(options.references, options.projectDir),
    buildImagesBlock(options.attachments),
    `[用户消息]\n${message}`,
  ].filter(Boolean);

  return parts.join("\n\n");
}
