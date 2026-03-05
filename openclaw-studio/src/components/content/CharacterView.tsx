import { useCharacters, useScenes, useShots } from "../../hooks/use-api";
import { useProjectStore } from "../../stores/project-store";
import { api } from "../../lib/api-client";
import { resolveImageSrc } from "../../lib/asset-resolver";
import {
  Users,
  ChevronDown,
  ChevronRight,
  Copy,
  Pencil,
  Save,
  X,
  Film,
  Clapperboard,
  Check,
} from "lucide-react";
import { useState, useCallback } from "react";
import { useSWRConfig } from "swr";
import type { Character } from "../../lib/types";

const TYPE_COLORS: Record<string, string> = {
  主角: "bg-amber-500/20 text-amber-400",
  配角: "bg-blue-500/20 text-blue-400",
  群演: "bg-gray-500/20 text-gray-400",
  特殊: "bg-purple-500/20 text-purple-400",
};

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] ${TYPE_COLORS[type] ?? "bg-white/10 text-gray-400"}`}
    >
      {type}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300"
    >
      {copied ? <Check size={10} /> : <Copy size={10} />}
      {copied ? "已复制" : "复制"}
    </button>
  );
}

function CharacterDetail({
  char,
  project,
  relatedScenes,
  relatedShotCount,
  onNavigateScene,
}: {
  char: Character;
  project: string;
  relatedScenes: string[];
  relatedShotCount: number;
  onNavigateScene: (sceneId: string) => void;
}) {
  const { mutate } = useSWRConfig();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<Character>>({});
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setDraft({
      description: char.description,
      prompt: char.prompt,
      immutable_features: [...(char.immutable_features ?? [])],
    });
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setDraft({});
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.workspace.updateCharacter(project, char.id, draft);
      await mutate(`chars-${project}`);
      setEditing(false);
      setDraft({});
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 border-t border-white/5 bg-surface-1/50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-gray-600">{char.id}</span>
          <TypeBadge type={char.type} />
          {char.first_appearance && (
            <span className="text-[10px] text-gray-600">
              首次出场: {char.first_appearance}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {editing ? (
            <>
              <button
                onClick={cancel}
                className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-gray-400 hover:bg-white/5"
              >
                <X size={11} /> 取消
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-1 rounded bg-accent px-2 py-1 text-[11px] text-white disabled:opacity-50"
              >
                <Save size={11} /> {saving ? "..." : "保存"}
              </button>
            </>
          ) : (
            <button
              onClick={startEdit}
              className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-gray-500 hover:bg-white/5 hover:text-gray-300"
            >
              <Pencil size={11} /> 编辑
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        <div className="w-48 shrink-0">
          {(() => {
            const src = resolveImageSrc(project, char.image_url, char.image_path);
            return src ? (
              <img
                src={src}
                alt={char.name}
                className="w-full rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-64 items-center justify-center rounded-lg bg-surface-3 text-gray-600">
                <Users size={40} strokeWidth={1} />
              </div>
            );
          })()}
          {char.image_status && (
            <div className="mt-1 text-center">
              <span
                className={`text-[10px] ${char.image_status === "completed" ? "text-emerald-400" : "text-gray-500"}`}
              >
                {char.image_status === "completed" ? "已生成" : char.image_status}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <div>
            <div className="mb-1 text-[11px] font-medium text-gray-500">不可变特征</div>
            <div className="flex flex-wrap gap-1.5">
              {(editing ? draft.immutable_features : char.immutable_features)?.map(
                (f, i) => (
                  <span
                    key={i}
                    className="rounded-md bg-white/5 px-2 py-1 text-[11px] text-gray-400"
                  >
                    {f}
                  </span>
                ),
              )}
            </div>
          </div>

          <div>
            <div className="mb-1 text-[11px] font-medium text-gray-500">描述</div>
            {editing ? (
              <textarea
                value={draft.description ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, description: e.target.value }))
                }
                rows={3}
                className="w-full rounded-md border border-white/10 bg-surface-3 px-2.5 py-1.5 text-xs text-gray-200 outline-none focus:border-accent/50"
              />
            ) : (
              <p className="text-xs leading-relaxed text-gray-400">
                {char.description}
              </p>
            )}
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] font-medium text-gray-500">提示词</span>
              {!editing && char.prompt && <CopyButton text={char.prompt} />}
            </div>
            {editing ? (
              <textarea
                value={draft.prompt ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, prompt: e.target.value }))
                }
                rows={4}
                className="w-full rounded-md border border-white/10 bg-surface-3 px-2.5 py-1.5 font-mono text-[11px] text-gray-200 outline-none focus:border-accent/50"
              />
            ) : (
              <p className="rounded-md bg-surface-3/50 px-2.5 py-1.5 font-mono text-[11px] leading-relaxed text-gray-500">
                {char.prompt}
              </p>
            )}
          </div>

          {(relatedScenes.length > 0 || relatedShotCount > 0) && (
            <div className="flex flex-wrap items-center gap-2 border-t border-white/5 pt-2">
              {relatedScenes.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Film size={11} className="text-gray-600" />
                  <span className="text-[10px] text-gray-600">出场场景:</span>
                  {relatedScenes.map((sid) => (
                    <button
                      key={sid}
                      onClick={() => onNavigateScene(sid)}
                      className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-gray-400 transition-colors hover:bg-accent/20 hover:text-accent"
                    >
                      {sid}
                    </button>
                  ))}
                </div>
              )}
              {relatedShotCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <Clapperboard size={11} className="text-gray-600" />
                  <span className="text-[10px] text-gray-600">
                    关联分镜: {relatedShotCount} 个
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CharacterView({ project }: { project: string }) {
  const { data: characters, isLoading } = useCharacters(project);
  const { data: scenesData } = useScenes(project);
  const { data: shotsData } = useShots(project);
  const setCurrentTab = useProjectStore((s) => s.setCurrentTab);
  const expandedId = useProjectStore((s) => s.getFocusedId("character"));
  const setExpandedId = (id: string | null) => {
    const store = useProjectStore.getState();
    if (id) store.setFocusedItem("character", id);
    else store.clearFocus();
  };
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const scenes = scenesData?.scenes ?? [];
  const shotScenes = shotsData?.scenes ?? [];

  const getRelatedScenes = useCallback(
    (charName: string): string[] => {
      return scenes
        .filter((s) => s.main_characters?.includes(charName))
        .map((s) => s.id);
    },
    [scenes],
  );

  const getRelatedShotCount = useCallback(
    (charId: string): number => {
      let count = 0;
      for (const scene of shotScenes) {
        for (const shot of scene.shots) {
          if (shot.characters?.some((c) => c.ref === charId)) {
            count++;
          }
        }
      }
      return count;
    },
    [shotScenes],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-600">
        <span className="text-sm">加载中...</span>
      </div>
    );
  }

  if (!characters || characters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-gray-600">
        <Users size={32} strokeWidth={1} />
        <p className="text-sm">暂无角色数据</p>
        <p className="text-xs">在 Agent 中输入「提取角色」开始</p>
      </div>
    );
  }

  const types = [...new Set(characters.map((c) => c.type))];
  const filtered = typeFilter
    ? characters.filter((c) => c.type === typeFilter)
    : characters;

  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2">
        <Users size={14} className="text-accent" />
        <span className="text-xs font-medium text-gray-300">
          角色资产 ({characters.length})
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setTypeFilter(null)}
            className={`rounded px-2 py-0.5 text-[10px] transition-colors ${!typeFilter ? "bg-accent/20 text-accent" : "text-gray-500 hover:text-gray-300"}`}
          >
            全部
          </button>
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t === typeFilter ? null : t)}
              className={`rounded px-2 py-0.5 text-[10px] transition-colors ${typeFilter === t ? "bg-accent/20 text-accent" : "text-gray-500 hover:text-gray-300"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {filtered.map((char) => (
          <div
            key={char.id}
            className={`group flex flex-col overflow-hidden rounded-lg border transition-colors ${
              expandedId === char.id
                ? "border-accent/30 bg-surface-2"
                : "border-white/5 bg-surface-2 hover:border-white/10"
            }`}
          >
            <button
              onClick={() =>
                setExpandedId(expandedId === char.id ? null : char.id)
              }
              data-character-id={char.id}
              className="flex flex-col text-left"
            >
              {(() => {
                const src = resolveImageSrc(project, char.image_url, char.image_path);
                return src ? (
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface-3">
                    <img
                      src={src}
                      alt={char.name}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[3/4] items-center justify-center bg-surface-3 text-gray-600">
                    <Users size={32} strokeWidth={1} />
                  </div>
                );
              })()}
              <div className="flex flex-col gap-1 p-2.5">
                <div className="flex items-center gap-1.5">
                  <h3 className="truncate text-sm font-medium text-white">{char.name}</h3>
                  <TypeBadge type={char.type} />
                  <span className="ml-auto shrink-0 text-gray-600">
                    {expandedId === char.id ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                  </span>
                </div>
                <p className="line-clamp-2 text-[11px] leading-relaxed text-gray-500">
                  {char.description}
                </p>
                <div className="flex flex-wrap gap-1">
                  {char.immutable_features?.slice(0, 3).map((f, i) => (
                    <span
                      key={i}
                      className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-500"
                    >
                      {f}
                    </span>
                  ))}
                  {(char.immutable_features?.length ?? 0) > 3 && (
                    <span className="text-[10px] text-gray-600">
                      +{(char.immutable_features?.length ?? 0) - 3}
                    </span>
                  )}
                </div>
              </div>
            </button>
          </div>
        ))}
      </div>

      {expandedId && (
        <div className="mx-4 mb-4 overflow-hidden rounded-lg border border-white/5 bg-surface-2">
          {(() => {
            const char = characters.find((c) => c.id === expandedId);
            if (!char) return null;
            return (
              <CharacterDetail
                char={char}
                project={project}
                relatedScenes={getRelatedScenes(char.name)}
                relatedShotCount={getRelatedShotCount(char.id)}
                onNavigateScene={() => setCurrentTab("scenes")}
              />
            );
          })()}
        </div>
      )}
    </div>
  );
}
