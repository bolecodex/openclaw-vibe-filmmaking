import { existsSync, readdirSync, readFileSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import YAML from "yaml";
import type { QualityReport, QualityIssue } from "./quality-checker.js";
import { getWorkspaceDir } from "./workspace.js";
import { getGateway } from "./gateway-client.js";

export interface FixResult {
  success: boolean;
  fixedIssues: string[];
  failedIssues: string[];
  message: string;
  regeneratedCount?: number;
}

export async function autoFix(issue: QualityIssue, projectDir: string): Promise<FixResult> {
  if (!issue.autoFixable) {
    return {
      success: false,
      fixedIssues: [],
      failedIssues: [issue.type],
      message: `问题 ${issue.type} 无法自动修复`,
    };
  }

  switch (issue.type) {
    case "missing_characters":
      return await regenerateMissingCharacters(projectDir, issue.details);
    case "poor_quality_images":
      return await regenerateLowQualityImages(projectDir, issue.details);
    case "scene_boundary_error":
      return await fixSceneBoundaries(projectDir, issue.details);
    case "shot_duration_too_long":
      return await splitLongShots(projectDir, issue.details);
    case "missing_images":
      return await regenerateMissingImages(projectDir, issue.details);
    case "missing_audio":
      return await regenerateMissingAudio(projectDir, issue.details);
    case "skill_not_found":
      return await createOrUpdateSkill(projectDir, issue.details);
    default:
      return {
        success: false,
        fixedIssues: [],
        failedIssues: [issue.type],
        message: `未知问题类型: ${issue.type}`,
      };
  }
}

export async function fixQualityIssues(
  qualityReport: QualityReport,
  projectDir: string,
): Promise<FixResult> {
  const fixedIssues: string[] = [];
  const failedIssues: string[] = [];

  for (const issue of qualityReport.issues) {
    const qualityIssue: QualityIssue = {
      type: inferIssueType(issue),
      severity: "medium",
      message: issue,
      details: {},
      autoFixable: qualityReport.autoFixable,
    };

    const result = await autoFix(qualityIssue, projectDir);
    if (result.success) {
      fixedIssues.push(...result.fixedIssues);
    } else {
      failedIssues.push(...result.failedIssues);
    }
  }

  return {
    success: fixedIssues.length > 0,
    fixedIssues,
    failedIssues,
    message: `修复了 ${fixedIssues.length} 个问题，${failedIssues.length} 个问题无法自动修复`,
  };
}

function inferIssueType(issue: string): string {
  if (issue.includes("角色") && issue.includes("图片")) return "missing_characters";
  if (issue.includes("图片") && (issue.includes("质量") || issue.includes("过小"))) return "poor_quality_images";
  if (issue.includes("图片") && issue.includes("缺失")) return "missing_images";
  if (issue.includes("音频") && issue.includes("缺失")) return "missing_audio";
  if (issue.includes("场景") && issue.includes("边界")) return "scene_boundary_error";
  if (issue.includes("分镜") && issue.includes("时长")) return "shot_duration_too_long";
  return "unknown";
}

async function regenerateMissingCharacters(
  projectDir: string,
  details: Record<string, unknown>,
): Promise<FixResult> {
  const charactersDir = join(projectDir, "characters");
  if (!existsSync(charactersDir)) {
    return {
      success: false,
      fixedIssues: [],
      failedIssues: ["missing_characters"],
      message: "角色目录不存在",
    };
  }

  const files = readdirSync(charactersDir).filter((f) => f.endsWith(".yaml"));
  let regenerated = 0;

  for (const file of files) {
    const filePath = join(charactersDir, file);
    try {
      const content = readFileSync(filePath, "utf-8");
      const data = YAML.parse(content);
      if (!data.image && !data.portrait) {
        const gateway = getGateway();
        if (gateway.isConnected) {
          const prompt = `为角色 ${data.name || data.id} 生成角色图片。角色描述：${data.description || data.appearance || ""}`;
          const stream = gateway.promptStream(prompt);
          for await (const event of stream) {
            if (event.type === "done" || event.type === "error") break;
          }
          regenerated++;
        }
      }
    } catch (err) {
      console.error(`Failed to regenerate character image for ${file}:`, err);
    }
  }

  return {
    success: regenerated > 0,
    fixedIssues: regenerated > 0 ? ["missing_characters"] : [],
    failedIssues: regenerated === 0 ? ["missing_characters"] : [],
    message: regenerated > 0 ? `已为 ${regenerated} 个角色生成图片` : "角色图片生成失败",
    regeneratedCount: regenerated,
  };
}

async function regenerateLowQualityImages(
  projectDir: string,
  details: Record<string, unknown>,
): Promise<FixResult> {
  const imagesDir = join(projectDir, "output", "images");
  if (!existsSync(imagesDir)) {
    return {
      success: false,
      fixedIssues: [],
      failedIssues: ["poor_quality_images"],
      message: "图片目录不存在",
    };
  }

  const files = readdirSync(imagesDir).filter((f) => f.endsWith(".png") || f.endsWith(".jpg"));
  const { statSync } = await import("fs");
  let regenerated = 0;

  for (const file of files) {
    const filePath = join(imagesDir, file);
    try {
      const stats = statSync(filePath);
      if (stats.size < 100000) {
        unlinkSync(filePath);
        const gateway = getGateway();
          if (gateway.isConnected) {
            const shotId = file.replace(/\.(png|jpg)$/, "");
            const shotsDir = join(projectDir, "shots");
            const shotFile = join(shotsDir, `${shotId}.yaml`);
            if (existsSync(shotFile)) {
              const shotContent = readFileSync(shotFile, "utf-8");
              const shotData = YAML.parse(shotContent);
              const prompt = `根据分镜提示词重新生成图片：${shotData.prompt || shotData.image_prompt || ""}`;
              const stream = gateway.promptStream(prompt);
              for await (const event of stream) {
                if (event.type === "done" || event.type === "error") break;
              }
              regenerated++;
            }
          }
      }
    } catch (err) {
      console.error(`Failed to regenerate image ${file}:`, err);
    }
  }

  return {
    success: regenerated > 0,
    fixedIssues: regenerated > 0 ? ["poor_quality_images"] : [],
    failedIssues: regenerated === 0 ? ["poor_quality_images"] : [],
    message: regenerated > 0 ? `已重新生成 ${regenerated} 张低质量图片` : "图片重新生成失败",
    regeneratedCount: regenerated,
  };
}

async function regenerateMissingImages(
  projectDir: string,
  details: Record<string, unknown>,
): Promise<FixResult> {
  const shotsDir = join(projectDir, "shots");
  const imagesDir = join(projectDir, "output", "images");
  if (!existsSync(shotsDir) || !existsSync(imagesDir)) {
    return {
      success: false,
      fixedIssues: [],
      failedIssues: ["missing_images"],
      message: "分镜或图片目录不存在",
    };
  }

  const shotFiles = readdirSync(shotsDir).filter((f) => f.endsWith(".yaml"));
  const imageFiles = readdirSync(imagesDir).filter((f) => f.endsWith(".png") || f.endsWith(".jpg"));
  const imageIds = new Set(imageFiles.map((f) => f.replace(/\.(png|jpg)$/, "")));

  let regenerated = 0;
  const gateway = getGateway();

  for (const file of shotFiles) {
    const shotId = file.replace(/\.yaml$/, "");
    if (!imageIds.has(shotId)) {
      try {
        const shotContent = readFileSync(join(shotsDir, file), "utf-8");
        const shotData = YAML.parse(shotContent);
        if (gateway.isConnected) {
          const prompt = `根据分镜提示词生成图片：${shotData.prompt || shotData.image_prompt || ""}`;
          const stream = gateway.promptStream(prompt);
          for await (const event of stream) {
            if (event.type === "done" || event.type === "error") break;
          }
          regenerated++;
        }
      } catch (err) {
        console.error(`Failed to regenerate missing image for ${file}:`, err);
      }
    }
  }

  return {
    success: regenerated > 0,
    fixedIssues: regenerated > 0 ? ["missing_images"] : [],
    failedIssues: regenerated === 0 ? ["missing_images"] : [],
    message: regenerated > 0 ? `已生成 ${regenerated} 张缺失的图片` : "图片生成失败",
    regeneratedCount: regenerated,
  };
}

async function regenerateMissingAudio(
  projectDir: string,
  details: Record<string, unknown>,
): Promise<FixResult> {
  const shotsDir = join(projectDir, "shots");
  const audioDir = join(projectDir, "output", "audio");
  if (!existsSync(shotsDir) || !existsSync(audioDir)) {
    return {
      success: false,
      fixedIssues: [],
      failedIssues: ["missing_audio"],
      message: "分镜或音频目录不存在",
    };
  }

  const shotFiles = readdirSync(shotsDir).filter((f) => f.endsWith(".yaml"));
  const audioFiles = readdirSync(audioDir).filter((f) => f.endsWith(".mp3") || f.endsWith(".wav"));
  const audioIds = new Set(audioFiles.map((f) => f.replace(/\.(mp3|wav)$/, "")));

  let regenerated = 0;
  const gateway = getGateway();

  for (const file of shotFiles) {
    const shotId = file.replace(/\.yaml$/, "");
    if (!audioIds.has(shotId)) {
      try {
        const shotContent = readFileSync(join(shotsDir, file), "utf-8");
        const shotData = YAML.parse(shotContent);
        if (gateway.isConnected && shotData.dialogue) {
          const prompt = `为以下台词生成配音：${shotData.dialogue}`;
          const stream = gateway.promptStream(prompt);
          for await (const event of stream) {
            if (event.type === "done" || event.type === "error") break;
          }
          regenerated++;
        }
      } catch (err) {
        console.error(`Failed to regenerate missing audio for ${file}:`, err);
      }
    }
  }

  return {
    success: regenerated > 0,
    fixedIssues: regenerated > 0 ? ["missing_audio"] : [],
    failedIssues: regenerated === 0 ? ["missing_audio"] : [],
    message: regenerated > 0 ? `已生成 ${regenerated} 个缺失的音频` : "音频生成失败",
    regeneratedCount: regenerated,
  };
}

async function fixSceneBoundaries(
  projectDir: string,
  details: Record<string, unknown>,
): Promise<FixResult> {
  return {
    success: false,
    fixedIssues: [],
    failedIssues: ["scene_boundary_error"],
    message: "场景边界修复需要人工干预",
  };
}

async function splitLongShots(projectDir: string, details: Record<string, unknown>): Promise<FixResult> {
  const shotsDir = join(projectDir, "shots");
  if (!existsSync(shotsDir)) {
    return {
      success: false,
      fixedIssues: [],
      failedIssues: ["shot_duration_too_long"],
      message: "分镜目录不存在",
    };
  }

  const files = readdirSync(shotsDir).filter((f) => f.endsWith(".yaml"));
  let splitCount = 0;

  for (const file of files) {
    const filePath = join(shotsDir, file);
    try {
      const content = readFileSync(filePath, "utf-8");
      const data = YAML.parse(content);
      const duration = parseFloat(data.duration || "0");
      if (duration > 7) {
        const numSplits = Math.ceil(duration / 5);
        const newDuration = duration / numSplits;
        for (let i = 0; i < numSplits; i++) {
          const newData = {
            ...data,
            id: `${data.id}_${i + 1}`,
            duration: newDuration.toFixed(2),
            order: (data.order || 0) + i,
          };
          const newFileName = file.replace(/\.yaml$/, `_${i + 1}.yaml`);
          writeFileSync(join(shotsDir, newFileName), YAML.stringify(newData));
        }
        unlinkSync(filePath);
        splitCount++;
      }
    } catch (err) {
      console.error(`Failed to split long shot ${file}:`, err);
    }
  }

  return {
    success: splitCount > 0,
    fixedIssues: splitCount > 0 ? ["shot_duration_too_long"] : [],
    failedIssues: splitCount === 0 ? ["shot_duration_too_long"] : [],
    message: splitCount > 0 ? `已拆分 ${splitCount} 个超长分镜` : "分镜拆分失败",
    regeneratedCount: splitCount,
  };
}

async function createOrUpdateSkill(
  projectDir: string,
  details: Record<string, unknown>,
): Promise<FixResult> {
  return {
    success: false,
    fixedIssues: [],
    failedIssues: ["skill_not_found"],
    message: "技能创建/更新需要技能适配器支持",
  };
}
