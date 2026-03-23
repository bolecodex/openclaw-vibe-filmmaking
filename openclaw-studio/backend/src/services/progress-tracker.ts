import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import type { PipelineConfig, PipelineStep } from "./skill-selector.js";
import { getWorkspaceDir } from "./workspace.js";

export interface ProgressInfo {
  projectName: string;
  currentStep: string | null;
  completedSteps: string[];
  totalSteps: number;
  progress: number;
  estimatedRemainingTime: number;
  elapsedTime: number;
  estimatedTotalCost: number;
  actualCost: number;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
  stepDetails: StepProgress[];
}

export interface StepProgress {
  stepId: string;
  stepName: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  progress: number;
  completedCount?: number;
  totalCount?: number;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  estimatedTime?: number;
  actualTime?: number;
  estimatedCost?: number;
  actualCost?: number;
}

export class ProgressTracker {
  private projectName: string;
  private projectDir: string;
  private pipelineConfig: PipelineConfig;
  private startTime: Date;
  private stepStartTimes: Map<string, Date> = new Map();
  private stepTokenUsage: Map<string, { input: number; output: number }> = new Map();

  constructor(projectName: string, pipelineConfig: PipelineConfig) {
    this.projectName = projectName;
    this.projectDir = join(getWorkspaceDir(), projectName);
    this.pipelineConfig = pipelineConfig;
    this.startTime = new Date();
  }

  startStep(stepId: string): void {
    this.stepStartTimes.set(stepId, new Date());
  }

  completeStep(stepId: string, tokenUsage?: { input: number; output: number }): void {
    if (tokenUsage) {
      this.stepTokenUsage.set(stepId, tokenUsage);
    }
  }

  getProgress(): ProgressInfo {
    const stepDetails = this.pipelineConfig.steps.map((step) => this.getStepProgress(step));
    const completedSteps = stepDetails.filter((s) => s.status === "completed").map((s) => s.stepId);
    const currentStep = stepDetails.find((s) => s.status === "running")?.stepId || null;
    const totalSteps = this.pipelineConfig.steps.length;
    const progress = totalSteps > 0 ? (completedSteps.length / totalSteps) * 100 : 0;

    const elapsedTime = (Date.now() - this.startTime.getTime()) / 1000 / 60;
    const completedTime = stepDetails
      .filter((s) => s.status === "completed" && s.actualTime)
      .reduce((sum, s) => sum + (s.actualTime || 0), 0);
    const remainingSteps = stepDetails.filter((s) => s.status === "pending" || s.status === "running");
    const estimatedRemainingTime = remainingSteps.reduce((sum, s) => sum + (s.estimatedTime || 0), 0);

    const actualCost = stepDetails
      .filter((s) => s.status === "completed" && s.actualCost)
      .reduce((sum, s) => sum + (s.actualCost || 0), 0);

    const totalTokenUsage = Array.from(this.stepTokenUsage.values()).reduce(
      (acc, usage) => ({
        input: acc.input + usage.input,
        output: acc.output + usage.output,
        total: acc.total + usage.input + usage.output,
      }),
      { input: 0, output: 0, total: 0 },
    );

    return {
      projectName: this.projectName,
      currentStep,
      completedSteps,
      totalSteps,
      progress: Math.round(progress * 100) / 100,
      estimatedRemainingTime: Math.round(estimatedRemainingTime * 100) / 100,
      elapsedTime: Math.round(elapsedTime * 100) / 100,
      estimatedTotalCost: this.pipelineConfig.estimatedCost,
      actualCost: Math.round(actualCost * 100) / 100,
      tokenUsage: totalTokenUsage,
      stepDetails,
    };
  }

  private getStepProgress(step: PipelineStep): StepProgress {
    const status = this.detectStepStatus(step.id);
    const progress = this.calculateStepProgress(step.id, status);
    const stepStartTime = this.stepStartTimes.get(step.id);
    const tokenUsage = this.stepTokenUsage.get(step.id);

    let actualTime: number | undefined;
    let actualCost: number | undefined;

    if (status === "completed" && stepStartTime) {
      const completedAt = this.getStepCompletedTime(step.id);
      if (completedAt) {
        actualTime = (new Date(completedAt).getTime() - stepStartTime.getTime()) / 1000 / 60;
        actualCost = this.estimateStepCost(step.id, tokenUsage);
      }
    }

    return {
      stepId: step.id,
      stepName: step.name,
      status,
      progress,
      ...this.getStepCounts(step.id),
      startedAt: stepStartTime?.toISOString(),
      completedAt: status === "completed" ? this.getStepCompletedTime(step.id) : undefined,
      estimatedTime: step.estimatedTime,
      actualTime,
      estimatedCost: step.estimatedCost,
      actualCost,
    };
  }

  private detectStepStatus(stepId: string): StepProgress["status"] {
    if (this.stepStartTimes.has(stepId)) {
      const completedAt = this.getStepCompletedTime(stepId);
      if (completedAt) return "completed";
      return "running";
    }
    const hasOutput = this.hasStepOutput(stepId);
    if (hasOutput) return "completed";
    return "pending";
  }

  private hasStepOutput(stepId: string): boolean {
    const projectDir = this.projectDir;

    switch (stepId) {
      case "long-novel-to-script":
      case "novel-to-script": {
        const scriptPath = join(projectDir, "script.md");
        return existsSync(scriptPath);
      }
      case "extract-characters": {
        const charactersDir = join(projectDir, "characters");
        if (!existsSync(charactersDir)) return false;
        const files = readdirSync(charactersDir);
        return files.some((f) => f.endsWith(".yaml") || f.endsWith(".md"));
      }
      case "script-to-scenes": {
        const scenesDir = join(projectDir, "scenes");
        if (!existsSync(scenesDir)) return false;
        const files = readdirSync(scenesDir);
        return files.some((f) => f.endsWith(".md"));
      }
      case "scenes-to-storyboard": {
        const shotsDir = join(projectDir, "shots");
        if (!existsSync(shotsDir)) return false;
        const files = readdirSync(shotsDir);
        return files.some((f) => f.endsWith(".yaml"));
      }
      case "shots-to-images": {
        const imagesDir = join(projectDir, "output", "images");
        if (!existsSync(imagesDir)) return false;
        const files = readdirSync(imagesDir);
        return files.some((f) => f.endsWith(".png") || f.endsWith(".jpg"));
      }
      case "shots-to-audio": {
        const audioDir = join(projectDir, "output", "audio");
        if (!existsSync(audioDir)) return false;
        const files = readdirSync(audioDir);
        return files.some((f) => f.endsWith(".mp3") || f.endsWith(".wav"));
      }
      case "compose-video": {
        const videoDir = join(projectDir, "output", "videos");
        if (!existsSync(videoDir)) return false;
        const files = readdirSync(videoDir);
        return files.some((f) => f.endsWith(".mp4"));
      }
      default:
        return false;
    }
  }

  private calculateStepProgress(stepId: string, status: StepProgress["status"]): number {
    if (status === "completed") return 100;
    if (status === "pending") return 0;
    if (status === "failed" || status === "skipped") return 0;

    const counts = this.getStepCounts(stepId);
    if (counts.totalCount && counts.totalCount > 0) {
      return Math.round(((counts.completedCount || 0) / counts.totalCount) * 100);
    }
    return 50;
  }

  private getStepCounts(stepId: string): { completedCount?: number; totalCount?: number } {
    const projectDir = this.projectDir;

    switch (stepId) {
      case "extract-characters": {
        const charactersDir = join(projectDir, "characters");
        if (!existsSync(charactersDir)) return {};
        const files = readdirSync(charactersDir).filter((f) => f.endsWith(".yaml") || f.endsWith(".md"));
        return { completedCount: files.length, totalCount: undefined };
      }
      case "script-to-scenes": {
        const scenesDir = join(projectDir, "scenes");
        if (!existsSync(scenesDir)) return {};
        const files = readdirSync(scenesDir).filter((f) => f.endsWith(".md"));
        return { completedCount: files.length, totalCount: undefined };
      }
      case "scenes-to-storyboard": {
        const shotsDir = join(projectDir, "shots");
        if (!existsSync(shotsDir)) return {};
        const files = readdirSync(shotsDir).filter((f) => f.endsWith(".yaml"));
        return { completedCount: files.length, totalCount: undefined };
      }
      case "shots-to-images": {
        const imagesDir = join(projectDir, "output", "images");
        if (!existsSync(imagesDir)) return {};
        const files = readdirSync(imagesDir).filter((f) => f.endsWith(".png") || f.endsWith(".jpg"));
        return { completedCount: files.length, totalCount: undefined };
      }
      case "shots-to-audio": {
        const audioDir = join(projectDir, "output", "audio");
        if (!existsSync(audioDir)) return {};
        const files = readdirSync(audioDir).filter((f) => f.endsWith(".mp3") || f.endsWith(".wav"));
        return { completedCount: files.length, totalCount: undefined };
      }
      default:
        return {};
    }
  }

  private getStepCompletedTime(stepId: string): string | undefined {
    const projectDir = this.projectDir;
    let latestMtime: Date | null = null;

    switch (stepId) {
      case "long-novel-to-script":
      case "novel-to-script": {
        const scriptPath = join(projectDir, "script.md");
        if (existsSync(scriptPath)) {
          latestMtime = statSync(scriptPath).mtime;
        }
        break;
      }
      case "extract-characters": {
        const charactersDir = join(projectDir, "characters");
        if (existsSync(charactersDir)) {
          const files = readdirSync(charactersDir);
          for (const file of files) {
            const filePath = join(charactersDir, file);
            const mtime = statSync(filePath).mtime;
            if (!latestMtime || mtime > latestMtime) latestMtime = mtime;
          }
        }
        break;
      }
      case "script-to-scenes": {
        const scenesDir = join(projectDir, "scenes");
        if (existsSync(scenesDir)) {
          const files = readdirSync(scenesDir);
          for (const file of files) {
            const filePath = join(scenesDir, file);
            const mtime = statSync(filePath).mtime;
            if (!latestMtime || mtime > latestMtime) latestMtime = mtime;
          }
        }
        break;
      }
      case "scenes-to-storyboard": {
        const shotsDir = join(projectDir, "shots");
        if (existsSync(shotsDir)) {
          const files = readdirSync(shotsDir);
          for (const file of files) {
            const filePath = join(shotsDir, file);
            const mtime = statSync(filePath).mtime;
            if (!latestMtime || mtime > latestMtime) latestMtime = mtime;
          }
        }
        break;
      }
      case "shots-to-images": {
        const imagesDir = join(projectDir, "output", "images");
        if (existsSync(imagesDir)) {
          const files = readdirSync(imagesDir);
          for (const file of files) {
            const filePath = join(imagesDir, file);
            const mtime = statSync(filePath).mtime;
            if (!latestMtime || mtime > latestMtime) latestMtime = mtime;
          }
        }
        break;
      }
      case "shots-to-audio": {
        const audioDir = join(projectDir, "output", "audio");
        if (existsSync(audioDir)) {
          const files = readdirSync(audioDir);
          for (const file of files) {
            const filePath = join(audioDir, file);
            const mtime = statSync(filePath).mtime;
            if (!latestMtime || mtime > latestMtime) latestMtime = mtime;
          }
        }
        break;
      }
      case "compose-video": {
        const videoDir = join(projectDir, "output", "videos");
        if (existsSync(videoDir)) {
          const files = readdirSync(videoDir);
          for (const file of files) {
            const filePath = join(videoDir, file);
            const mtime = statSync(filePath).mtime;
            if (!latestMtime || mtime > latestMtime) latestMtime = mtime;
          }
        }
        break;
      }
    }

    return latestMtime?.toISOString();
  }

  private estimateStepCost(stepId: string, tokenUsage?: { input: number; output: number }): number {
    if (!tokenUsage) return 0;
    const inputCost = (tokenUsage.input / 1000) * 0.001;
    const outputCost = (tokenUsage.output / 1000) * 0.002;
    return Math.round((inputCost + outputCost) * 100) / 100;
  }

  estimateRemainingTime(progress: ProgressInfo): number {
    if (progress.completedSteps.length === 0) return progress.estimatedRemainingTime;
    const avgTimePerStep = progress.elapsedTime / progress.completedSteps.length;
    const remainingSteps = progress.totalSteps - progress.completedSteps.length;
    return Math.round(avgTimePerStep * remainingSteps * 100) / 100;
  }
}
