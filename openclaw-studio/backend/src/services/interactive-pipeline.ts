import { existsSync, mkdirSync, copyFileSync } from "fs";
import { join } from "path";
import type { PipelineConfig, PipelineStep } from "./skill-selector.js";
import type { QualityReport } from "./quality-checker.js";
import { checkStepQuality } from "./quality-checker.js";
import { autoFix, fixQualityIssues } from "./auto-fixer.js";
import { ProgressTracker, type ProgressInfo } from "./progress-tracker.js";
import { getWorkspaceDir } from "./workspace.js";
import { getGateway } from "./gateway-client.js";
import { buildStepPrompt } from "./prompt-templates.js";
import { getStepDefinition } from "./step-actions.js";

export interface StepResult {
  stepId: string;
  success: boolean;
  quality: QualityReport;
  error?: string;
  tokenUsage?: { input: number; output: number };
}

export interface InteractivePipelineOptions {
  projectName: string;
  novelFilePath: string;
  pipelineConfig: PipelineConfig;
  onProgress?: (message: string, progress?: ProgressInfo) => void;
  onStepStart?: (step: PipelineStep) => void;
  onStepComplete?: (result: StepResult) => void;
  autoFix?: boolean;
}

export class InteractivePipeline {
  private projectName: string;
  private projectDir: string;
  private pipelineConfig: PipelineConfig;
  private progressTracker: ProgressTracker;
  private onProgress?: (message: string, progress?: ProgressInfo) => void;
  private onStepStart?: (step: PipelineStep) => void;
  private onStepComplete?: (result: StepResult) => void;
  private autoFix: boolean;

  constructor(options: InteractivePipelineOptions) {
    this.projectName = options.projectName;
    this.projectDir = join(getWorkspaceDir(), options.projectName);
    this.pipelineConfig = options.pipelineConfig;
    this.progressTracker = new ProgressTracker(options.projectName, options.pipelineConfig);
    this.onProgress = options.onProgress;
    this.onStepStart = options.onStepStart;
    this.onStepComplete = options.onStepComplete;
    this.autoFix = options.autoFix ?? true;

    this.initializeProject(options.novelFilePath);
  }

  private initializeProject(novelFilePath: string): void {
    if (!existsSync(this.projectDir)) {
      mkdirSync(this.projectDir, { recursive: true });
    }

    const novelFileName = novelFilePath.split("/").pop() || "novel.txt";
    const targetNovelPath = join(this.projectDir, novelFileName);
    if (!existsSync(targetNovelPath)) {
      copyFileSync(novelFilePath, targetNovelPath);
    }
  }

  async executeWithFeedback(): Promise<{ success: boolean; results: StepResult[] }> {
    const results: StepResult[] = [];
    const gateway = getGateway();

    if (!gateway.isConnected) {
      throw new Error("Gateway not connected");
    }

    this.sendProgress("开始执行交互式pipeline...");

    for (const step of this.pipelineConfig.steps) {
      const result = await this.executeStepWithFeedback(step);
      results.push(result);

      if (!result.success && !step.optional) {
        this.sendProgress(`步骤 ${step.name} 执行失败，停止pipeline`);
        break;
      }
    }

    const allPassed = results.every((r) => r.success || r.quality.passed);
    this.sendProgress(`Pipeline执行完成，${allPassed ? "所有步骤通过" : "部分步骤失败"}`);

    return {
      success: allPassed,
      results,
    };
  }

  async executeStepWithFeedback(step: PipelineStep): Promise<StepResult> {
    this.progressTracker.startStep(step.id);
    this.onStepStart?.(step);

    this.sendProgress(`[${step.order}/${this.pipelineConfig.steps.length}] 开始执行：${step.name}...`);
    this.sendProgress(`预计耗时：${step.estimatedTime} 分钟，预计费用：${step.estimatedCost.toFixed(2)} 元`);

    if (!step.skill) {
      this.sendProgress(`步骤 ${step.name} 无需执行（无技能）`);
      return {
        stepId: step.id,
        success: true,
        quality: {
          stepId: step.id,
          score: 10,
          passed: true,
          issues: [],
          suggestions: [],
          autoFixable: false,
          details: [],
        },
      };
    }

    try {
      const stepDefinition = getStepDefinition(step.id);
      if (!stepDefinition) {
        throw new Error(`Step definition not found: ${step.id}`);
      }

      const prompt = buildStepPrompt(step.id, {
        projectDir: this.projectDir,
        projectName: this.projectName,
        action: "run",
        params: {},
        selectedIds: [],
      });

      let tokenUsage = { input: 0, output: 0 };
      const stream = gateway.promptStream(prompt, {
        extraSystemPrompt: `[Interactive Pipeline] 执行步骤: ${step.name}`,
      });

      for await (const event of stream) {
        if (event.type === "usage" && event.usage) {
          tokenUsage = {
            input: event.usage.input || 0,
            output: event.usage.output || 0,
          };
        }
        if (event.type === "error") {
          throw new Error(event.error || "Unknown error");
        }
        if (event.type === "done") {
          break;
        }
      }

      this.progressTracker.completeStep(step.id, tokenUsage);

      this.sendProgress(`✓ ${step.name} 执行完成`);

      const quality = await checkStepQuality(step.id, this.projectDir);
      this.sendProgress(`质量评分：${quality.score}/10`);

      if (!quality.passed) {
        this.sendProgress(`⚠ 发现问题：${quality.issues.join(", ")}`);

        if (this.autoFix && quality.autoFixable) {
          this.sendProgress("尝试自动修复...");
          const fixResult = await fixQualityIssues(quality, this.projectDir);
          if (fixResult.success) {
            this.sendProgress(`✓ 已修复：${fixResult.fixedIssues.join(", ")}`);
            const recheckQuality = await checkStepQuality(step.id, this.projectDir);
            if (recheckQuality.passed) {
              quality.score = recheckQuality.score;
              quality.passed = true;
              quality.issues = recheckQuality.issues;
            }
          } else {
            this.sendProgress(`✗ 自动修复失败：${fixResult.message}`);
          }
        }
      }

      const result: StepResult = {
        stepId: step.id,
        success: quality.passed,
        quality,
        tokenUsage,
      };

      this.onStepComplete?.(result);
      return result;
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.sendProgress(`✗ ${step.name} 执行失败：${errorMessage}`);

      const result: StepResult = {
        stepId: step.id,
        success: false,
        quality: {
          stepId: step.id,
          score: 0,
          passed: false,
          issues: [errorMessage],
          suggestions: ["检查步骤配置和依赖"],
          autoFixable: false,
          details: [],
        },
        error: errorMessage,
      };

      this.onStepComplete?.(result);
      return result;
    }
  }

  getProgress(): ProgressInfo {
    return this.progressTracker.getProgress();
  }

  private sendProgress(message: string): void {
    const progress = this.progressTracker.getProgress();
    this.onProgress?.(message, progress);
  }
}

export async function executeWithFeedback(
  projectName: string,
  novelFilePath: string,
  pipelineConfig: PipelineConfig,
  callbacks?: {
    onProgress?: (message: string, progress?: ProgressInfo) => void;
    onStepStart?: (step: PipelineStep) => void;
    onStepComplete?: (result: StepResult) => void;
  },
): Promise<{ success: boolean; results: StepResult[] }> {
  const pipeline = new InteractivePipeline({
    projectName,
    novelFilePath,
    pipelineConfig,
    ...callbacks,
  });

  return await pipeline.executeWithFeedback();
}
