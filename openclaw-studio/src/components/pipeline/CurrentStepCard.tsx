import React from "react";
import { QualityBadge } from "./QualityBadge.js";

interface CurrentStepCardProps {
  stepName: string;
  stepOrder: number;
  totalSteps: number;
  status: "pending" | "running" | "completed" | "failed";
  estimatedTime?: number;
  estimatedCost?: number;
  qualityScore?: number;
  qualityPassed?: boolean;
}

export function CurrentStepCard({
  stepName,
  stepOrder,
  totalSteps,
  status,
  estimatedTime,
  estimatedCost,
  qualityScore,
  qualityPassed,
}: CurrentStepCardProps) {
  const statusColors = {
    pending: "bg-gray-100 text-gray-700",
    running: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[status]}`}>
            {status === "pending" && "等待"}
            {status === "running" && "执行中"}
            {status === "completed" && "完成"}
            {status === "failed" && "失败"}
          </span>
          <h3 className="text-lg font-semibold text-gray-900">
            [{stepOrder}/{totalSteps}] {stepName}
          </h3>
        </div>
        {qualityScore !== undefined && (
          <QualityBadge score={qualityScore} passed={qualityPassed ?? false} />
        )}
      </div>
      {(estimatedTime !== undefined || estimatedCost !== undefined) && (
        <div className="text-sm text-gray-600 space-x-4">
          {estimatedTime !== undefined && <span>预计耗时: {estimatedTime} 分钟</span>}
          {estimatedCost !== undefined && <span>预计费用: ¥{estimatedCost.toFixed(2)}</span>}
        </div>
      )}
    </div>
  );
}
