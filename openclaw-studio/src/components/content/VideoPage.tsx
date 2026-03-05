import { useState } from "react";
import { Eye, Clapperboard, FolderOpen } from "lucide-react";
import { VideoPreview } from "./VideoPreview";
import { VideoExport } from "./VideoExport";
import { VideoHistory } from "./VideoHistory";

type SubTab = "preview" | "export" | "history";

const SUB_TABS: { id: SubTab; label: string; icon: typeof Eye }[] = [
  { id: "preview", label: "预览", icon: Eye },
  { id: "export", label: "导出", icon: Clapperboard },
  { id: "history", label: "历史", icon: FolderOpen },
];

export function VideoPage({ project }: { project: string }) {
  const [activeTab, setActiveTab] = useState<SubTab>("preview");

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-white/5 px-4 py-1.5">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs transition-colors ${
                active
                  ? "bg-accent/15 text-accent"
                  : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
              }`}
            >
              <Icon size={12} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "preview" && <VideoPreview project={project} />}
        {activeTab === "export" && <VideoExport project={project} />}
        {activeTab === "history" && (
          <VideoHistory
            project={project}
            onSwitchToExport={() => setActiveTab("export")}
          />
        )}
      </div>
    </div>
  );
}
