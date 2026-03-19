import { create } from "zustand";

export type SkillTab = "system" | "installed" | "marketplace" | "all";

interface SkillsStore {
  selectedSkill: string | null;
  searchQuery: string;
  activeTab: SkillTab;
  setSelectedSkill: (name: string | null) => void;
  setSearchQuery: (q: string) => void;
  setActiveTab: (tab: SkillTab) => void;
}

export const useSkillsStore = create<SkillsStore>((set) => ({
  selectedSkill: null,
  searchQuery: "",
  activeTab: "all",
  setSelectedSkill: (name) => set({ selectedSkill: name }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
