import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api } from "../../lib/api-client";
import type { Skill } from "../../lib/types";

interface SkillConfigProps {
  skill: Skill;
  onUpdated?: () => void;
}

export function SkillConfig({ skill, onUpdated }: SkillConfigProps) {
  const [enabled, setEnabled] = useState(skill.enabled);
  const [env, setEnv] = useState<[string, string][]>(
    Object.entries(skill.config || {})
  );
  const [saving, setSaving] = useState(false);

  const handleToggle = async () => {
    setSaving(true);
    try {
      await api.skills.updateConfig(skill.name, { enabled: !enabled });
      setEnabled(!enabled);
      onUpdated?.();
    } finally {
      setSaving(false);
    }
  };

  const handleEnvChange = (index: number, key: "0" | "1", value: string) => {
    const next = [...env];
    next[index] = [...next[index]];
    next[index][key === "0" ? 0 : 1] = value;
    setEnv(next);
  };

  const handleAddEnv = () => {
    setEnv([...env, ["", ""]]);
  };

  const handleRemoveEnv = (index: number) => {
    setEnv(env.filter((_, i) => i !== index));
  };

  const handleSaveEnv = async () => {
    setSaving(true);
    try {
      const envObj = Object.fromEntries(
        env.filter(([k]) => k.trim()).map(([k, v]) => [k.trim(), v.trim()])
      );
      await api.skills.updateConfig(skill.name, { env: envObj });
      setEnv(Object.entries(envObj));
      onUpdated?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-200">启用状态</span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={handleToggle}
          disabled={saving}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
            enabled ? "bg-accent" : "bg-surface-3"
          } ${saving ? "opacity-60" : ""}`}
        >
          <span
            className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
              enabled ? "left-6 translate-x-0.5" : "left-1"
            }`}
          />
        </button>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-200">环境变量</span>
          <button
            type="button"
            onClick={handleAddEnv}
            className="flex items-center gap-1 text-sm text-accent hover:text-accent-hover"
          >
            <Plus className="h-4 w-4" />
            添加
          </button>
        </div>
        <div className="space-y-2">
          {env.map(([k, v], i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                placeholder="键"
                value={k}
                onChange={(e) => handleEnvChange(i, "0", e.target.value)}
                className="flex-1 rounded border border-white/10 bg-surface-2 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-accent focus:outline-none"
              />
              <input
                type="text"
                placeholder="值"
                value={v}
                onChange={(e) => handleEnvChange(i, "1", e.target.value)}
                className="flex-1 rounded border border-white/10 bg-surface-2 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-accent focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleRemoveEnv(i)}
                className="rounded p-2 text-gray-400 hover:bg-surface-3 hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        {env.length > 0 && (
          <button
            type="button"
            onClick={handleSaveEnv}
            disabled={saving}
            className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
          >
            保存环境变量
          </button>
        )}
      </div>
    </div>
  );
}
