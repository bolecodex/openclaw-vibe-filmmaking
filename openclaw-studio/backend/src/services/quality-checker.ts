import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import YAML from "yaml";
import { getWorkspaceDir } from "./workspace.js";

export interface QualityReport {
  stepId: string;
  score: number;
  passed: boolean;
  issues: string[];
  suggestions: string[];
  autoFixable: boolean;
  details: QualityDetail[];
}

export interface QualityDetail {
  category: string;
  score: number;
  passed: boolean;
  issues: string[];
  suggestions: string[];
}

export interface QualityIssue {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  details: Record<string, unknown>;
  autoFixable: boolean;
}

export async function checkStepQuality(stepId: string, projectDir: string): Promise<QualityReport> {
  switch (stepId) {
    case "extract-characters":
      return checkCharacterQuality(projectDir);
    case "script-to-scenes":
      return checkSceneQuality(projectDir);
    case "scenes-to-storyboard":
      return checkStoryboardQuality(projectDir);
    case "shots-to-images":
      return checkImageQuality(projectDir);
    case "shots-to-audio":
      return checkAudioQuality(projectDir);
    case "compose-video":
      return checkVideoQuality(projectDir);
    default:
      return {
        stepId,
        score: 10,
        passed: true,
        issues: [],
        suggestions: [],
        autoFixable: false,
        details: [],
      };
  }
}

function checkCharacterQuality(projectDir: string): QualityReport {
  const charactersDir = join(projectDir, "characters");
  const details: QualityDetail[] = [];
  const allIssues: string[] = [];
  const allSuggestions: string[] = [];

  if (!existsSync(charactersDir)) {
    return {
      stepId: "extract-characters",
      score: 0,
      passed: false,
      issues: ["角色目录不存在"],
      suggestions: ["请先执行角色提取步骤"],
      autoFixable: false,
      details: [],
    };
  }

  const files = readdirSync(charactersDir).filter((f) => f.endsWith(".yaml") || f.endsWith(".md"));
  const characterCount = files.length;

  if (characterCount === 0) {
    return {
      stepId: "extract-characters",
      score: 0,
      passed: false,
      issues: ["未找到任何角色文件"],
      suggestions: ["请检查角色提取步骤是否正常执行"],
      autoFixable: false,
      details: [],
    };
  }

  let validCharacters = 0;
  let hasImages = 0;
  let hasDescriptions = 0;

  for (const file of files) {
    const filePath = join(charactersDir, file);
    try {
      const content = readFileSync(filePath, "utf-8");
      if (file.endsWith(".yaml")) {
        const data = YAML.parse(content);
        if (data && (data.name || data.id)) {
          validCharacters++;
          if (data.image || data.portrait) hasImages++;
          if (data.description || data.appearance) hasDescriptions++;
        }
      } else {
        if (content.trim().length > 10) {
          validCharacters++;
          hasDescriptions++;
        }
      }
    } catch (err) {
      allIssues.push(`角色文件 ${file} 解析失败: ${(err as Error).message}`);
    }
  }

  const completenessScore = (validCharacters / characterCount) * 10;
  const imageScore = (hasImages / characterCount) * 10;
  const descriptionScore = (hasDescriptions / characterCount) * 10;

  details.push({
    category: "角色完整性",
    score: Math.round(completenessScore * 10) / 10,
    passed: completenessScore >= 8,
    issues: completenessScore < 8 ? [`${characterCount - validCharacters} 个角色文件无效`] : [],
    suggestions: completenessScore < 8 ? ["检查角色文件格式是否正确"] : [],
  });

  details.push({
    category: "角色图片",
    score: Math.round(imageScore * 10) / 10,
    passed: imageScore >= 7,
    issues: imageScore < 7 ? [`${characterCount - hasImages} 个角色缺少图片`] : [],
    suggestions: imageScore < 7 ? ["为缺少图片的角色生成图片"] : [],
  });

  details.push({
    category: "角色描述",
    score: Math.round(descriptionScore * 10) / 10,
    passed: descriptionScore >= 7,
    issues: descriptionScore < 7 ? [`${characterCount - hasDescriptions} 个角色缺少描述`] : [],
    suggestions: descriptionScore < 7 ? ["补充角色描述信息"] : [],
  });

  if (completenessScore < 8) allIssues.push("部分角色文件格式不正确");
  if (imageScore < 7) allIssues.push("部分角色缺少图片");
  if (descriptionScore < 7) allIssues.push("部分角色缺少描述");

  if (imageScore < 7) allSuggestions.push("自动生成缺失的角色图片");
  if (descriptionScore < 7) allSuggestions.push("自动补充角色描述");

  const avgScore = (completenessScore + imageScore + descriptionScore) / 3;
  const passed = avgScore >= 7 && completenessScore >= 8;

  return {
    stepId: "extract-characters",
    score: Math.round(avgScore * 10) / 10,
    passed,
    issues: allIssues,
    suggestions: allSuggestions,
    autoFixable: imageScore < 7 || descriptionScore < 7,
    details,
  };
}

function checkSceneQuality(projectDir: string): QualityReport {
  const scenesDir = join(projectDir, "scenes");
  const details: QualityDetail[] = [];
  const allIssues: string[] = [];
  const allSuggestions: string[] = [];

  if (!existsSync(scenesDir)) {
    return {
      stepId: "script-to-scenes",
      score: 0,
      passed: false,
      issues: ["场景目录不存在"],
      suggestions: ["请先执行剧本转场景步骤"],
      autoFixable: false,
      details: [],
    };
  }

  const files = readdirSync(scenesDir).filter((f) => f.endsWith(".md"));
  const sceneCount = files.length;

  if (sceneCount === 0) {
    return {
      stepId: "script-to-scenes",
      score: 0,
      passed: false,
      issues: ["未找到任何场景文件"],
      suggestions: ["请检查场景切分步骤是否正常执行"],
      autoFixable: false,
      details: [],
    };
  }

  let validScenes = 0;
  let hasDialogue = 0;
  let hasSceneMarkers = 0;

  for (const file of files) {
    const filePath = join(scenesDir, file);
    try {
      const content = readFileSync(filePath, "utf-8");
      if (content.trim().length > 20) {
        validScenes++;
        if (/["""]|道|曰|说/.test(content)) hasDialogue++;
        if (/场景|地点|时间|来到|进入/.test(content)) hasSceneMarkers++;
      }
    } catch (err) {
      allIssues.push(`场景文件 ${file} 读取失败: ${(err as Error).message}`);
    }
  }

  const validityScore = (validScenes / sceneCount) * 10;
  const dialogueScore = (hasDialogue / sceneCount) * 10;
  const markerScore = (hasSceneMarkers / sceneCount) * 10;

  details.push({
    category: "场景有效性",
    score: Math.round(validityScore * 10) / 10,
    passed: validityScore >= 8,
    issues: validityScore < 8 ? [`${sceneCount - validScenes} 个场景文件无效`] : [],
    suggestions: validityScore < 8 ? ["检查场景文件内容是否完整"] : [],
  });

  details.push({
    category: "对话识别",
    score: Math.round(dialogueScore * 10) / 10,
    passed: dialogueScore >= 7,
    issues: dialogueScore < 7 ? [`${sceneCount - hasDialogue} 个场景缺少对话`] : [],
    suggestions: dialogueScore < 7 ? ["检查对话识别是否准确"] : [],
  });

  details.push({
    category: "场景标记",
    score: Math.round(markerScore * 10) / 10,
    passed: markerScore >= 6,
    issues: markerScore < 6 ? [`${sceneCount - hasSceneMarkers} 个场景缺少标记`] : [],
    suggestions: markerScore < 6 ? ["补充场景标记信息"] : [],
  });

  if (validityScore < 8) allIssues.push("部分场景文件无效");
  if (dialogueScore < 7) allIssues.push("部分场景对话识别不准确");
  if (markerScore < 6) allIssues.push("部分场景缺少标记");

  const avgScore = (validityScore + dialogueScore + markerScore) / 3;
  const passed = avgScore >= 7 && validityScore >= 8;

  return {
    stepId: "script-to-scenes",
    score: Math.round(avgScore * 10) / 10,
    passed,
    issues: allIssues,
    suggestions: allSuggestions,
    autoFixable: false,
    details,
  };
}

function checkStoryboardQuality(projectDir: string): QualityReport {
  const shotsDir = join(projectDir, "shots");
  const details: QualityDetail[] = [];
  const allIssues: string[] = [];
  const allSuggestions: string[] = [];

  if (!existsSync(shotsDir)) {
    return {
      stepId: "scenes-to-storyboard",
      score: 0,
      passed: false,
      issues: ["分镜目录不存在"],
      suggestions: ["请先执行场景转分镜步骤"],
      autoFixable: false,
      details: [],
    };
  }

  const files = readdirSync(shotsDir).filter((f) => f.endsWith(".yaml"));
  const shotCount = files.length;

  if (shotCount === 0) {
    return {
      stepId: "scenes-to-storyboard",
      score: 0,
      passed: false,
      issues: ["未找到任何分镜文件"],
      suggestions: ["请检查分镜生成步骤是否正常执行"],
      autoFixable: false,
      details: [],
    };
  }

  let validShots = 0;
  let properDuration = 0;
  let hasPrompts = 0;
  let longShots: string[] = [];

  for (const file of files) {
    const filePath = join(shotsDir, file);
    try {
      const content = readFileSync(filePath, "utf-8");
      const data = YAML.parse(content);
      if (data && data.duration) {
        validShots++;
        const duration = parseFloat(data.duration);
        if (duration >= 3 && duration <= 7) {
          properDuration++;
        } else if (duration > 7) {
          longShots.push(file);
        }
        if (data.prompt || data.image_prompt) hasPrompts++;
      }
    } catch (err) {
      allIssues.push(`分镜文件 ${file} 解析失败: ${(err as Error).message}`);
    }
  }

  const validityScore = (validShots / shotCount) * 10;
  const durationScore = (properDuration / shotCount) * 10;
  const promptScore = (hasPrompts / shotCount) * 10;

  details.push({
    category: "分镜有效性",
    score: Math.round(validityScore * 10) / 10,
    passed: validityScore >= 8,
    issues: validityScore < 8 ? [`${shotCount - validShots} 个分镜文件无效`] : [],
    suggestions: validityScore < 8 ? ["检查分镜文件格式是否正确"] : [],
  });

  details.push({
    category: "分镜时长",
    score: Math.round(durationScore * 10) / 10,
    passed: durationScore >= 8,
    issues: longShots.length > 0 ? [`${longShots.length} 个分镜时长超过7秒`] : [],
    suggestions: longShots.length > 0 ? ["自动拆分超长分镜"] : [],
  });

  details.push({
    category: "提示词完整性",
    score: Math.round(promptScore * 10) / 10,
    passed: promptScore >= 8,
    issues: promptScore < 8 ? [`${shotCount - hasPrompts} 个分镜缺少提示词`] : [],
    suggestions: promptScore < 8 ? ["补充分镜提示词"] : [],
  });

  if (validityScore < 8) allIssues.push("部分分镜文件无效");
  if (longShots.length > 0) {
    allIssues.push(`${longShots.length} 个分镜时长超过7秒`);
    allSuggestions.push("自动拆分超长分镜");
  }
  if (promptScore < 8) allIssues.push("部分分镜缺少提示词");

  const avgScore = (validityScore + durationScore + promptScore) / 3;
  const passed = avgScore >= 7 && validityScore >= 8;

  return {
    stepId: "scenes-to-storyboard",
    score: Math.round(avgScore * 10) / 10,
    passed,
    issues: allIssues,
    suggestions: allSuggestions,
    autoFixable: longShots.length > 0,
    details,
  };
}

function checkImageQuality(projectDir: string): QualityReport {
  const imagesDir = join(projectDir, "output", "images");
  const details: QualityDetail[] = [];
  const allIssues: string[] = [];
  const allSuggestions: string[] = [];

  if (!existsSync(imagesDir)) {
    return {
      stepId: "shots-to-images",
      score: 0,
      passed: false,
      issues: ["图片目录不存在"],
      suggestions: ["请先执行分镜出图步骤"],
      autoFixable: false,
      details: [],
    };
  }

  const files = readdirSync(imagesDir).filter((f) => f.endsWith(".png") || f.endsWith(".jpg"));
  const imageCount = files.length;

  if (imageCount === 0) {
    return {
      stepId: "shots-to-images",
      score: 0,
      passed: false,
      issues: ["未找到任何图片文件"],
      suggestions: ["请检查图片生成步骤是否正常执行"],
      autoFixable: false,
      details: [],
    };
  }

  let validImages = 0;
  let largeImages = 0;

  for (const file of files) {
    const filePath = join(imagesDir, file);
    try {
      const stats = statSync(filePath);
      if (stats.size > 1000) {
        validImages++;
        if (stats.size > 100000) largeImages++;
      }
    } catch (err) {
      allIssues.push(`图片文件 ${file} 读取失败: ${(err as Error).message}`);
    }
  }

  const validityScore = (validImages / imageCount) * 10;
  const sizeScore = (largeImages / imageCount) * 10;

  details.push({
    category: "图片有效性",
    score: Math.round(validityScore * 10) / 10,
    passed: validityScore >= 8,
    issues: validityScore < 8 ? [`${imageCount - validImages} 张图片无效`] : [],
    suggestions: validityScore < 8 ? ["检查图片文件是否损坏"] : [],
  });

  details.push({
    category: "图片质量",
    score: Math.round(sizeScore * 10) / 10,
    passed: sizeScore >= 7,
    issues: sizeScore < 7 ? [`${imageCount - largeImages} 张图片文件过小`] : [],
    suggestions: sizeScore < 7 ? ["重新生成低质量图片"] : [],
  });

  if (validityScore < 8) allIssues.push("部分图片文件无效");
  if (sizeScore < 7) {
    allIssues.push("部分图片质量不佳");
    allSuggestions.push("自动重新生成低质量图片");
  }

  const avgScore = (validityScore + sizeScore) / 2;
  const passed = avgScore >= 7 && validityScore >= 8;

  return {
    stepId: "shots-to-images",
    score: Math.round(avgScore * 10) / 10,
    passed,
    issues: allIssues,
    suggestions: allSuggestions,
    autoFixable: sizeScore < 7,
    details,
  };
}

function checkAudioQuality(projectDir: string): QualityReport {
  const audioDir = join(projectDir, "output", "audio");
  const details: QualityDetail[] = [];
  const allIssues: string[] = [];
  const allSuggestions: string[] = [];

  if (!existsSync(audioDir)) {
    return {
      stepId: "shots-to-audio",
      score: 0,
      passed: false,
      issues: ["音频目录不存在"],
      suggestions: ["请先执行分镜配音步骤"],
      autoFixable: false,
      details: [],
    };
  }

  const files = readdirSync(audioDir).filter((f) => f.endsWith(".mp3") || f.endsWith(".wav"));
  const audioCount = files.length;

  if (audioCount === 0) {
    return {
      stepId: "shots-to-audio",
      score: 0,
      passed: false,
      issues: ["未找到任何音频文件"],
      suggestions: ["请检查音频生成步骤是否正常执行"],
      autoFixable: false,
      details: [],
    };
  }

  let validAudio = 0;
  let largeAudio = 0;

  for (const file of files) {
    const filePath = join(audioDir, file);
    try {
      const stats = statSync(filePath);
      if (stats.size > 1000) {
        validAudio++;
        if (stats.size > 10000) largeAudio++;
      }
    } catch (err) {
      allIssues.push(`音频文件 ${file} 读取失败: ${(err as Error).message}`);
    }
  }

  const validityScore = (validAudio / audioCount) * 10;
  const sizeScore = (largeAudio / audioCount) * 10;

  details.push({
    category: "音频有效性",
    score: Math.round(validityScore * 10) / 10,
    passed: validityScore >= 8,
    issues: validityScore < 8 ? [`${audioCount - validAudio} 个音频文件无效`] : [],
    suggestions: validityScore < 8 ? ["检查音频文件是否损坏"] : [],
  });

  details.push({
    category: "音频质量",
    score: Math.round(sizeScore * 10) / 10,
    passed: sizeScore >= 7,
    issues: sizeScore < 7 ? [`${audioCount - largeAudio} 个音频文件过小`] : [],
    suggestions: sizeScore < 7 ? ["重新生成低质量音频"] : [],
  });

  if (validityScore < 8) allIssues.push("部分音频文件无效");
  if (sizeScore < 7) {
    allIssues.push("部分音频质量不佳");
    allSuggestions.push("自动重新生成低质量音频");
  }

  const avgScore = (validityScore + sizeScore) / 2;
  const passed = avgScore >= 7 && validityScore >= 8;

  return {
    stepId: "shots-to-audio",
    score: Math.round(avgScore * 10) / 10,
    passed,
    issues: allIssues,
    suggestions: allSuggestions,
    autoFixable: sizeScore < 7,
    details,
  };
}

function checkVideoQuality(projectDir: string): QualityReport {
  const videoDir = join(projectDir, "output", "videos");
  const details: QualityDetail[] = [];
  const allIssues: string[] = [];
  const allSuggestions: string[] = [];

  if (!existsSync(videoDir)) {
    return {
      stepId: "compose-video",
      score: 0,
      passed: false,
      issues: ["视频目录不存在"],
      suggestions: ["请先执行视频合成步骤"],
      autoFixable: false,
      details: [],
    };
  }

  const files = readdirSync(videoDir).filter((f) => f.endsWith(".mp4"));
  const videoCount = files.length;

  if (videoCount === 0) {
    return {
      stepId: "compose-video",
      score: 0,
      passed: false,
      issues: ["未找到任何视频文件"],
      suggestions: ["请检查视频合成步骤是否正常执行"],
      autoFixable: false,
      details: [],
    };
  }

  let validVideos = 0;
  let largeVideos = 0;

  for (const file of files) {
    const filePath = join(videoDir, file);
    try {
      const stats = statSync(filePath);
      if (stats.size > 10000) {
        validVideos++;
        if (stats.size > 1000000) largeVideos++;
      }
    } catch (err) {
      allIssues.push(`视频文件 ${file} 读取失败: ${(err as Error).message}`);
    }
  }

  const validityScore = (validVideos / videoCount) * 10;
  const sizeScore = (largeVideos / videoCount) * 10;

  details.push({
    category: "视频有效性",
    score: Math.round(validityScore * 10) / 10,
    passed: validityScore >= 8,
    issues: validityScore < 8 ? [`${videoCount - validVideos} 个视频文件无效`] : [],
    suggestions: validityScore < 8 ? ["检查视频文件是否损坏"] : [],
  });

  details.push({
    category: "视频质量",
    score: Math.round(sizeScore * 10) / 10,
    passed: sizeScore >= 7,
    issues: sizeScore < 7 ? [`${videoCount - largeVideos} 个视频文件过小`] : [],
    suggestions: sizeScore < 7 ? ["检查视频合成参数"] : [],
  });

  if (validityScore < 8) allIssues.push("部分视频文件无效");
  if (sizeScore < 7) allIssues.push("部分视频质量不佳");

  const avgScore = (validityScore + sizeScore) / 2;
  const passed = avgScore >= 7 && validityScore >= 8;

  return {
    stepId: "compose-video",
    score: Math.round(avgScore * 10) / 10,
    passed,
    issues: allIssues,
    suggestions: allSuggestions,
    autoFixable: false,
    details,
  };
}
