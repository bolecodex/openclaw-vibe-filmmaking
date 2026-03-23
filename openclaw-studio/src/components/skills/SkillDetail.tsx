import { useState, useEffect } from "react";
import { Save, Trash2, Upload, RotateCcw, AlertTriangle } from "lucide-react";
import useSWR from "swr";
import { useSkill } from "../../hooks/use-skills";
import { useSkillsStore } from "../../stores/skills-store";
import { SkillConfig } from "./SkillConfig";
import { SkillEditor } from "./SkillEditor";
import { SkillDocumentation } from "./SkillDocumentation";
import { SkillFilesPanel } from "./SkillFilesPanel";
import { api } from "../../lib/api-client";

interface SkillDetailProps {
  name: string;
}

type DetailTab = "readme" | "config" | "files" | "editor";

export function SkillDetail({ name }: SkillDetailProps) {
  const { data: skill, mutate } = useSkill(name);
  const setSelectedSkill = useSkillsStore((s) => s.setSelectedSkill);
  const [activeTab, setActiveTab] = useState<DetailTab>("readme");
  const [editorContent, setEditorContent] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resetting, setResetting] = useState(false);

  const { data: filesMeta } = useSWR(
    name ? `skill-files-meta-${name}` : null,
    async () => {
      const r = await api.skills.listFiles(name);
      return r.entries?.length ?? 0;
    },
    { revalidateOnFocus: false },
  );

  useEffect(() => {
    setActiveTab("readme");
    setEditorContent(null);
  }, [name]);

  if (!skill) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        加载中...
      </div>
    );
  }

  const content = editorContent ?? skill.content;
  const isDirty = editorContent !== null && editorContent !== skill.content;
  const isBundled = skill.source === "bundled";
  const isProject = skill.source === "project";
  const canDelete = !isBundled && !isProject;
  const canReset = Boolean(
    skill.overridden && (isBundled || isProject),
  );
  /** 仓库内技能编辑会写入 ~/.openclaw/workspace/skills 覆盖层 */
  const canEdit = true;

  const tabs: Array<{ id: DetailTab; label: string }> = [
    { id: "readme", label: "说明" },
    { id: "config", label: "配置" },
    {
      id: "files",
      label:
        filesMeta != null && filesMeta > 0
          ? `文件(${filesMeta})`
          : "文件",
    },
  ];
  if (canEdit) tabs.push({ id: "editor", label: "编辑器" });

  const handleSave = async () => {
    if (!isDirty) return;
    setSaving(true);
    try {
      await api.skills.update(name, { content });
      setEditorContent(null);
      mutate();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`确定要删除 Skill「${skill.displayName || name}」吗？`))
      return;
    setDeleting(true);
    try {
      await api.skills.delete(name);
      setSelectedSkill(null);
      mutate();
    } finally {
      setDeleting(false);
    }
  };

  const handleReset = async () => {
    if (
      !confirm(
        isProject
          ? "确定要重置为仓库内默认版本？工作区覆盖将被删除。"
          : "确定要重置为系统默认版本？你的修改将被丢弃。",
      )
    )
      return;
    setResetting(true);
    try {
      await api.skills.reset(name);
      setEditorContent(null);
      mutate();
    } finally {
      setResetting(false);
    }
  };

  const handlePublish = async () => {
    setSaving(true);
    try {
      await api.skills.publish(name);
      mutate();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-white/5 p-4">
        {(isBundled || isProject) && skill.pipelineStep && (
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-300">
              {skill.pipelineStep}
            </span>
            <span className="text-xs text-indigo-300/70">
              步骤 {skill.pipelineStep} / 创作流水线
            </span>
          </div>
        )}
        <h2 className="text-lg font-semibold text-gray-100">
          {skill.displayName || name}
        </h2>
        <p className="mt-1 text-sm text-gray-400">{skill.description}</p>

        {canReset && (
          <div className="mt-2 flex items-center gap-2 rounded-md bg-amber-500/10 px-3 py-1.5">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
            <span className="text-xs text-amber-300">
              已修改 — 与系统默认版本不同
            </span>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-surface-2 text-gray-100"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
        {activeTab === "readme" && (
          <SkillDocumentation rawMarkdown={content} />
        )}
        {activeTab === "config" && (
          <SkillConfig skill={skill} onUpdated={() => mutate()} />
        )}
        {activeTab === "files" && <SkillFilesPanel skillName={name} />}
        {activeTab === "editor" && canEdit && (
          <SkillEditor content={content} onChange={(v) => setEditorContent(v)} />
        )}
      </div>

      <div className="shrink-0 flex flex-wrap gap-2 border-t border-white/5 p-4">
        {activeTab === "editor" && isDirty && canEdit && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            保存
          </button>
        )}

        {canReset && (
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting}
            className="flex items-center gap-2 rounded-lg border border-amber-500/30 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/10 disabled:opacity-60"
          >
            <RotateCcw className="h-4 w-4" />
            重置为默认
          </button>
        )}

        {canDelete && (
          <>
            <button
              type="button"
              onClick={handlePublish}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-surface-2 disabled:opacity-60"
            >
              <Upload className="h-4 w-4" />
              发布
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              删除
            </button>
          </>
        )}
      </div>
    </div>
  );
}
