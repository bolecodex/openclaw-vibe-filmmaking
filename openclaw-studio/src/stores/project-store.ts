import { create } from "zustand";
import type { TabType } from "../lib/types";

interface FocusedItem {
  type: string;
  id: string;
}

interface ProjectStore {
  currentProject: string | null;
  currentTab: TabType;
  currentView: "workspace" | "skills";
  selectedFile: string | null;
  expandedDirs: Set<string>;

  focusedItem: FocusedItem | null;

  setCurrentProject: (name: string | null) => void;
  setCurrentTab: (tab: TabType) => void;
  setCurrentView: (view: "workspace" | "skills") => void;
  setSelectedFile: (path: string | null) => void;
  toggleDir: (path: string) => void;
  setFocusedItem: (type: string, id: string) => void;
  clearFocus: () => void;
  getFocusedId: (type: string) => string | null;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  currentProject: null,
  currentTab: "dashboard",
  currentView: "workspace",
  selectedFile: null,
  expandedDirs: new Set<string>(),

  focusedItem: null,

  setCurrentProject: (name) =>
    set({
      currentProject: name,
      selectedFile: null,
      focusedItem: null,
    }),
  setCurrentTab: (tab) =>
    set({
      currentTab: tab,
      selectedFile: null,
      focusedItem: null,
    }),
  setCurrentView: (view) => set({ currentView: view }),
  setSelectedFile: (path) =>
    set({ selectedFile: path, currentTab: "file" }),
  toggleDir: (path) =>
    set((state) => {
      const next = new Set(state.expandedDirs);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return { expandedDirs: next };
    }),
  setFocusedItem: (type, id) => set({ focusedItem: { type, id } }),
  clearFocus: () => set({ focusedItem: null }),
  getFocusedId: (type) => {
    const item = get().focusedItem;
    return item?.type === type ? item.id : null;
  },
}));
