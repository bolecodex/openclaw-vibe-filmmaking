import { useStyle } from "../../hooks/use-api";
import { api } from "../../lib/api-client";
import { Palette, Save, Pencil, X } from "lucide-react";
import { useState, useCallback } from "react";
import { useSWRConfig } from "swr";
import type { StyleConfig } from "../../lib/types";

function EditableTextarea({
  label,
  value,
  editing,
  onChange,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-medium text-gray-400">{label}</label>
      {editing ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-white/10 bg-surface-3 px-3 py-2 text-xs text-gray-200 outline-none transition-colors focus:border-accent/50"
        />
      ) : (
        <div className="rounded-md border border-white/5 bg-surface-3/50 px-3 py-2 text-xs leading-relaxed text-gray-300">
          {value || <span className="italic text-gray-600">未设置</span>}
        </div>
      )}
    </div>
  );
}

function KVRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 px-3 py-2 last:border-b-0">
      <span className="text-[11px] text-gray-500">{label}</span>
      <span className="text-xs text-gray-300">{value}</span>
    </div>
  );
}

export function StylePanel({ project }: { project: string }) {
  const { data: style, isLoading } = useStyle(project);
  const { mutate } = useSWRConfig();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<StyleConfig>>({});
  const [saving, setSaving] = useState(false);

  const startEdit = useCallback(() => {
    setDraft({
      style_base: style?.style_base ?? "",
      style_base_character: style?.style_base_character ?? "",
      negative_prompt: style?.negative_prompt ?? "",
    });
    setEditing(true);
  }, [style]);

  const cancel = useCallback(() => {
    setEditing(false);
    setDraft({});
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await api.workspace.updateStyle(project, draft);
      await mutate(`style-${project}`);
      setEditing(false);
      setDraft({});
    } finally {
      setSaving(false);
    }
  }, [project, draft, mutate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-600">
        <span className="text-sm">加载中...</span>
      </div>
    );
  }

  if (!style) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-gray-600">
        <Palette size={32} strokeWidth={1} />
        <p className="text-sm">暂无风格配置</p>
        <p className="text-xs">项目中缺少 style.yaml</p>
      </div>
    );
  }

  const sizes = style.image_sizes ?? {};
  const video = style.video ?? {};

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette size={16} className="text-accent" />
          <h2 className="text-sm font-medium text-white">风格配置</h2>
          <span className="text-[10px] text-gray-600">style.yaml</span>
        </div>
        <div className="flex items-center gap-1.5">
          {editing ? (
            <>
              <button
                onClick={cancel}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-400 hover:bg-white/5 hover:text-gray-200"
              >
                <X size={12} /> 取消
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-1 rounded bg-accent px-2.5 py-1 text-xs text-white transition-colors hover:bg-accent/80 disabled:opacity-50"
              >
                <Save size={12} /> {saving ? "保存中..." : "保存"}
              </button>
            </>
          ) : (
            <button
              onClick={startEdit}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-400 hover:bg-white/5 hover:text-gray-200"
            >
              <Pencil size={12} /> 编辑
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <EditableTextarea
          label="基础风格 (style_base)"
          value={editing ? (draft.style_base ?? "") : (style.style_base ?? "")}
          editing={editing}
          onChange={(v) => setDraft((d) => ({ ...d, style_base: v }))}
        />
        <EditableTextarea
          label="角色风格 (style_base_character)"
          value={editing ? (draft.style_base_character ?? "") : (style.style_base_character ?? "")}
          editing={editing}
          onChange={(v) => setDraft((d) => ({ ...d, style_base_character: v }))}
        />
        <EditableTextarea
          label="负面提示词 (negative_prompt)"
          value={editing ? (draft.negative_prompt ?? "") : (style.negative_prompt ?? "")}
          editing={editing}
          onChange={(v) => setDraft((d) => ({ ...d, negative_prompt: v }))}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-white/5 bg-surface-2">
          <div className="border-b border-white/5 px-3 py-2">
            <h3 className="text-[11px] font-medium text-gray-400">图片尺寸</h3>
          </div>
          {Object.entries(sizes).length > 0 ? (
            Object.entries(sizes).map(([key, val]) => (
              <KVRow
                key={key}
                label={key}
                value={`${val.preset}${val.description ? ` — ${val.description}` : ""}`}
              />
            ))
          ) : (
            <div className="px-3 py-3 text-xs text-gray-600">未配置</div>
          )}
        </div>

        <div className="rounded-lg border border-white/5 bg-surface-2">
          <div className="border-b border-white/5 px-3 py-2">
            <h3 className="text-[11px] font-medium text-gray-400">视频参数</h3>
          </div>
          {video.aspect_ratio && <KVRow label="比例" value={video.aspect_ratio} />}
          {video.resolution && <KVRow label="分辨率" value={video.resolution} />}
          {video.duration_default && <KVRow label="默认时长" value={`${video.duration_default}s`} />}
          {video.fps && <KVRow label="FPS" value={String(video.fps)} />}
          {!video.aspect_ratio && !video.resolution && (
            <div className="px-3 py-3 text-xs text-gray-600">未配置</div>
          )}
        </div>
      </div>
    </div>
  );
}
