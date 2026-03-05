import { FileExplorer } from "../explorer/FileExplorer";
import { ContentTabs } from "../content/ContentTabs";
import { ChatPanel } from "../chat/ChatPanel";
import { SkillList } from "../skills/SkillList";
import { SkillDetail } from "../skills/SkillDetail";
import { useProjectStore } from "../../stores/project-store";
import { useSkillsStore } from "../../stores/skills-store";
import { Wrench, FolderOpen } from "lucide-react";

export function AppLayout() {
  const { currentView, setCurrentView } = useProjectStore();
  const selectedSkill = useSkillsStore((s) => s.selectedSkill);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface-0 text-gray-100">
      {/* Left Panel */}
      <div className="flex w-56 flex-col border-r border-white/5 bg-surface-1">
        <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2">
          <span className="text-xs font-bold text-white">OpenClaw Studio</span>
        </div>

        <div className="flex border-b border-white/5">
          <button
            onClick={() => setCurrentView("workspace")}
            className={`flex items-center justify-center gap-1 flex-1 px-3 py-1.5 text-xs ${
              currentView === "workspace"
                ? "bg-white/5 text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <FolderOpen size={11} /> 项目
          </button>
          <button
            onClick={() => setCurrentView("skills")}
            className={`flex items-center justify-center gap-1 flex-1 px-3 py-1.5 text-xs ${
              currentView === "skills"
                ? "bg-white/5 text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <Wrench size={11} /> Skills
          </button>
        </div>

        {currentView === "workspace" ? (
          <FileExplorer />
        ) : (
          <div className="flex-1 overflow-auto">
            <SkillList />
          </div>
        )}
      </div>

      {/* Middle Panel */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {currentView === "workspace" ? (
          <ContentTabs />
        ) : selectedSkill ? (
          <SkillDetail name={selectedSkill} />
        ) : (
          <div className="flex flex-1 items-center justify-center text-gray-600">
            <p className="text-sm">选择一个 Skill 查看详情</p>
          </div>
        )}
      </div>

      {/* Right Panel */}
      <ChatPanel />
    </div>
  );
}
