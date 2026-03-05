import { useMemo, useCallback } from "react";
import { useCharacters, useScenes, useShots, useFileTree } from "./use-api";
import { useSkills } from "./use-skills";
import { fuzzyMatch } from "../lib/mention-utils";
import type { MentionItem, MentionType, FileEntry } from "../lib/types";

function flattenFiles(entries: FileEntry[], prefix = ""): { name: string; path: string }[] {
  const result: { name: string; path: string }[] = [];
  for (const entry of entries) {
    const p = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.type === "file") {
      result.push({ name: entry.name, path: p });
    }
    if (entry.children) {
      result.push(...flattenFiles(entry.children, p));
    }
  }
  return result;
}

export function useMentions(project: string | null) {
  const { data: characters } = useCharacters(project);
  const { data: scenesData } = useScenes(project);
  const { data: shotsData } = useShots(project);
  const { data: fileTree } = useFileTree(project);
  const { data: skills } = useSkills();

  const allItems = useMemo<MentionItem[]>(() => {
    const items: MentionItem[] = [];

    if (fileTree) {
      const files = flattenFiles(fileTree);
      for (const f of files) {
        items.push({
          type: "file",
          id: f.path,
          label: f.name,
          subtitle: f.path,
        });
      }
    }

    if (characters) {
      for (const c of characters) {
        items.push({
          type: "character",
          id: c.id,
          label: c.name,
          subtitle: c.type,
        });
      }
    }

    if (scenesData?.scenes) {
      for (const s of scenesData.scenes) {
        items.push({
          type: "scene",
          id: s.id,
          label: `${s.id} ${s.name}`,
          subtitle: `${s.location} · ${s.line_count}行`,
        });
      }
    }

    if (shotsData?.scenes) {
      for (const scene of shotsData.scenes) {
        for (const shot of scene.shots) {
          items.push({
            type: "shot",
            id: shot.id,
            label: `${shot.id} ${shot.title}`,
            subtitle: shot.shot_type,
          });
        }
      }
    }

    if (skills) {
      for (const sk of skills) {
        items.push({
          type: "skill",
          id: sk.name,
          label: sk.displayName || sk.name,
          subtitle: sk.description?.slice(0, 50),
        });
      }
    }

    return items;
  }, [characters, scenesData, shotsData, fileTree, skills]);

  const search = useCallback(
    (query: string, category?: MentionType): MentionItem[] => {
      let items = allItems;
      if (category) {
        items = items.filter((item) => item.type === category);
      }
      if (!query) return items;
      return items.filter(
        (item) =>
          fuzzyMatch(item.label, query) ||
          (item.subtitle && fuzzyMatch(item.subtitle, query)),
      );
    },
    [allItems],
  );

  return { allItems, search };
}
