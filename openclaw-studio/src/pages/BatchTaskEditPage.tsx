import { useState, useEffect } from "react";
import useSWR from "swr";
import { api, type BatchTask, type BatchTaskContent } from "../lib/api-client";
import { BatchChat } from "../components/batch/BatchChat";
import { ArrowLeft } from "lucide-react";

interface BatchTaskEditPageProps {
  task: BatchTask;
  onBack: () => void;
}

export function BatchTaskEditPage({ task, onBack }: BatchTaskEditPageProps) {
  const { data: content, error } = useSWR<BatchTaskContent>(
    ["batch-task-content", task.id],
    () => api.batch.getTaskContent(task.id),
  );

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-red-400">加载失败: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden p-4">
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white"
        >
          <ArrowLeft size={16} />
          返回
        </button>
        <span className="text-sm text-gray-500">·</span>
        <span className="text-sm font-medium text-white">{task.projectName}</span>
        <span className="text-xs text-gray-500">({task.progress}%)</span>
      </div>
      <div className="mt-4 grid flex-1 min-h-0 grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col overflow-hidden rounded-lg border border-white/10 bg-surface-1 p-3">
          <h3 className="mb-2 text-sm font-medium text-gray-300">内容概览</h3>
          {content ? (
            <div className="space-y-2 overflow-auto text-xs text-gray-400">
              <p>场景: {Array.isArray(content.scenes) ? content.scenes.length : 0} 个</p>
              <p>分镜: {Array.isArray(content.shots) ? (content.shots as unknown[]).length : 0} 组</p>
              <p>角色: {Array.isArray(content.characters) ? content.characters.length : 0} 个</p>
              <p>源文件: {Array.isArray(content.sourceFiles) ? content.sourceFiles.length : 0} 个</p>
            </div>
          ) : (
            <p className="text-gray-500">加载中…</p>
          )}
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <BatchChat taskId={task.id} projectName={task.projectName} />
        </div>
      </div>
    </div>
  );
}
