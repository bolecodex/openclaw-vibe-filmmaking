import type { NovelAnalysis } from "./novel-analyzer.js";

export interface PipelineConfig {
  steps: PipelineStep[];
  estimatedTime: number;
  estimatedCost: number;
  parallelizable: boolean;
  batchSizes: {
    characters: number;
    scenes: number;
    shots: number;
    images: number;
    audio: number;
  };
}

export interface PipelineStep {
  id: string;
  name: string;
  skill: string | null;
  order: number;
  requires: string[];
  optional: boolean;
  parallelWith?: string[];
  batchSize?: number;
  estimatedTime: number;
  estimatedCost: number;
}

export interface TimeCostEstimate {
  totalTime: number;
  totalCost: number;
  breakdown: Array<{
    step: string;
    time: number;
    cost: number;
  }>;
}

export function selectOptimalPipeline(analysis: NovelAnalysis): PipelineConfig {
  const steps: PipelineStep[] = [];
  let order = 1;

  const isLongNovel = analysis.totalLines > 500 || analysis.chapters > 1;
  const hasScript = analysis.hasDialogueMarkers && analysis.dialogueDensity > 5;

  if (!hasScript) {
    if (isLongNovel) {
      steps.push({
        id: "long-novel-to-script",
        name: "长篇小说→剧本",
        skill: "novel-00-long-novel-to-script",
        order: order++,
        requires: ["input-novel"],
        optional: false,
        estimatedTime: estimateLongNovelTime(analysis),
        estimatedCost: estimateLongNovelCost(analysis),
      });
    } else {
      steps.push({
        id: "novel-to-script",
        name: "改写剧本(短篇)",
        skill: "novel-to-script",
        order: order++,
        requires: ["input-novel"],
        optional: false,
        estimatedTime: estimateNovelToScriptTime(analysis),
        estimatedCost: estimateNovelToScriptCost(analysis),
      });
    }
  }

  steps.push({
    id: "extract-characters",
    name: "提取角色",
    skill: "novel-01-character-extractor",
    order: order++,
    requires: hasScript ? ["input-novel"] : [isLongNovel ? "long-novel-to-script" : "novel-to-script"],
    optional: false,
    batchSize: analysis.characterCount > 50 ? 10 : undefined,
    estimatedTime: estimateCharacterExtractionTime(analysis),
    estimatedCost: estimateCharacterExtractionCost(analysis),
  });

  steps.push({
    id: "script-to-scenes",
    name: "剧本转场景",
    skill: analysis.style === "classical" ? "novel-02-script-to-scenes-classical" : "novel-02-script-to-scenes",
    order: order++,
    requires: hasScript ? ["input-novel"] : [isLongNovel ? "long-novel-to-script" : "novel-to-script"],
    optional: false,
    batchSize: analysis.estimatedScenes > 100 ? 20 : undefined,
    estimatedTime: estimateSceneExtractionTime(analysis),
    estimatedCost: estimateSceneExtractionCost(analysis),
  });

  steps.push({
    id: "scenes-to-storyboard",
    name: "场景转分镜",
    skill: "novel-03-scenes-to-storyboard",
    order: order++,
    requires: ["extract-characters", "script-to-scenes"],
    optional: false,
    estimatedTime: estimateStoryboardTime(analysis),
    estimatedCost: estimateStoryboardCost(analysis),
  });

  const estimatedShots = analysis.estimatedScenes * 2;

  steps.push({
    id: "shots-to-images",
    name: "分镜出图",
    skill: "novel-04-shots-to-images",
    order: order++,
    requires: ["scenes-to-storyboard"],
    optional: false,
    parallelWith: ["shots-to-audio"],
    batchSize: estimatedShots > 100 ? 20 : 10,
    estimatedTime: estimateImageGenerationTime(estimatedShots),
    estimatedCost: estimateImageGenerationCost(estimatedShots),
  });

  steps.push({
    id: "shots-to-audio",
    name: "分镜配音",
    skill: "novel-05-shots-to-audio",
    order: order++,
    requires: ["scenes-to-storyboard"],
    optional: false,
    parallelWith: ["shots-to-images"],
    batchSize: estimatedShots > 100 ? 30 : 20,
    estimatedTime: estimateAudioGenerationTime(estimatedShots),
    estimatedCost: estimateAudioGenerationCost(estimatedShots),
  });

  steps.push({
    id: "compose-video",
    name: "合成视频",
    skill: "novel-07-shots-to-video",
    order: order++,
    requires: ["shots-to-images", "shots-to-audio"],
    optional: false,
    estimatedTime: estimateVideoCompositionTime(estimatedShots),
    estimatedCost: estimateVideoCompositionCost(estimatedShots),
  });

  const totalTime = steps.reduce((sum, s) => sum + s.estimatedTime, 0);
  const totalCost = steps.reduce((sum, s) => sum + s.estimatedCost, 0);
  const parallelizable = steps.some((s) => s.parallelWith && s.parallelWith.length > 0);

  const batchSizes = {
    characters: analysis.characterCount > 50 ? 10 : 5,
    scenes: analysis.estimatedScenes > 100 ? 20 : 10,
    shots: estimatedShots > 100 ? 20 : 10,
    images: estimatedShots > 100 ? 20 : 10,
    audio: estimatedShots > 100 ? 30 : 20,
  };

  return {
    steps,
    estimatedTime: totalTime,
    estimatedCost: totalCost,
    parallelizable,
    batchSizes,
  };
}

export function estimateTimeAndCost(pipeline: PipelineConfig): TimeCostEstimate {
  const breakdown = pipeline.steps.map((step) => ({
    step: step.name,
    time: step.estimatedTime,
    cost: step.estimatedCost,
  }));

  return {
    totalTime: pipeline.estimatedTime,
    totalCost: pipeline.estimatedCost,
    breakdown,
  };
}

function estimateLongNovelTime(analysis: NovelAnalysis): number {
  const baseTime = 10;
  const chunkTime = Math.ceil(analysis.totalLines / 500) * 3;
  return baseTime + chunkTime;
}

function estimateLongNovelCost(analysis: NovelAnalysis): number {
  const chunks = Math.ceil(analysis.totalLines / 500);
  return chunks * 2.0;
}

function estimateNovelToScriptTime(analysis: NovelAnalysis): number {
  return 5 + Math.ceil(analysis.totalLines / 50) * 1;
}

function estimateNovelToScriptCost(analysis: NovelAnalysis): number {
  return 1.0 + (analysis.totalChars / 1000) * 0.001;
}

function estimateCharacterExtractionTime(analysis: NovelAnalysis): number {
  const baseTime = 3;
  const generationTime = Math.ceil(analysis.characterCount / 5) * 2;
  return baseTime + generationTime;
}

function estimateCharacterExtractionCost(analysis: NovelAnalysis): number {
  const textCost = 0.5;
  const imageCost = analysis.characterCount * 0.22;
  return textCost + imageCost;
}

function estimateSceneExtractionTime(analysis: NovelAnalysis): number {
  return 3 + Math.ceil(analysis.estimatedScenes / 10) * 1;
}

function estimateSceneExtractionCost(analysis: NovelAnalysis): number {
  return 1.0 + (analysis.estimatedScenes / 10) * 0.1;
}

function estimateStoryboardTime(analysis: NovelAnalysis): number {
  return 5 + Math.ceil(analysis.estimatedScenes / 5) * 1;
}

function estimateStoryboardCost(analysis: NovelAnalysis): number {
  return 1.0 + (analysis.estimatedScenes / 5) * 0.1;
}

function estimateImageGenerationTime(shotCount: number): number {
  const baseTime = 5;
  const batchTime = Math.ceil(shotCount / 20) * 1;
  return baseTime + batchTime;
}

function estimateImageGenerationCost(shotCount: number): number {
  return shotCount * 0.22;
}

function estimateAudioGenerationTime(shotCount: number): number {
  const baseTime = 3;
  const batchTime = Math.ceil(shotCount / 30) * 1;
  return baseTime + batchTime;
}

function estimateAudioGenerationCost(shotCount: number): number {
  return shotCount * 0.01;
}

function estimateVideoCompositionTime(shotCount: number): number {
  return 5 + Math.ceil(shotCount / 10) * 0.5;
}

function estimateVideoCompositionCost(shotCount: number): number {
  const avgShotDuration = 5;
  return shotCount * avgShotDuration * 1.0;
}
