import { useEffect, useRef } from "react";
import { useSWRConfig } from "swr";

interface FileChangeEvent {
  type: "change" | "add" | "unlink";
  file: string;
  panel: string | null;
  project: string;
  timestamp: number;
}

const PANEL_TO_SWR_KEYS: Record<string, (project: string) => string[]> = {
  style: (p) => [`style-${p}`],
  characters: (p) => [`chars-${p}`],
  scenes: (p) => [`scenes-${p}`],
  shots: (p) => [`shots-${p}`],
  images: (p) => [`media-${p}-images`],
  audio: (p) => [`media-${p}-audio`],
  video: (p) => [`media-${p}-video`],
};

export function useWorkspaceSync(project: string | null) {
  const { mutate } = useSWRConfig();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!project) return;

    const es = new EventSource(`/api/workspace/watch?project=${encodeURIComponent(project)}`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const evt: FileChangeEvent = JSON.parse(e.data);
        if (evt.panel) {
          const keysFn = PANEL_TO_SWR_KEYS[evt.panel];
          if (keysFn) {
            for (const key of keysFn(project)) {
              mutate(key);
            }
          }
        }
        mutate(`tree-${project}`);
      } catch {}
    };

    es.onerror = () => {
      es.close();
      setTimeout(() => {
        if (esRef.current === es) {
          esRef.current = null;
        }
      }, 5000);
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [project, mutate]);
}
