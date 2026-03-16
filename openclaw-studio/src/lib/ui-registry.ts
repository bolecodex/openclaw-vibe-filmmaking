import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Workflow,
  Palette,
  Users,
  Film,
  Package,
  Clapperboard,
  Image,
  AudioLines,
  Video,
  Scissors,
  FlaskConical,
} from "lucide-react";
import { Dashboard } from "../components/content/Dashboard";
import { PipelineView } from "../components/content/PipelineView";
import { StylePanel } from "../components/content/StylePanel";
import { CharacterView } from "../components/content/CharacterView";
import { SceneList } from "../components/content/SceneList";
import { PropsView } from "../components/content/PropsView";
import { StoryboardView } from "../components/content/StoryboardView";
import { AudioView } from "../components/content/AudioView";
import { ImageGalleryView } from "../components/content/ImageGalleryView";
import { AiVideoView } from "../components/content/AiVideoView";
import { VideoPage } from "../components/content/VideoPage";
import { TestReportView } from "../components/content/TestReportView";

export interface ViewDefinition {
  id: string;
  label: string;
  icon?: LucideIcon;
  order: number;
  visible: boolean;
  component: ComponentType<any>;
  componentProps?: Record<string, unknown>;
  focusable?: {
    type: string;
    labelSingular: string;
  };
  agentHint?: string;
}

export const UI_VIEWS: ViewDefinition[] = [
  {
    id: "dashboard",
    label: "概览",
    icon: LayoutDashboard,
    order: 0,
    visible: true,
    component: Dashboard,
    agentHint: "项目概览和统计数据",
  },
  {
    id: "pipeline",
    label: "流水线",
    icon: Workflow,
    order: 0.5,
    visible: true,
    component: PipelineView,
    agentHint: "创作流水线管理，可执行步骤、配置参数、查看验收状态",
  },
  {
    id: "style",
    label: "风格",
    icon: Palette,
    order: 1,
    visible: true,
    component: StylePanel,
    agentHint: "视觉风格配置",
  },
  {
    id: "characters",
    label: "角色",
    icon: Users,
    order: 2,
    visible: true,
    component: CharacterView,
    focusable: { type: "character", labelSingular: "角色" },
  },
  {
    id: "scenes",
    label: "场景",
    icon: Film,
    order: 3,
    visible: true,
    component: SceneList,
    focusable: { type: "scene", labelSingular: "场景" },
  },
  {
    id: "props",
    label: "道具",
    icon: Package,
    order: 3.5,
    visible: true,
    component: PropsView,
    focusable: { type: "prop", labelSingular: "道具" },
    agentHint: "道具/物品资产（武器、信物等）及配图",
  },
  {
    id: "shots",
    label: "分镜图",
    icon: Clapperboard,
    order: 4,
    visible: true,
    component: StoryboardView,
    focusable: { type: "shot", labelSingular: "分镜" },
  },
  {
    id: "images",
    label: "图片",
    icon: Image,
    order: 5,
    visible: false,
    component: ImageGalleryView,
  },
  {
    id: "audio",
    label: "音频",
    icon: AudioLines,
    order: 6,
    visible: true,
    component: AudioView,
  },
  {
    id: "video",
    label: "视频",
    icon: Video,
    order: 7,
    visible: true,
    component: AiVideoView,
    focusable: { type: "shot", labelSingular: "镜头" },
    agentHint: "AI 视频生成（Seedance），为每个分镜生成视频片段",
  },
  {
    id: "editor",
    label: "剪辑",
    icon: Scissors,
    order: 8,
    visible: true,
    component: VideoPage,
    agentHint: "视频合成与剪辑（Remotion），将分镜片段合并为完整视频",
  },
  {
    id: "test-report",
    label: "测试",
    icon: FlaskConical,
    order: 9,
    visible: true,
    component: TestReportView,
    agentHint: "流水线测试验收报告",
  },
];

export const VIEW_MAP = new Map(UI_VIEWS.map((v) => [v.id, v]));

export const VISIBLE_VIEWS = UI_VIEWS.filter((v) => v.visible).sort(
  (a, b) => a.order - b.order,
);

export const TAB_IDS = VISIBLE_VIEWS.map((v) => v.id);

export const TAB_LABELS: Record<string, string> = Object.fromEntries(
  UI_VIEWS.map((v) => [v.id, v.label]),
);

export const FOCUS_TYPE_TO_VIEW = new Map(
  UI_VIEWS.filter((v) => v.focusable).map((v) => [v.focusable!.type, v]),
);

export function isValidViewId(id: string): boolean {
  return VIEW_MAP.has(id);
}

export function getAvailableViewsForAgent() {
  return UI_VIEWS.filter((v) => v.visible).map((v) => ({
    id: v.id,
    label: v.label,
    focusType: v.focusable?.type,
    focusLabel: v.focusable?.labelSingular,
  }));
}
