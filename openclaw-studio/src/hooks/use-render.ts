import { useState, useCallback, useRef, useEffect } from "react";

export interface RenderConfig {
  project: string;
  scene?: string;
  width?: number;
  height?: number;
  fps?: number;
  transition?: "fade" | "wipe" | "slide" | "none";
  transitionFrames?: number;
  kenburns?: boolean;
  subtitles?: boolean;
}

export interface RenderEvent {
  type: "progress" | "done" | "error";
  phase: string;
  progress: number;
  message: string;
  outputPath?: string;
  outputSize?: number;
}

export interface RenderState {
  isRendering: boolean;
  taskId: string | null;
  phase: string;
  progress: number;
  message: string;
  outputPath: string | null;
  outputSize: number | null;
  error: string | null;
}

const INITIAL_STATE: RenderState = {
  isRendering: false,
  taskId: null,
  phase: "",
  progress: 0,
  message: "",
  outputPath: null,
  outputSize: null,
  error: null,
};

export function useRenderTask() {
  const [state, setState] = useState<RenderState>(INITIAL_STATE);
  const eventSourceRef = useRef<EventSource | null>(null);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const startRender = useCallback(
    async (config: RenderConfig) => {
      cleanup();
      setState({ ...INITIAL_STATE, isRendering: true, message: "提交渲染任务..." });

      try {
        const res = await fetch("/api/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`${res.status}: ${text}`);
        }

        const { taskId } = await res.json();
        setState((s) => ({ ...s, taskId }));

        const es = new EventSource(`/api/render/progress?taskId=${taskId}`);
        eventSourceRef.current = es;

        es.onmessage = (e) => {
          if (e.data === "[DONE]") {
            es.close();
            return;
          }

          try {
            const event: RenderEvent = JSON.parse(e.data);

            if (event.type === "progress") {
              setState((s) => ({
                ...s,
                phase: event.phase,
                progress: event.progress,
                message: event.message,
              }));
            } else if (event.type === "done") {
              setState((s) => ({
                ...s,
                isRendering: false,
                phase: "done",
                progress: 100,
                message: event.message,
                outputPath: event.outputPath ?? null,
                outputSize: event.outputSize ?? null,
              }));
              es.close();
            } else if (event.type === "error") {
              setState((s) => ({
                ...s,
                isRendering: false,
                phase: "error",
                error: event.message,
                message: event.message,
              }));
              es.close();
            }
          } catch {}
        };

        es.onerror = () => {
          setState((s) => ({
            ...s,
            isRendering: false,
            error: "连接中断",
          }));
          es.close();
        };
      } catch (err) {
        setState((s) => ({
          ...s,
          isRendering: false,
          error: (err as Error).message,
        }));
      }
    },
    [cleanup],
  );

  const reset = useCallback(() => {
    cleanup();
    setState(INITIAL_STATE);
  }, [cleanup]);

  return { ...state, startRender, reset };
}
