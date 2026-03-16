import { motion, AnimatePresence } from "framer-motion";
import { useProjectStore } from "../../stores/project-store";
import { usePipelineStore } from "../../stores/pipeline-store";
import { VISIBLE_VIEWS, VIEW_MAP } from "../../lib/ui-registry";
import { FileEditor } from "./FileEditor";
import { ViewActionBar } from "./ViewActionBar";
import { ExecutionPanel } from "./ExecutionPanel";
import { useWorkspaceSync } from "../../hooks/use-workspace-sync";
import { FolderOpen, Loader2, Check, AlertCircle } from "lucide-react";
import { cn } from "../../lib/utils";

const STEP_TO_TAB: Record<string, string> = {
  "extract-characters": "characters",
  "script-to-scenes": "scenes",
  "scenes-to-storyboard": "shots",
  "shots-to-images": "shots",
  "shots-to-audio": "audio",
  "shots-to-ai-video": "video",
  "compose-video": "editor",
};

function TabStatusDot({ tabId }: { tabId: string }) {
  const steps = usePipelineStore((s) => s.steps);
  const runningStep = usePipelineStore((s) => s.runningStep);

  const relatedSteps = steps.filter(
    (s) => STEP_TO_TAB[s.id] === tabId || s.id === tabId,
  );

  const isRunning =
    runningStep !== null && STEP_TO_TAB[runningStep] === tabId;
  const hasError = relatedSteps.some((s) => s.status === "error");
  const allDone =
    relatedSteps.length > 0 &&
    relatedSteps.every(
      (s) => s.status === "completed" || s.status === "partial",
    );

  if (isRunning) {
    return (
      <Loader2 size={10} className="animate-spin text-amber-400" />
    );
  }
  if (hasError) {
    return <AlertCircle size={10} className="text-red-400" />;
  }
  if (allDone) {
    return <Check size={10} className="text-emerald-400" />;
  }
  return null;
}

export function ContentTabs() {
  const { currentProject, currentTab, setCurrentTab, selectedFile } =
    useProjectStore();

  useWorkspaceSync(currentProject);

  if (!currentProject) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-gray-600">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl bg-surface-2 p-6"
        >
          <FolderOpen size={44} strokeWidth={1} className="text-gray-500" />
        </motion.div>
        <motion.p
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="text-sm font-medium text-gray-400"
        >
          选择一个项目开始
        </motion.p>
      </div>
    );
  }

  const view = VIEW_MAP.get(currentTab);
  const ViewComponent = view?.component;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 shrink-0 items-center border-b border-white/[0.06] bg-surface-1/60">
        <div className="flex min-w-0 flex-1 items-center gap-0 overflow-x-auto scrollbar-thin px-1">
          {VISIBLE_VIEWS.map((v) => {
            const isActive = currentTab === v.id;
            const Icon = v.icon;

            return (
              <button
                key={v.id}
                onClick={() => setCurrentTab(v.id)}
                className={cn(
                  "relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-xs font-medium transition-colors",
                  isActive
                    ? "text-white"
                    : "text-gray-500 hover:text-gray-300",
                )}
              >
                {Icon && (
                  <Icon
                    size={13}
                    className={cn(
                      "shrink-0 transition-colors",
                      isActive ? "text-accent" : "text-gray-600",
                    )}
                  />
                )}
                <span className="inline">{v.label}</span>
                <TabStatusDot tabId={v.id} />
                {isActive && (
                  <motion.span
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-1 right-1 h-[2px] rounded-full bg-accent"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
        {currentTab === "file" && selectedFile && (
          <span className="shrink-0 truncate px-2 py-2 text-xs text-gray-500 max-w-[12rem]">
            {selectedFile}
          </span>
        )}
      </div>

      <ViewActionBar project={currentProject} tab={currentTab} />

      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            {currentTab === "file" && selectedFile ? (
              <FileEditor path={selectedFile} />
            ) : ViewComponent ? (
              <ViewComponent
                project={currentProject}
                {...(view?.componentProps || {})}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <ExecutionPanel />
    </div>
  );
}
