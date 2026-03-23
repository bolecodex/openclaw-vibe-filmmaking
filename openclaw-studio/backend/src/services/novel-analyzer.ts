import { readFileSync, statSync, existsSync } from "fs";
import { join } from "path";

export interface NovelAnalysis {
  totalLines: number;
  totalChars: number;
  chapters: number;
  estimatedScenes: number;
  characterCount: number;
  dialogueDensity: number;
  complexity: "simple" | "medium" | "complex";
  recommendedPipeline: string[];
  estimatedTime: number;
  estimatedCost: number;
  filePath: string;
  fileName: string;
  hasDialogueMarkers: boolean;
  hasChapterMarkers: boolean;
  style: "classical" | "modern" | "mixed";
}

const DIALOGUE_MARKERS = ["道", "曰", "说", "问", "答", "喊", "叫", "骂", "叹"];
const CHAPTER_MARKERS = ["第", "回", "章", "集", "节"];
const CLASSICAL_MARKERS = ["曰", "乃", "之", "其", "者", "也", "矣", "乎", "哉"];

function countCharacters(text: string): number {
  return text.replace(/\s/g, "").length;
}

function countDialogue(text: string): number {
  let dialogueCount = 0;
  for (const marker of DIALOGUE_MARKERS) {
    const regex = new RegExp(`[^"]*["""]|["""][^"]*["""]|[^"]*${marker}[^"]*["""]`, "g");
    const matches = text.match(regex);
    if (matches) dialogueCount += matches.length;
  }
  const quotedMatches = text.match(/["""][^"""]*["""]/g);
  if (quotedMatches) dialogueCount += quotedMatches.length;
  return dialogueCount;
}

function detectChapters(text: string): number {
  let chapterCount = 0;
  const lines = text.split("\n");
  for (const line of lines) {
    if (CHAPTER_MARKERS.some((m) => line.includes(m)) && /第\s*[一二三四五六七八九十\d]+/.test(line)) {
      chapterCount++;
    }
  }
  return chapterCount || 1;
}

function detectStyle(text: string): "classical" | "modern" | "mixed" {
  const classicalCount = CLASSICAL_MARKERS.reduce((sum, m) => {
    const regex = new RegExp(m, "g");
    return sum + (text.match(regex)?.length ?? 0);
  }, 0);
  const totalChars = countCharacters(text);
  const classicalRatio = classicalCount / totalChars;
  if (classicalRatio > 0.05) return "classical";
  if (classicalRatio > 0.02) return "mixed";
  return "modern";
}

function estimateScenes(text: string, lines: number): number {
  const sceneIndicators = [
    /来到|走进|回到|在[^，。]+|来到[^，。]+|进入[^，。]+/g,
    /第二天|那晚|天亮|午后|黄昏|三天后|一年后|晚上|次日/g,
    /第[一二三四五六七八九十\d]+[回集章]/g,
  ];
  let sceneCount = 0;
  for (const pattern of sceneIndicators) {
    const matches = text.match(pattern);
    if (matches) sceneCount += matches.length;
  }
  const estimated = Math.max(Math.ceil(lines / 3), sceneCount || Math.ceil(lines / 5));
  return estimated;
}

function estimateCharacters(text: string): number {
  const namePatterns = [
    /[姓，名][^，。：\s]{1,4}[，。：]/g,
    /[^，。：\s]{2,4}[字|号][^，。：\s]{1,4}/g,
  ];
  const names = new Set<string>();
  for (const pattern of namePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const m of matches) {
        const name = m.replace(/[姓，名字号：，。]/g, "").trim();
        if (name.length >= 2 && name.length <= 4) names.add(name);
      }
    }
  }
  const commonNames = ["刘备", "关羽", "张飞", "曹操", "玄德", "云长", "翼德", "孟德"];
  for (const name of commonNames) {
    if (text.includes(name)) names.add(name);
  }
  return Math.max(names.size, 5);
}

export function analyzeNovel(filePath: string): NovelAnalysis {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim().length > 0);
  const totalLines = lines.length;
  const totalChars = countCharacters(content);
  const dialogueCount = countDialogue(content);
  const dialogueDensity = totalChars > 0 ? dialogueCount / (totalChars / 100) : 0;
  const chapters = detectChapters(content);
  const estimatedScenes = estimateScenes(content, totalLines);
  const characterCount = estimateCharacters(content);
  const style = detectStyle(content);
  const hasDialogueMarkers = DIALOGUE_MARKERS.some((m) => content.includes(m));
  const hasChapterMarkers = CHAPTER_MARKERS.some((m) => content.includes(m));

  let complexity: "simple" | "medium" | "complex";
  if (totalLines < 100 && characterCount < 10 && estimatedScenes < 20) {
    complexity = "simple";
  } else if (totalLines < 1000 && characterCount < 30 && estimatedScenes < 100) {
    complexity = "medium";
  } else {
    complexity = "complex";
  }

  const recommendedPipeline: string[] = [];
  if (totalLines > 500 || chapters > 1) {
    recommendedPipeline.push("long-novel-to-script");
  } else {
    recommendedPipeline.push("novel-to-script");
  }
  recommendedPipeline.push("extract-characters");
  recommendedPipeline.push("script-to-scenes");
  recommendedPipeline.push("scenes-to-storyboard");
  recommendedPipeline.push("shots-to-images");
  recommendedPipeline.push("shots-to-audio");
  recommendedPipeline.push("compose-video");

  const estimatedTime = estimateTime(complexity, characterCount, estimatedScenes);
  const estimatedCost = estimateCost(characterCount, estimatedScenes);

  return {
    totalLines,
    totalChars,
    chapters,
    estimatedScenes,
    characterCount,
    dialogueDensity: Math.round(dialogueDensity * 100) / 100,
    complexity,
    recommendedPipeline,
    estimatedTime,
    estimatedCost,
    filePath,
    fileName: filePath.split("/").pop() || "unknown.txt",
    hasDialogueMarkers,
    hasChapterMarkers,
    style,
  };
}

function estimateTime(
  complexity: "simple" | "medium" | "complex",
  characterCount: number,
  estimatedScenes: number,
): number {
  const baseTime = {
    simple: 30,
    medium: 60,
    complex: 120,
  }[complexity];

  const characterTime = Math.ceil(characterCount / 5) * 2;
  const sceneTime = Math.ceil(estimatedScenes / 10) * 3;
  const imageTime = Math.ceil(estimatedScenes * 2 / 20) * 1;
  const audioTime = Math.ceil(estimatedScenes * 2 / 30) * 1;
  const videoTime = 5;

  return baseTime + characterTime + sceneTime + imageTime + audioTime + videoTime;
}

function estimateCost(characterCount: number, estimatedScenes: number): number {
  const estimatedShots = estimatedScenes * 2;
  const characterImageCost = characterCount * 0.22;
  const shotImageCost = estimatedShots * 0.22;
  const audioCost = estimatedShots * 0.01;
  const videoCost = estimatedShots * 5 * 1.0;
  const textCost = 2.0;

  return Math.round((characterImageCost + shotImageCost + audioCost + videoCost + textCost) * 100) / 100;
}
