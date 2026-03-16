import useSWR from "swr";
import { api } from "../lib/api-client";

export function useWorkspaceRoot() {
  return useSWR("workspace-root", () => api.workspace.getRoot());
}

export function useProjects() {
  return useSWR("projects", () => api.workspace.projects());
}

export function useFileTree(project: string | null) {
  return useSWR(
    project ? `tree-${project}` : null,
    () => api.workspace.tree(project!, true),
    { refreshInterval: 5000 },
  );
}

export function useStyle(project: string | null) {
  return useSWR(project ? `style-${project}` : null, () =>
    api.workspace.style(project!),
  );
}

export function useCharacters(project: string | null) {
  return useSWR(project ? `chars-${project}` : null, () =>
    api.workspace.characters(project!),
  );
}

export function useScenes(project: string | null) {
  return useSWR(project ? `scenes-${project}` : null, () =>
    api.workspace.scenes(project!),
  );
}

export function useShots(project: string | null, sceneId?: string) {
  const key = project
    ? `shots-${project}${sceneId ? `-${sceneId}` : ""}`
    : null;
  return useSWR(key, () => api.workspace.shots(project!, sceneId));
}

export function useProps(project: string | null) {
  return useSWR(project ? `props-${project}` : null, () =>
    api.workspace.props(project!),
  );
}

export function useMedia(
  project: string | null,
  type: "images" | "audio" | "video",
) {
  return useSWR(project ? `media-${project}-${type}` : null, () =>
    api.workspace.media(project!, type),
  );
}

export function useSourceFiles(project: string | null) {
  return useSWR(project ? `source-${project}` : null, () =>
    api.workspace.sourceFiles(project!),
  );
}

export function useFileContent(path: string | null) {
  return useSWR(path ? `file-${path}` : null, () =>
    api.workspace.readFile(path!),
  );
}
