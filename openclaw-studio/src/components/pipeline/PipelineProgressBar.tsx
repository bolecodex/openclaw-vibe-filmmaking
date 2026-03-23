import React from "react";

interface PipelineProgressBarProps {
  progress: number;
  currentStep?: string;
  totalSteps?: number;
  completedSteps?: number;
}

export function PipelineProgressBar({
  progress,
  currentStep,
  totalSteps,
  completedSteps,
}: PipelineProgressBarProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          {currentStep || "准备中..."}
        </span>
        <span className="text-sm text-gray-500">
          {completedSteps !== undefined && totalSteps !== undefined
            ? `${completedSteps}/${totalSteps}`
            : `${Math.round(progress)}%`}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}
