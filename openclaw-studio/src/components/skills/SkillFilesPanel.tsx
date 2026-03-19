import useSWR from "swr";
import { FileText, FolderOpen, Copy, Check } from "lucide-react";
import { useState } from "react";
import { api } from "../../lib/api-client";
function fullSkillPath(root: string, rel: string) {
  const a = root.replace(/[/\\]+$/, "");
  return `${a}/${rel.replace(/^[/\\]+/, "")}`;
}

type FileEntry = { path: string; type: "file" | "dir" };

export function SkillFilesPanel({ skillName }: { skillName: string }) {
  const { data, error, isLoading } = useSWR(
    skillName ? `skill-files-${skillName}` : null,
    () =>
      api.skills.listFiles(skillName) as Promise<{
        entries: FileEntry[];
        skillRoot?: string;
      }>,
  );
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (fullPath: string, key: string) => {
    try {
      await navigator.clipboard.writeText(fullPath);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  };

  if (isLoading) {
    return <p className="text-sm text-gray-500">加载文件列表…</p>;
  }
  if (error || !data?.entries?.length) {
    return (
      <div className="rounded-lg border border-white/10 bg-surface-2/50 p-4 text-sm text-gray-400">
        <p className="mb-2 font-medium text-gray-300">SKILL.md</p>
        <p>该技能目录下暂无 scripts / references 子文件，或无法读取列表。</p>
      </div>
    );
  }

  const root = data.skillRoot ?? "";

  return (
    <div className="space-y-3">
      {root ? (
        <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-surface-2/30 px-3 py-2">
          <FolderOpen className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
              技能根目录
            </div>
            <code className="mt-1 block break-all text-[12px] text-gray-400">{root}</code>
          </div>
          <button
            type="button"
            onClick={() => copy(root, "root")}
            className="shrink-0 rounded p-1.5 text-gray-500 hover:bg-white/10 hover:text-gray-300"
            title="复制路径"
          >
            {copied === "root" ? (
              <Check className="h-4 w-4 text-emerald-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
      ) : null}

      <ul className="divide-y divide-white/5 rounded-lg border border-white/10 bg-surface-1/50">
        {data.entries.map((e) => {
          const full = root ? fullSkillPath(root, e.path) : e.path;
          const key = e.path;
          return (
            <li
              key={key}
              className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-white/[0.02]"
            >
              <FileText className="h-4 w-4 shrink-0 text-indigo-400/70" />
              <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-gray-300">
                {e.path}
              </span>
              <button
                type="button"
                onClick={() => copy(full, key)}
                className="shrink-0 rounded p-1 text-gray-500 hover:bg-white/10 hover:text-gray-300"
                title="复制完整路径"
              >
                {copied === key ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
