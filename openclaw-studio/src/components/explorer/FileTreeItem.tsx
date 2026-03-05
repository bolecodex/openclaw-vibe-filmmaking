import {
  ChevronRight,
  ChevronDown,
  Folder,
  FileText,
  Image,
  Music,
  Video,
  FileCode,
} from "lucide-react";
import type { FileEntry } from "../../lib/types";
import { useProjectStore } from "../../stores/project-store";

const ICON_MAP: Record<string, typeof FileText> = {
  yaml: FileCode,
  yml: FileCode,
  json: FileCode,
  md: FileText,
  html: FileCode,
  png: Image,
  jpg: Image,
  jpeg: Image,
  webp: Image,
  gif: Image,
  mp3: Music,
  wav: Music,
  m4a: Music,
  mp4: Video,
  webm: Video,
  mov: Video,
};

export function FileTreeItem({
  entry,
  depth = 0,
}: {
  entry: FileEntry;
  depth?: number;
}) {
  const { expandedDirs, toggleDir, selectedFile, setSelectedFile } =
    useProjectStore();

  const isExpanded = expandedDirs.has(entry.path);
  const isSelected = selectedFile === entry.path;
  const Icon =
    entry.type === "directory"
      ? Folder
      : ICON_MAP[entry.extension || ""] || FileText;

  function handleClick() {
    if (entry.type === "directory") {
      toggleDir(entry.path);
    } else {
      setSelectedFile(entry.path);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        className={`flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-xs hover:bg-white/5 ${
          isSelected ? "bg-white/10 text-white" : "text-gray-400"
        }`}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {entry.type === "directory" ? (
          isExpanded ? (
            <ChevronDown size={12} className="shrink-0 text-gray-600" />
          ) : (
            <ChevronRight size={12} className="shrink-0 text-gray-600" />
          )
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <Icon
          size={13}
          className={`shrink-0 ${entry.type === "directory" ? "text-yellow-600" : "text-gray-500"}`}
        />
        <span className="truncate">{entry.name}</span>
      </button>
      {entry.type === "directory" && isExpanded && entry.children && (
        <div>
          {entry.children.map((child) => (
            <FileTreeItem
              key={child.path}
              entry={child}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
