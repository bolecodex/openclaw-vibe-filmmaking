import React, { useState, useEffect } from "react";
import { PipelineProgressBar } from "./PipelineProgressBar.js";
import { CurrentStepCard } from "./CurrentStepCard.js";
import { QualityBadge } from "./QualityBadge.js";
import { IssueAlert } from "./IssueAlert.js";
import { api } from "../../lib/api-client.js";

interface NovelAnalysis {
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
  fileName: string;
}

interface PipelineStep {
  id: string;
  name: string;
  skill: string | null;
  order: number;
  estimatedTime: number;
  estimatedCost: number;
}

interface PipelineConfig {
  steps: PipelineStep[];
  estimatedTime: number;
  estimatedCost: number;
}

interface ProgressInfo {
  progress: number;
  currentStep: string | null;
  completedSteps: string[];
  totalSteps: number;
  estimatedRemainingTime: number;
  elapsedTime: number;
  estimatedTotalCost: number;
  actualCost: number;
}

interface StepResult {
  stepId: string;
  success: boolean;
  quality: {
    score: number;
    passed: boolean;
    issues: string[];
    suggestions: string[];
    autoFixable: boolean;
  };
}

interface InteractivePipelinePanelProps {
  novelFilePath: string;
  projectName: string;
  onComplete?: (success: boolean) => void;
}

export function InteractivePipelinePanel({
  novelFilePath,
  projectName,
  onComplete,
}: InteractivePipelinePanelProps) {
  const [analysis, setAnalysis] = useState<NovelAnalysis | null>(null);
  const [pipelineConfig, setPipelineConfig] = useState<PipelineConfig | null>(null);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [currentStep, setCurrentStep] = useState<PipelineStep | null>(null);
  const [stepResults, setStepResults] = useState<Map<string, StepResult>>(new Map());
  const [messages, setMessages] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    analyzeFile();
  }, [novelFilePath]);

  const analyzeFile = async () => {
    setIsAnalyzing(true);
    try {
      const response = await api.interactive.analyze(novelFilePath);
      setAnalysis(response.analysis);
      setPipelineConfig(response.pipeline);
    } catch (err) {
      console.error("Failed to analyze file:", err);
      addMessage(`分析失败: ${(err as Error).message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startPipeline = async () => {
    if (!pipelineConfig) return;

    setIsRunning(true);
    setMessages([]);
    setStepResults(new Map());

    try {
      const eventSource = api.interactive.start(projectName, novelFilePath, pipelineConfig, true);

      eventSource.addEventListener("progress", (e) => {
        const data = JSON.parse(e.data);
        addMessage(data.message);
        if (data.progress) {
          setProgress(data.progress);
        }
      });

      eventSource.addEventListener("step_start", (e) => {
        const data = JSON.parse(e.data);
        const step = pipelineConfig.steps.find((s) => s.id === data.step.id);
        if (step) setCurrentStep(step);
      });

      eventSource.addEventListener("step_complete", (e) => {
        const data = JSON.parse(e.data);
        const result: StepResult = data.result;
        setStepResults((prev) => new Map(prev).set(result.stepId, result));
        if (result.quality && !result.quality.passed) {
          addMessage(`⚠ 步骤 ${result.stepId} 质量检查未通过: ${result.quality.issues.join(", ")}`);
        }
      });

      eventSource.addEventListener("done", (e) => {
        const data = JSON.parse(e.data);
        eventSource.close();
        setIsRunning(false);
        addMessage("Pipeline执行完成");
        onComplete?.(data.success);
      });

      eventSource.addEventListener("error", (e) => {
        const data = JSON.parse(e.data);
        addMessage(`错误: ${data.error}`);
        eventSource.close();
        setIsRunning(false);
        onComplete?.(false);
      });
    } catch (err) {
      console.error("Failed to start pipeline:", err);
      addMessage(`启动失败: ${(err as Error).message}`);
      setIsRunning(false);
    }
  };

  const addMessage = (message: string) => {
    setMessages((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleFix = async (stepId: string) => {
    try {
      await api.interactive.fix(projectName, stepId);
      addMessage(`已尝试修复步骤 ${stepId}`);
    } catch (err) {
      addMessage(`修复失败: ${(err as Error).message}`);
    }
  };

  if (isAnalyzing) {
    return (
      <div className="p-6">
        <div className="text-center">正在分析文件...</div>
      </div>
    );
  }

  if (!analysis || !pipelineConfig) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">请先分析文件</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">文件分析结果</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">文件:</span> {analysis.fileName}
          </div>
          <div>
            <span className="font-medium">总行数:</span> {analysis.totalLines}
          </div>
          <div>
            <span className="font-medium">总字符数:</span> {analysis.totalChars}
          </div>
          <div>
            <span className="font-medium">章节数:</span> {analysis.chapters}
          </div>
          <div>
            <span className="font-medium">预估场景数:</span> {analysis.estimatedScenes}
          </div>
          <div>
            <span className="font-medium">角色数:</span> {analysis.characterCount}
          </div>
          <div>
            <span className="font-medium">复杂度:</span> {analysis.complexity}
          </div>
          <div>
            <span className="font-medium">对话密度:</span> {analysis.dialogueDensity.toFixed(2)}%
          </div>
        </div>
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between items-center">
            <div>
              <span className="font-medium">预计总耗时:</span> {pipelineConfig.estimatedTime} 分钟
            </div>
            <div>
              <span className="font-medium">预计总费用:</span> ¥{pipelineConfig.estimatedCost.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {progress && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">执行进度</h2>
          <PipelineProgressBar
            progress={progress.progress}
            currentStep={currentStep?.name}
            totalSteps={progress.totalSteps}
            completedSteps={progress.completedSteps.length}
          />
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">已用时间:</span> {progress.elapsedTime.toFixed(1)} 分钟
            </div>
            <div>
              <span className="font-medium">剩余时间:</span> {progress.estimatedRemainingTime.toFixed(1)} 分钟
            </div>
            <div>
              <span className="font-medium">已用费用:</span> ¥{progress.actualCost.toFixed(2)}
            </div>
            <div>
              <span className="font-medium">预计总费用:</span> ¥{progress.estimatedTotalCost.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {currentStep && (
        <CurrentStepCard
          stepName={currentStep.name}
          stepOrder={currentStep.order}
          totalSteps={pipelineConfig.steps.length}
          status={isRunning ? "running" : "pending"}
          estimatedTime={currentStep.estimatedTime}
          estimatedCost={currentStep.estimatedCost}
          qualityScore={stepResults.get(currentStep.id)?.quality.score}
          qualityPassed={stepResults.get(currentStep.id)?.quality.passed}
        />
      )}

      {Array.from(stepResults.values())
        .filter((r) => !r.quality.passed)
        .map((result) => (
          <IssueAlert
            key={result.stepId}
            issues={result.quality.issues}
            suggestions={result.quality.suggestions}
            autoFixable={result.quality.autoFixable}
            onFix={() => handleFix(result.stepId)}
          />
        ))}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">执行日志</h2>
        <div className="bg-gray-50 rounded p-4 max-h-64 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-gray-500 text-sm">暂无日志</div>
          ) : (
            <div className="space-y-1 text-sm font-mono">
              {messages.map((msg, idx) => (
                <div key={idx}>{msg}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <button
          onClick={startPipeline}
          disabled={isRunning}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isRunning ? "执行中..." : "开始执行"}
        </button>
      </div>
    </div>
  );
}
