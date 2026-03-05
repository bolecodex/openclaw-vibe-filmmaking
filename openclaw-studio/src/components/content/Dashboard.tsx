import {
  useStyle,
  useCharacters,
  useScenes,
  useShots,
  useMedia,
} from "../../hooks/use-api";
import { useProjectStore } from "../../stores/project-store";
import { api } from "../../lib/api-client";
import {
  LayoutDashboard,
  Palette,
  Users,
  Film,
  Clapperboard,
  Image as ImageIcon,
  Music,
  Video,
  CheckCircle2,
  AlertCircle,
  Download,
  Loader2,
} from "lucide-react";
import { useState, useCallback } from "react";
import { useSWRConfig } from "swr";
import type { ShotInfo } from "../../lib/types";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  status?: "ready" | "partial" | "empty";
  tab: string;
}

function StatCard({ icon, label, value, sub, status, tab }: StatCardProps) {
  const setTab = useProjectStore((s) => s.setCurrentTab);
  const statusColor =
    status === "ready"
      ? "text-emerald-400"
      : status === "partial"
        ? "text-amber-400"
        : "text-gray-600";

  return (
    <button
      onClick={() => setTab(tab)}
      className="flex items-start gap-3 rounded-lg border border-white/5 bg-surface-2 p-3 text-left transition-colors hover:border-white/10"
    >
      <div className="mt-0.5 text-gray-500">{icon}</div>
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-[11px] text-gray-500">{label}</span>
        <span className="text-lg font-medium text-white">{value}</span>
        {sub && <span className="text-[10px] text-gray-600">{sub}</span>}
      </div>
      {status && (
        <div className={`mt-0.5 ${statusColor}`}>
          {status === "ready" ? (
            <CheckCircle2 size={14} />
          ) : status === "partial" ? (
            <AlertCircle size={14} />
          ) : null}
        </div>
      )}
    </button>
  );
}

function ProgressBar({
  current,
  total,
  label,
}: {
  current: number;
  total: number;
  label: string;
}) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-gray-500">{label}</span>
        <span className="text-[11px] text-gray-400">
          {current}/{total} ({pct}%)
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function Dashboard({ project }: { project: string }) {
  const { data: style } = useStyle(project);
  const { data: characters } = useCharacters(project);
  const { data: scenesData } = useScenes(project);
  const { data: shotsData } = useShots(project);
  const { data: videoFiles } = useMedia(project, "video");
  const { mutate } = useSWRConfig();

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const syncAssets = useCallback(async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const report = await api.workspace.downloadAssets(project);
      const total = report.downloaded.length;
      const failed = report.failed.length;
      const skipped = report.skipped;
      setSyncResult(
        failed > 0
          ? `已下载 ${total} 个，跳过 ${skipped} 个，失败 ${failed} 个`
          : `已下载 ${total} 个，跳过 ${skipped} 个已存在文件`,
      );
      mutate(`chars-${project}`);
      mutate(`shots-${project}`);
    } catch (err) {
      setSyncResult(`同步失败: ${(err as Error).message}`);
    } finally {
      setSyncing(false);
    }
  }, [project, mutate]);

  const scenes = scenesData?.scenes ?? [];
  const allScenes = shotsData?.scenes ?? [];
  const allShotsList: ShotInfo[] = allScenes.flatMap((s) => s.shots as ShotInfo[]);
  const totalShots = allShotsList.length;

  const charsWithImage = characters?.filter((c) => c.image_url || c.image_path) ?? [];
  const totalChars = characters?.length ?? 0;

  const shotsWithImage = allShotsList.filter(
    (sh) => sh.image_url || sh.image_path || sh.image_status === "completed",
  );
  const shotsWithAudio = allShotsList.filter(
    (sh) => sh.audio_url || sh.audio_path || sh.audio_status === "completed",
  );

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-center gap-2">
        <LayoutDashboard size={16} className="text-accent" />
        <h2 className="text-sm font-medium text-white">项目概览</h2>
        <span className="text-[10px] text-gray-600">{project}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard
          icon={<Palette size={16} />}
          label="风格"
          value={style ? "已配置" : "未配置"}
          status={style ? "ready" : "empty"}
          tab="style"
        />
        <StatCard
          icon={<Users size={16} />}
          label="角色"
          value={totalChars}
          sub={
            totalChars > 0
              ? `${charsWithImage.length}/${totalChars} 已生图`
              : undefined
          }
          status={
            totalChars === 0
              ? "empty"
              : charsWithImage.length === totalChars
                ? "ready"
                : "partial"
          }
          tab="characters"
        />
        <StatCard
          icon={<Film size={16} />}
          label="场景"
          value={scenes.length}
          status={scenes.length > 0 ? "ready" : "empty"}
          tab="scenes"
        />
        <StatCard
          icon={<Clapperboard size={16} />}
          label="分镜"
          value={totalShots}
          sub={totalShots > 0 ? `${allScenes.length} 个场景` : undefined}
          status={totalShots > 0 ? "ready" : "empty"}
          tab="shots"
        />
        <StatCard
          icon={<ImageIcon size={16} />}
          label="图片"
          value={shotsWithImage.length}
          sub={
            shotsWithImage.length > 0 && totalShots > 0
              ? `${shotsWithImage.length}/${totalShots} 已配图`
              : undefined
          }
          status={
            shotsWithImage.length === 0
              ? "empty"
              : shotsWithImage.length === totalShots
                ? "ready"
                : "partial"
          }
          tab="images"
        />
        <StatCard
          icon={<Music size={16} />}
          label="音频"
          value={shotsWithAudio.length}
          sub={
            shotsWithAudio.length > 0 && totalShots > 0
              ? `${shotsWithAudio.length}/${totalShots} 已配音`
              : undefined
          }
          status={
            shotsWithAudio.length === 0
              ? "empty"
              : shotsWithAudio.length === totalShots
                ? "ready"
                : "partial"
          }
          tab="audio"
        />
        <StatCard
          icon={<Video size={16} />}
          label="视频"
          value={videoFiles?.length ?? 0}
          status={(videoFiles?.length ?? 0) > 0 ? "ready" : "empty"}
          tab="video"
        />
      </div>

      {totalShots > 0 && (
        <div className="rounded-lg border border-white/5 bg-surface-2 p-4">
          <h3 className="mb-3 text-xs font-medium text-gray-400">制作进度</h3>
          <div className="flex flex-col gap-3">
            <ProgressBar
              current={shotsWithImage.length}
              total={totalShots}
              label="配图完成"
            />
            <ProgressBar
              current={shotsWithAudio.length}
              total={totalShots}
              label="配音完成"
            />
          </div>
        </div>
      )}

      <div className="rounded-lg border border-white/5 bg-surface-2 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-medium text-gray-400">资产同步</h3>
            <p className="mt-0.5 text-[10px] text-gray-600">
              将远程图片/音频下载到本地，防止链接过期
            </p>
          </div>
          <button
            onClick={syncAssets}
            disabled={syncing}
            className="flex items-center gap-1.5 rounded-md bg-accent/10 px-3 py-1.5 text-xs text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
          >
            {syncing ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Download size={13} />
            )}
            {syncing ? "同步中..." : "同步到本地"}
          </button>
        </div>
        {syncResult && (
          <p className="mt-2 text-[11px] text-gray-400">{syncResult}</p>
        )}
      </div>
    </div>
  );
}
