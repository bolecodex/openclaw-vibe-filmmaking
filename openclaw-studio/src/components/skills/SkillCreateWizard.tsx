import { useState } from "react";
import { X } from "lucide-react";
import { api } from "../../lib/api-client";
import { useSkills } from "../../hooks/use-skills";

interface SkillCreateWizardProps {
  open: boolean;
  onClose: () => void;
}

function buildSkillContent(
  name: string,
  description: string,
  triggers: string[],
  tools: string[]
): string {
  const triggerList = triggers.filter(Boolean).map((t) => `- ${t}`).join("\n");
  const toolList = tools.filter(Boolean).map((t) => `- ${t}`).join("\n");
  return `# ${name}

${description}

## 触发场景

${triggerList || "- （添加触发关键词）"}

## 工具

${toolList || "- （添加工具）"}
`;
}

export function SkillCreateWizard({ open, onClose }: SkillCreateWizardProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggers, setTriggers] = useState<string[]>([""]);
  const [tools, setTools] = useState<string[]>([""]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { mutate: refreshSkills } = useSkills();

  const preview = buildSkillContent(
    name || "skill-name",
    description || "Skill 描述",
    triggers,
    tools
  );

  const handleAdd = (field: "triggers" | "tools") => {
    if (field === "triggers") setTriggers([...triggers, ""]);
    else setTools([...tools, ""]);
  };

  const handleRemove = (field: "triggers" | "tools", index: number) => {
    if (field === "triggers" && triggers.length > 1)
      setTriggers(triggers.filter((_, i) => i !== index));
    else if (field === "tools" && tools.length > 1)
      setTools(tools.filter((_, i) => i !== index));
  };

  const handleChange = (
    field: "triggers" | "tools",
    index: number,
    value: string
  ) => {
    if (field === "triggers") {
      const next = [...triggers];
      next[index] = value;
      setTriggers(next);
    } else {
      const next = [...tools];
      next[index] = value;
      setTools(next);
    }
  };

  const handleCreate = async () => {
    const slug = name.trim().toLowerCase().replace(/\s+/g, "-");
    if (!slug) {
      setError("请输入 Skill 名称");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await api.skills.create({
        name: slug,
        content: buildSkillContent(name, description, triggers, tools),
      });
      refreshSkills();
      setName("");
      setDescription("");
      setTriggers([""]);
      setTools([""]);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建失败");
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-white/10 bg-surface-1 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
          <h3 className="text-lg font-semibold text-gray-100">创建 Skill</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-2 text-gray-400 hover:bg-surface-2 hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                名称
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-skill"
                className="w-full rounded-lg border border-white/10 bg-surface-2 px-3 py-2 text-gray-100 placeholder-gray-500 focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                描述
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Skill 功能描述"
                rows={2}
                className="w-full rounded-lg border border-white/10 bg-surface-2 px-3 py-2 text-gray-100 placeholder-gray-500 focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">
                  触发关键词
                </label>
                <button
                  type="button"
                  onClick={() => handleAdd("triggers")}
                  className="text-sm text-accent hover:text-accent-hover"
                >
                  + 添加
                </button>
              </div>
              <div className="space-y-2">
                {triggers.map((t, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={t}
                      onChange={(e) => handleChange("triggers", i, e.target.value)}
                      placeholder="触发词"
                      className="flex-1 rounded-lg border border-white/10 bg-surface-2 px-3 py-2 text-gray-100 placeholder-gray-500 focus:border-accent focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemove("triggers", i)}
                      className="rounded px-2 text-gray-400 hover:text-red-400"
                    >
                      移除
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">工具</label>
                <button
                  type="button"
                  onClick={() => handleAdd("tools")}
                  className="text-sm text-accent hover:text-accent-hover"
                >
                  + 添加
                </button>
              </div>
              <div className="space-y-2">
                {tools.map((t, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={t}
                      onChange={(e) => handleChange("tools", i, e.target.value)}
                      placeholder="工具名"
                      className="flex-1 rounded-lg border border-white/10 bg-surface-2 px-3 py-2 text-gray-100 placeholder-gray-500 focus:border-accent focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemove("tools", i)}
                      className="rounded px-2 text-gray-400 hover:text-red-400"
                    >
                      移除
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                预览 SKILL.md
              </label>
              <pre className="max-h-40 overflow-auto rounded-lg border border-white/10 bg-surface-2 p-3 text-xs text-gray-300">
                {preview}
              </pre>
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-white/5 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-300 hover:bg-surface-2"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {creating ? "创建中..." : "创建"}
          </button>
        </div>
      </div>
    </div>
  );
}
