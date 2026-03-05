import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChatMessage } from "../lib/types";

export interface TokenUsage {
  input: number;
  output: number;
  total: number;
  context: number;
}

export interface ChatSession {
  id: string;
  sessionKey: string;
  projectPath: string;
  title: string | null;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  tokenUsage: TokenUsage;
}

interface ChatStore {
  sessionsByProject: Record<string, ChatSession[]>;
  activeSessionId: string | null;
  messages: ChatMessage[];
  loading: boolean;

  setMessages: (msgs: ChatMessage[]) => void;
  updateMessages: (fn: (prev: ChatMessage[]) => ChatMessage[]) => void;

  setActiveSession: (id: string | null) => void;
  setSessions: (projectPath: string, sessions: ChatSession[]) => void;
  addSession: (session: ChatSession) => void;
  removeSession: (projectPath: string, sessionId: string) => void;
  renameSession: (projectPath: string, sessionId: string, title: string) => void;
  updateTokenUsage: (projectPath: string, sessionId: string, usage: TokenUsage) => void;
  bumpSessionActivity: (projectPath: string, sessionId: string) => void;
  setLoading: (v: boolean) => void;
  clearSessionMessages: () => void;

  getActiveSession: () => ChatSession | null;
  getProjectSessions: (projectPath: string) => ChatSession[];
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      sessionsByProject: {},
      activeSessionId: null,
      messages: [],
      loading: false,

      setMessages: (msgs) => set({ messages: msgs }),
      updateMessages: (fn) => set((s) => ({ messages: fn(s.messages) })),

      setActiveSession: (id) => set({ activeSessionId: id, messages: [] }),

      setSessions: (projectPath, sessions) =>
        set((s) => ({
          sessionsByProject: { ...s.sessionsByProject, [projectPath]: sessions },
        })),

      addSession: (session) =>
        set((s) => {
          const list = s.sessionsByProject[session.projectPath] ?? [];
          return {
            sessionsByProject: {
              ...s.sessionsByProject,
              [session.projectPath]: [session, ...list],
            },
            activeSessionId: session.id,
            messages: [],
          };
        }),

      removeSession: (projectPath, sessionId) =>
        set((s) => {
          const list = (s.sessionsByProject[projectPath] ?? []).filter(
            (ses) => ses.id !== sessionId,
          );
          const wasActive = s.activeSessionId === sessionId;
          return {
            sessionsByProject: { ...s.sessionsByProject, [projectPath]: list },
            activeSessionId: wasActive ? (list[0]?.id ?? null) : s.activeSessionId,
            messages: wasActive ? [] : s.messages,
          };
        }),

      renameSession: (projectPath, sessionId, title) =>
        set((s) => {
          const list = (s.sessionsByProject[projectPath] ?? []).map((ses) =>
            ses.id === sessionId ? { ...ses, title } : ses,
          );
          return {
            sessionsByProject: { ...s.sessionsByProject, [projectPath]: list },
          };
        }),

      updateTokenUsage: (projectPath, sessionId, usage) =>
        set((s) => {
          const list = (s.sessionsByProject[projectPath] ?? []).map((ses) =>
            ses.id === sessionId ? { ...ses, tokenUsage: usage, updatedAt: Date.now() } : ses,
          );
          return {
            sessionsByProject: { ...s.sessionsByProject, [projectPath]: list },
          };
        }),

      bumpSessionActivity: (projectPath, sessionId) =>
        set((s) => {
          const list = (s.sessionsByProject[projectPath] ?? []).map((ses) =>
            ses.id === sessionId
              ? { ...ses, updatedAt: Date.now(), messageCount: ses.messageCount + 1 }
              : ses,
          );
          return {
            sessionsByProject: { ...s.sessionsByProject, [projectPath]: list },
          };
        }),

      setLoading: (v) => set({ loading: v }),

      clearSessionMessages: () => set({ messages: [] }),

      getActiveSession: () => {
        const s = get();
        if (!s.activeSessionId) return null;
        for (const list of Object.values(s.sessionsByProject)) {
          const found = list.find((ses) => ses.id === s.activeSessionId);
          if (found) return found;
        }
        return null;
      },

      getProjectSessions: (projectPath) => get().sessionsByProject[projectPath] ?? [],
    }),
    {
      name: "openclaw-chat-sessions",
      partialize: (state) => ({
        sessionsByProject: state.sessionsByProject,
        activeSessionId: state.activeSessionId,
      }),
    },
  ),
);
