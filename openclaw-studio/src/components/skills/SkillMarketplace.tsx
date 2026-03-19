import { useState } from "react";
import { Download, Search } from "lucide-react";
import { useMarketplaceSearch } from "../../hooks/use-skills";
import { api } from "../../lib/api-client";
import { useSkills } from "../../hooks/use-skills";
import type { MarketplaceSkill } from "../../lib/types";

export function SkillMarketplace() {
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const { data: results = [] } = useMarketplaceSearch(searchTerm);
  const { mutate: refreshSkills } = useSkills();

  const handleSearch = () => {
    setSearchTerm(query.trim());
  };

  const handleInstall = async (slug: string) => {
    try {
      await api.skills.install({ source: "clawhub", slug });
      refreshSkills();
    } catch {
      // Error handling could be improved with toast
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="搜索市场..."
            className="w-full rounded-lg border border-white/10 bg-surface-2 py-2 pl-9 pr-3 text-sm text-gray-100 placeholder-gray-500 focus:border-accent focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
        >
          搜索
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {results.map((skill) => (
          <MarketplaceCard
            key={skill.slug}
            skill={skill}
            onInstall={() => handleInstall(skill.slug)}
          />
        ))}
      </div>

      {searchTerm && results.length === 0 && (
        <p className="py-8 text-center text-sm text-gray-500">
          未找到相关 Skill
        </p>
      )}

      {!searchTerm && (
        <p className="py-8 text-center text-sm text-gray-500">
          输入关键词搜索市场中的 Skill
        </p>
      )}
    </div>
  );
}

function MarketplaceCard({
  skill,
  onInstall,
}: {
  skill: MarketplaceSkill;
  onInstall: () => void;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-surface-2 p-4">
      <h4 className="font-medium text-gray-100">{skill.displayName || skill.name}</h4>
      <p className="mt-1 line-clamp-2 text-sm text-gray-400">{skill.description}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {skill.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="rounded bg-surface-3 px-1.5 py-0.5 text-xs text-gray-400"
          >
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {skill.author} · {skill.downloads} 下载
        </span>
        <button
          type="button"
          onClick={onInstall}
          disabled={skill.installed}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 disabled:hover:bg-accent"
        >
          <Download className="h-4 w-4" />
          {skill.installed ? "已安装" : "安装"}
        </button>
      </div>
    </div>
  );
}
