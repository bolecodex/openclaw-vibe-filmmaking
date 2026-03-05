import { useState } from "react";
import { X } from "lucide-react";
import { api } from "../../lib/api-client";
import { useSkills } from "../../hooks/use-skills";

interface SkillImportDialogProps {
  open: boolean;
  onClose: () => void;
}

const TABS = [
  { id: "clawhub" as const, label: "ClawHub" },
  { id: "github" as const, label: "GitHub" },
  { id: "url" as const, label: "URL" },
];

export function SkillImportDialog({ open, onClose }: SkillImportDialogProps) {
  const [activeTab, setActiveTab] = useState<"clawhub" | "github" | "url">("clawhub");
  const [clawhubSlug, setClawhubSlug] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [directUrl, setDirectUrl] = useState("");
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { mutate: refreshSkills } = useSkills();

  const handleInstall = async () => {
    setError(null);
    setInstalling(true);
    try {
      if (activeTab === "clawhub") {
        if (!clawhubSlug.trim()) {
          setError("请输入 ClawHub slug");
          return;
        }
        await api.skills.install({ source: "clawhub", slug: clawhubSlug.trim() });
        refreshSkills();
      } else if (activeTab === "github") {
        if (!githubUrl.trim()) {
          setError("请输入 GitHub 仓库地址");
          return;
        }
        await api.skills.install({ source: "github", url: githubUrl.trim() });
        refreshSkills();
      } else {
        if (!directUrl.trim()) {
          setError("请输入 Skill URL");
          return;
        }
        await api.skills.install({ source: "url", url: directUrl.trim() });
        refreshSkills();
      }
      setClawhubSlug("");
      setGithubUrl("");
      setDirectUrl("");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "安装失败");
    } finally {
      setInstalling(false);
    }
  };

  const getInputValue = () => {
    if (activeTab === "clawhub") return clawhubSlug;
    if (activeTab === "github") return githubUrl;
    return directUrl;
  };

  const setInputValue = (v: string) => {
    if (activeTab === "clawhub") setClawhubSlug(v);
    else if (activeTab === "github") setGithubUrl(v);
    else setDirectUrl(v);
  };

  const getPlaceholder = () => {
    if (activeTab === "clawhub") return "例如：my-org/my-skill";
    if (activeTab === "github") return "https://github.com/owner/repo";
    return "https://example.com/skill.zip";
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-surface-1 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
          <h3 className="text-lg font-semibold text-gray-100">导入 Skill</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-2 text-gray-400 hover:bg-surface-2 hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="mb-4 flex gap-1 rounded-lg bg-surface-2 p-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-surface-3 text-gray-100"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={getInputValue()}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={getPlaceholder()}
            className="mb-4 w-full rounded-lg border border-white/10 bg-surface-2 px-3 py-2 text-gray-100 placeholder-gray-500 focus:border-accent focus:outline-none"
          />

          {error && (
            <p className="mb-4 text-sm text-red-400">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-white/5 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-300 hover:bg-surface-2"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleInstall}
            disabled={installing}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {installing ? "安装中..." : "安装"}
          </button>
        </div>
      </div>
    </div>
  );
}
