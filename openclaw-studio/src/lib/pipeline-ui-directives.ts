/**
 * Agent 在回复中可嵌入的流水线触发标记（解析后从展示内容中移除，由前端自动执行）。
 * 格式：[UI:pipeline:<stepId>:<action>:<id1>[,id2,...]]
 */
/** 第三段为 ID 列表，可为空（如 retry-failed） */
const DIRECTIVE_RE = /\n?\s*\[UI:pipeline:([\w-]+):([\w-]+):([^\]]*)\]\s*/g;

export interface PipelineDirectiveRun {
  stepId: string;
  action: string;
  selectedIds: string[];
}

export function parseAndStripPipelineDirectives(content: string): {
  cleaned: string;
  runs: PipelineDirectiveRun[];
} {
  const runs: PipelineDirectiveRun[] = [];
  for (const m of content.matchAll(new RegExp(DIRECTIVE_RE.source, "g"))) {
    const ids = m[3]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    runs.push({ stepId: m[1], action: m[2], selectedIds: ids });
  }
  const cleaned = content
    .replace(new RegExp(DIRECTIVE_RE.source, "g"), "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
  return { cleaned, runs };
}
