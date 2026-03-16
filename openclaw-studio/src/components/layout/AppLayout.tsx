import { useState } from "react";
import { FileExplorer } from "../explorer/FileExplorer";
import { ContentTabs } from "../content/ContentTabs";
import { ChatPanel } from "../chat/ChatPanel";
import { SkillList } from "../skills/SkillList";
import { SkillDetail } from "../skills/SkillDetail";
import { useProjectStore } from "../../stores/project-store";
import { useSkillsStore } from "../../stores/skills-store";
import { Wrench, FolderOpen, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";

const SIDEBAR_WIDTH = 224; // w-56
const SIDEBAR_COLLAPSED = 52;
const CHAT_WIDTH = 360;
const CHAT_COLLAPSED = 52;

export function AppLayout() {
  const { currentView, setCurrentView } = useProjectStore();
  const selectedSkill = useSkillsStore((s) => s.selectedSkill);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface-0 text-gray-100">
      {/* Left Panel - 可折叠 */}
      <div
        className="flex shrink-0 flex-col border-r border-white/[0.06] bg-surface-1 transition-[width] duration-200 ease-out"
        style={{ width: sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH }}
      >
        <div className="flex min-h-[2.75rem] shrink-0 items-center justify-between border-b border-white/[0.06] px-2 py-2">
          {!sidebarCollapsed && (
            <>
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-accent/20">
                <span className="text-[10px] font-bold text-accent">O</span>
              </div>
              <span className="ml-2 min-w-0 truncate text-xs font-bold tracking-wide text-white">
                OpenClaw Studio
              </span>
            </>
          )}
          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded text-gray-500 hover:bg-white/10 hover:text-gray-300 ${sidebarCollapsed ? "mx-auto" : "ml-1"}`}
            title={sidebarCollapsed ? "展开侧栏" : "收起侧栏"}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen size={14} />
            ) : (
              <PanelLeftClose size={14} />
            )}
          </button>
        </div>

        <div className="flex border-b border-white/[0.06]">
          <button
            onClick={() => setCurrentView("workspace")}
            className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-2 text-xs transition-colors ${
              sidebarCollapsed ? "py-2.5" : "px-3"
            } ${
              currentView === "workspace"
                ? "bg-white/5 text-white"
                : "text-gray-500 hover:bg-white/[0.03] hover:text-gray-300"
            }`}
            title="项目"
          >
            <FolderOpen size={14} />
            {!sidebarCollapsed && <span className="truncate">项目</span>}
          </button>
          <button
            onClick={() => setCurrentView("skills")}
            className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-2 text-xs transition-colors ${
              sidebarCollapsed ? "py-2.5" : "px-3"
            } ${
              currentView === "skills"
                ? "bg-white/5 text-white"
                : "text-gray-500 hover:bg-white/[0.03] hover:text-gray-300"
            }`}
            title="Skills"
          >
            <Wrench size={14} />
            {!sidebarCollapsed && <span className="truncate">Skills</span>}
          </button>
        </div>

        {!sidebarCollapsed && (
          <>
            {currentView === "workspace" ? (
              <FileExplorer />
            ) : (
              <div className="flex-1 overflow-auto">
                <SkillList />
              </div>
            )}
          </>
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

      {/* Right Panel - 可折叠 */}
      <div
        className="flex shrink-0 flex-col border-l border-white/[0.06] bg-surface-1 transition-[width] duration-200 ease-out"
        style={{ width: chatCollapsed ? CHAT_COLLAPSED : CHAT_WIDTH }}
      >
        <div className="flex min-h-[2.75rem] shrink-0 items-center justify-between border-b border-white/[0.06] px-2 py-2">
          {!chatCollapsed && (
            <span className="min-w-0 truncate text-xs font-medium text-gray-300">
              对话
            </span>
          )}
          <button
            type="button"
            onClick={() => setChatCollapsed((c) => !c)}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded text-gray-500 hover:bg-white/10 hover:text-gray-300 ${chatCollapsed ? "mx-auto" : "ml-1"}`}
            title={chatCollapsed ? "展开对话" : "收起对话"}
          >
            {chatCollapsed ? (
              <PanelRightOpen size={14} />
            ) : (
              <PanelRightClose size={14} />
            )}
          </button>
        </div>
        {!chatCollapsed && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <ChatPanel />
          </div>
        )}
      </div>
    </div>
  );
}
