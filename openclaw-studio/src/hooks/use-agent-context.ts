import { useMemo } from "react";
import { useProjectStore } from "../stores/project-store";
import { useProjects, useCharacters, useScenes, useShots, useStyle, useSourceFiles } from "./use-api";
import { getAvailableViewsForAgent } from "../lib/ui-registry";
import type { AgentContext } from "../lib/types";

export function useAgentContext(): AgentContext | null {
  const currentProject = useProjectStore((s) => s.currentProject);
  const currentTab = useProjectStore((s) => s.currentTab);
  const currentView = useProjectStore((s) => s.currentView);
  const selectedFile = useProjectStore((s) => s.selectedFile);
  const focusedItem = useProjectStore((s) => s.focusedItem);

  const { data: projects } = useProjects();
  const { data: characters } = useCharacters(currentProject);
  const { data: scenesData } = useScenes(currentProject);
  const { data: shotsData } = useShots(currentProject);
  const { data: style } = useStyle(currentProject);
  const { data: sourceFiles } = useSourceFiles(currentProject);

  return useMemo(() => {
    if (!currentProject) return null;

    const projectInfo = projects?.find((p) => p.name === currentProject);

    const focusedChar =
      focusedItem?.type === "character"
        ? characters?.find((c) => c.id === focusedItem.id)
        : null;
    const focusedScene =
      focusedItem?.type === "scene"
        ? scenesData?.scenes?.find((s) => s.id === focusedItem.id)
        : null;

    const totalShots =
      shotsData?.scenes?.reduce((acc, s) => acc + s.shots.length, 0) ?? 0;

    return {
      project: projectInfo
        ? { name: projectInfo.name, path: projectInfo.path }
        : { name: currentProject, path: "" },
      view: { currentTab, currentView },
      focus: {
        characterId: focusedItem?.type === "character" ? focusedItem.id : undefined,
        characterName: focusedChar?.name,
        sceneId: focusedItem?.type === "scene" ? focusedItem.id : undefined,
        sceneName: focusedScene?.name,
        shotId: focusedItem?.type === "shot" ? focusedItem.id : undefined,
        selectedFile: selectedFile ?? undefined,
      },
      summary: {
        totalCharacters: characters?.length,
        totalScenes: scenesData?.scenes?.length,
        totalShots: totalShots || undefined,
        hasStyle: !!style,
        sourceFiles: sourceFiles?.map((f) => ({ name: f.name, path: f.path, size: f.size })),
      },
      availableViews: getAvailableViewsForAgent(),
    };
  }, [
    currentProject,
    currentTab,
    currentView,
    selectedFile,
    focusedItem,
    projects,
    characters,
    scenesData,
    shotsData,
    style,
    sourceFiles,
  ]);
}
