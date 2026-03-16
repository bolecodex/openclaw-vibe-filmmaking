import { useMemo, useCallback } from "react";
import { useCharacters, useScenes, useShots, useFileTree, useMedia } from "./use-api";
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
  const { data: audioMedia } = useMedia(project, "audio");
  const { data: videoMedia } = useMedia(project, "video");
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
          // 与「音频」Tab 一致：每条已生成配音的台词都可被 @
          if (shot.lines?.length) {
            for (let i = 0; i < shot.lines.length; i++) {
              const line = shot.lines[i];
              if (line.audio_status !== "completed" || (!line.audio_path && !line.audio_url)) continue;
              const path = line.audio_path || line.audio_url || `${shot.id}_line_${i}`;
              const label = line.speaker ? `${line.speaker}: ${(line.text ?? "").slice(0, 20)}` : (line.text ?? shot.id).slice(0, 24);
              items.push({
                type: "audio",
                id: path,
                label: label + (label.length >= 20 ? "…" : ""),
                subtitle: `${shot.id}`,
              });
            }
          } else if (shot.audio_status === "completed" && (shot.audio_path || shot.audio_url)) {
            const path = shot.audio_path || shot.audio_url!;
            items.push({
              type: "audio",
              id: path,
              label: shot.title?.replace(/\*\*/g, "").slice(0, 28) || shot.id,
              subtitle: shot.id,
            });
          }
          // 与「视频」Tab 一致：每个已生成视频的分镜都可被 @
          if (shot.video_status === "completed" && (shot.video_path || shot.video_url)) {
            const path = shot.video_path || shot.video_url!;
            items.push({
              type: "video",
              id: path,
              label: (shot.title?.replace(/\*\*/g, "").slice(0, 28) || shot.id),
              subtitle: shot.id,
            });
          }
        }
      }
    }

    const audioIds = new Set(items.filter((i) => i.type === "audio").map((i) => i.id));
    if (audioMedia?.length) {
      for (const m of audioMedia) {
        if (audioIds.has(m.path)) continue;
        audioIds.add(m.path);
        const kb = (m.size / 1024).toFixed(1);
        const date = m.mtime ? new Date(m.mtime).toLocaleDateString("zh-CN", { month: "short", day: "numeric" }) : "";
        items.push({
          type: "audio",
          id: m.path,
          label: m.name,
          subtitle: date ? `${kb} KB · ${date}` : `${kb} KB`,
        });
      }
    }

    const videoIds = new Set(items.filter((i) => i.type === "video").map((i) => i.id));
    if (videoMedia?.length) {
      for (const m of videoMedia) {
        if (videoIds.has(m.path)) continue;
        videoIds.add(m.path);
        const kb = (m.size / 1024).toFixed(1);
        const date = m.mtime ? new Date(m.mtime).toLocaleDateString("zh-CN", { month: "short", day: "numeric" }) : "";
        items.push({
          type: "video",
          id: m.path,
          label: m.name,
          subtitle: date ? `${kb} KB · ${date}` : `${kb} KB`,
        });
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
  }, [characters, scenesData, shotsData, fileTree, audioMedia, videoMedia, skills]);

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
