import { useState, useCallback, useRef } from "react";
import type {
  ChatMessage,
  AgentContext,
  ImageAttachment,
  MentionRef,
  ToolCallInfo,
  UiActionRecord,
} from "../lib/types";
import { isValidViewId, FOCUS_TYPE_TO_VIEW, VIEW_MAP } from "../lib/ui-registry";
import { useProjectStore } from "../stores/project-store";
import { useChatStore, type TokenUsage } from "../stores/chat-store";

let msgId = 0;

export interface SendMessageOptions {
  text: string;
  projectDir?: string | null;
  context?: AgentContext | null;
  attachments?: ImageAttachment[];
  mentions?: MentionRef[];
  sessionId?: string | null;
}

interface SSEPayload {
  type?: "text" | "thinking" | "tool_start" | "tool_update" | "tool_output" | "lifecycle" | "error" | "done" | "ui_action" | "usage";
  content?: string;
  text?: string;
  toolCall?: {
    id: string;
    title: string;
    status: string;
    input?: string;
    output?: string;
  };
  phase?: string;
  error?: string;
  uiAction?: {
    action: string;
    target: string;
  };
  usage?: TokenUsage;
}

export function useChat(
  onComplete?: () => void,
  onUiAction?: (action: string, target: string) => void,
) {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const messages = useChatStore((s) => s.messages);
  const setMessages = useChatStore((s) => s.updateMessages);
  const setRawMessages = useChatStore((s) => s.setMessages);

  const sendMessage = useCallback(
    async (opts: SendMessageOptions) => {
      const { text, projectDir, context, attachments, mentions, sessionId } = opts;

      const userMsg: ChatMessage = {
        id: `msg-${++msgId}`,
        role: "user",
        content: text,
        timestamp: Date.now(),
        attachments: attachments?.length ? attachments : undefined,
        mentions: mentions?.length ? mentions : undefined,
      };

      const assistantMsg: ChatMessage = {
        id: `msg-${++msgId}`,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      const projectPath = context?.project?.path;
      if (projectPath && sessionId) {
        useChatStore.getState().bumpSessionActivity(projectPath, sessionId);
      }

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            projectDir: projectDir || undefined,
            context: context || undefined,
            attachments: attachments?.length ? attachments : undefined,
            references: mentions?.length ? mentions : undefined,
            sessionId: sessionId || undefined,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errText = await res.text();
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, content: `Error: ${errText}` }
                : m,
            ),
          );
          return;
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) return;

        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed: SSEPayload = JSON.parse(data);
              applySSEEvent(assistantMsg.id, parsed, projectPath, sessionId);
            } catch {
              applySSEEvent(assistantMsg.id, { content: data });
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, content: `连接失败: ${(err as Error).message}` }
                : m,
            ),
          );
        }
      } finally {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== assistantMsg.id || !m.toolCalls?.length) return m;
            const hasRunning = m.toolCalls.some((tc) => tc.status === "running");
            if (!hasRunning) return m;
            return {
              ...m,
              toolCalls: m.toolCalls.map((tc) =>
                tc.status === "running" ? { ...tc, status: "completed" as const } : tc,
              ),
            };
          }),
        );
        setIsStreaming(false);
        abortRef.current = null;
        onComplete?.();
        // 后端/Agent 可能在流结束后才写入分镜图等文件，延迟再拉一次以更新界面
        if (onComplete) setTimeout(onComplete, 2500);
      }
    },
    [onComplete, onUiAction, setMessages],
  );

  function applySSEEvent(
    targetMsgId: string,
    payload: SSEPayload,
    projectPath?: string | null,
    sessionId?: string | null,
  ): void {
    const eventType = payload.type;

    if (!eventType || eventType === "text") {
      const chunk = payload.content || payload.text || "";
      if (!chunk) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === targetMsgId ? { ...m, content: m.content + chunk } : m,
        ),
      );
      return;
    }

    if (eventType === "thinking") {
      const chunk = payload.content || "";
      if (!chunk) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === targetMsgId
            ? { ...m, thinking: (m.thinking ?? "") + chunk }
            : m,
        ),
      );
      return;
    }

    if (eventType === "tool_start" && payload.toolCall) {
      const tc: ToolCallInfo = {
        id: payload.toolCall.id,
        title: payload.toolCall.title,
        status: "running",
        input: payload.toolCall.input,
      };
      setMessages((prev) =>
        prev.map((m) =>
          m.id === targetMsgId
            ? { ...m, toolCalls: [...(m.toolCalls ?? []), tc] }
            : m,
        ),
      );
      return;
    }

    if (eventType === "tool_update" && payload.toolCall) {
      const { id, title, status, output } = payload.toolCall;
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== targetMsgId) return m;
          const calls = m.toolCalls ?? [];
          const hasIdMatch = calls.some((tc) => tc.id === id);
          return {
            ...m,
            toolCalls: calls.map((tc) => {
              const match = hasIdMatch
                ? tc.id === id
                : tc.title === title && tc.status === "running";
              if (!match) return tc;
              return {
                ...tc,
                status: (status === "completed" || status === "failed"
                  ? status
                  : tc.status) as ToolCallInfo["status"],
                output: output ?? tc.output,
              };
            }),
          };
        }),
      );
      return;
    }

    if (eventType === "tool_output" && payload.toolCall) {
      const { id, title } = payload.toolCall;
      const chunk = payload.content ?? "";
      if (!chunk) return;
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== targetMsgId) return m;
          const calls = m.toolCalls ?? [];
          const hasIdMatch = calls.some((tc) => tc.id === id);
          return {
            ...m,
            toolCalls: calls.map((tc) => {
              const match = hasIdMatch
                ? tc.id === id
                : tc.title === title && tc.status === "running";
              if (!match) return tc;
              return { ...tc, output: (tc.output ?? "") + chunk };
            }),
          };
        }),
      );
      return;
    }

    if (eventType === "ui_action" && payload.uiAction) {
      const { action, target } = payload.uiAction;
      const store = useProjectStore.getState();
      let label = "";

      if (action === "navigate" && isValidViewId(target)) {
        store.setCurrentTab(target);
        label = `切换到 ${VIEW_MAP.get(target)?.label ?? target}`;
      } else if (action === "focus" && target.includes(":")) {
        const sepIdx = target.indexOf(":");
        const focusType = target.slice(0, sepIdx);
        const focusId = target.slice(sepIdx + 1);
        const view = FOCUS_TYPE_TO_VIEW.get(focusType);
        if (view) {
          store.setCurrentTab(view.id);
          store.setFocusedItem(focusType, focusId);
          label = `聚焦 ${view.focusable?.labelSingular ?? focusType} ${focusId}`;
        }
      }

      if (label) {
        const record: UiActionRecord = { action, target, label };
        setMessages((prev) =>
          prev.map((m) =>
            m.id === targetMsgId
              ? { ...m, uiActions: [...(m.uiActions ?? []), record] }
              : m,
          ),
        );
      }
      // Refetch relevant data so UI (e.g. character image) updates after agent edits
      onUiAction?.(action, target);
      return;
    }

    if (eventType === "usage" && payload.usage) {
      if (projectPath && sessionId) {
        useChatStore.getState().updateTokenUsage(projectPath, sessionId, payload.usage);
      }
      return;
    }

    if (eventType === "error") {
      const errMsg = payload.error || "Unknown error";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === targetMsgId
            ? {
                ...m,
                content: m.content
                  ? m.content + `\n\n**Error:** ${errMsg}`
                  : `Error: ${errMsg}`,
              }
            : m,
        ),
      );
    }
  }

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearMessages = useCallback(() => {
    setRawMessages([]);
  }, [setRawMessages]);

  return { messages, isStreaming, sendMessage, stopStreaming, clearMessages };
}
