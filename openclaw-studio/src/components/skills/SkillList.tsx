import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { SkillCard } from "./SkillCard";
import { SkillMarketplace } from "./SkillMarketplace";
import { SkillCreateWizard } from "./SkillCreateWizard";
import { SkillImportDialog } from "./SkillImportDialog";
import { useSkills } from "../../hooks/use-skills";
import { useSkillsStore } from "../../stores/skills-store";
import type { SkillTab } from "../../stores/skills-store";
import type { Skill } from "../../lib/types";

const TABS: Array<{ id: SkillTab; label: string }> = [
  { id: "system", label: "系统" },
  { id: "installed", label: "已安装" },
  { id: "marketplace", label: "市场" },
  { id: "all", label: "全部" },
];

function filterSkills(skills: Skill[], tab: SkillTab, query: string): Skill[] {
  let filtered = skills;
  if (tab === "system") {
    filtered = skills.filter((s) => s.source === "bundled");
  } else if (tab === "installed") {
    filtered = skills.filter(
      (s) => s.source === "workspace" || s.source === "managed",
    );
  }
  if (query.trim()) {
    const q = query.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.displayName || "").toLowerCase().includes(q) ||
        (s.description || "").toLowerCase().includes(q),
    );
  }
  return filtered;
}

function SystemSkillList({
  skills,
  selectedSkill,
  onSelect,
}: {
  skills: Skill[];
  selectedSkill: string | null;
  onSelect: (name: string) => void;
}) {
  const pipelineSkills = skills
    .filter((s) => s.pipelineStep)
    .sort((a, b) => (a.pipelineStep ?? 0) - (b.pipelineStep ?? 0));
  const otherSkills = skills.filter((s) => !s.pipelineStep);

  return (
    <div className="space-y-4">
      {pipelineSkills.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2 px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
              创作流水线
            </span>
            <span className="h-px flex-1 bg-indigo-500/20" />
          </div>
          <div className="relative space-y-1">
            {pipelineSkills.map((skill, i) => (
              <div key={skill.name} className="relative">
                {i < pipelineSkills.length - 1 && (
                  <div className="absolute left-[13px] top-[34px] bottom-0 w-px bg-indigo-500/20" />
                )}
                <SkillCard
                  name={skill.name}
                  displayName={skill.displayName}
                  description={skill.description}
                  source={skill.source}
                  enabled={skill.enabled}
                  overridden={skill.overridden}
                  pipelineStep={skill.pipelineStep}
                  onClick={() => onSelect(skill.name)}
                  isSelected={selectedSkill === skill.name}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {otherSkills.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2 px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              其他系统技能
            </span>
            <span className="h-px flex-1 bg-white/5" />
          </div>
          <div className="space-y-1">
            {otherSkills.map((skill) => (
              <SkillCard
                key={skill.name}
                name={skill.name}
                displayName={skill.displayName}
                description={skill.description}
                source={skill.source}
                enabled={skill.enabled}
                overridden={skill.overridden}
                onClick={() => onSelect(skill.name)}
                isSelected={selectedSkill === skill.name}
              />
            ))}
          </div>
        </div>
      )}

      {pipelineSkills.length === 0 && otherSkills.length === 0 && (
        <p className="py-8 text-center text-sm text-gray-500">暂无系统技能</p>
      )}
    </div>
  );
}

export function SkillList() {
  const { data: skills = [] } = useSkills();
  const {
    selectedSkill,
    searchQuery,
    activeTab,
    setSelectedSkill,
    setSearchQuery,
    setActiveTab,
  } = useSkillsStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const filteredSkills = filterSkills(skills, activeTab, searchQuery);

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 space-y-3 border-b border-white/5 p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="搜索 Skill..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-surface-2 py-2 pl-9 pr-3 text-sm text-gray-100 placeholder-gray-500 focus:border-accent focus:outline-none"
          />
        </div>
        <div className="flex gap-1 rounded-lg bg-surface-2 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-surface-3 text-gray-100"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {activeTab === "marketplace" ? (
          <SkillMarketplace />
        ) : activeTab === "system" ? (
          <SystemSkillList
            skills={filteredSkills}
            selectedSkill={selectedSkill}
            onSelect={setSelectedSkill}
          />
        ) : (
          <div className="space-y-2">
            {filteredSkills.map((skill) => (
              <SkillCard
                key={skill.name}
                name={skill.name}
                displayName={skill.displayName}
                description={skill.description}
                source={skill.source}
                enabled={skill.enabled}
                overridden={skill.overridden}
                pipelineStep={skill.pipelineStep}
                onClick={() => setSelectedSkill(skill.name)}
                isSelected={selectedSkill === skill.name}
              />
            ))}
            {filteredSkills.length === 0 && (
              <p className="py-8 text-center text-sm text-gray-500">
                无匹配的 Skill
              </p>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 space-y-2 border-t border-white/5 p-3">
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 bg-surface-2 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:border-accent hover:bg-surface-3 hover:text-gray-100"
        >
          <Plus className="h-4 w-4" />
          创建 Skill
        </button>
        <button
          type="button"
          onClick={() => setImportOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-surface-2 py-2 text-sm text-gray-400 transition-colors hover:bg-surface-3 hover:text-gray-200"
        >
          导入 Skill
        </button>
      </div>

      <SkillCreateWizard
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      <SkillImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
      />
    </div>
  );
}
