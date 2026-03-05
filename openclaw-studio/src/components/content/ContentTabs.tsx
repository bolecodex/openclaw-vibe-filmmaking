import { useProjectStore } from "../../stores/project-store";
import { VISIBLE_VIEWS, VIEW_MAP } from "../../lib/ui-registry";
import { FileEditor } from "./FileEditor";
import { ViewActionBar } from "./ViewActionBar";
import { ExecutionPanel } from "./ExecutionPanel";
import { useWorkspaceSync } from "../../hooks/use-workspace-sync";
import { FolderOpen } from "lucide-react";

export function ContentTabs() {
  const { currentProject, currentTab, setCurrentTab, selectedFile } =
    useProjectStore();

  useWorkspaceSync(currentProject);

  if (!currentProject) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-gray-600">
        <FolderOpen size={40} strokeWidth={1} />
        <p className="text-sm">选择一个项目开始</p>
      </div>
    );
  }

  const view = VIEW_MAP.get(currentTab);
  const ViewComponent = view?.component;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-0.5 border-b border-white/5 px-2">
        {VISIBLE_VIEWS.map((v) => (
          <button
            key={v.id}
            onClick={() => setCurrentTab(v.id)}
            className={`px-3 py-2 text-xs transition-colors ${
              currentTab === v.id
                ? "border-b-2 border-accent text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {v.label}
          </button>
        ))}
        {currentTab === "file" && selectedFile && (
          <span className="ml-auto truncate px-2 py-2 text-xs text-gray-500">
            {selectedFile}
          </span>
        )}
      </div>

      <ViewActionBar project={currentProject} tab={currentTab} />

      <div className="flex-1 overflow-auto">
        {currentTab === "file" && selectedFile ? (
          <FileEditor path={selectedFile} />
        ) : ViewComponent ? (
          <ViewComponent project={currentProject} {...(view?.componentProps || {})} />
        ) : null}
      </div>

      <ExecutionPanel />
    </div>
  );
}
