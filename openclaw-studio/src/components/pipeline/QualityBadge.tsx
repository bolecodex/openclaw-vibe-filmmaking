import React from "react";

interface QualityBadgeProps {
  score: number;
  passed: boolean;
  size?: "sm" | "md" | "lg";
}

export function QualityBadge({ score, passed, size = "md" }: QualityBadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2",
  };

  const colorClasses = passed
    ? "bg-green-100 text-green-800 border-green-300"
    : score >= 5
      ? "bg-yellow-100 text-yellow-800 border-yellow-300"
      : "bg-red-100 text-red-800 border-red-300";

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${sizeClasses[size]} ${colorClasses}`}
    >
      {score.toFixed(1)}/10
      {passed ? " ✓" : " ⚠"}
    </span>
  );
}
