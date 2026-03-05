import type { ComponentType } from "react";
import { Dashboard } from "../components/content/Dashboard";
import { PipelineView } from "../components/content/PipelineView";
import { StylePanel } from "../components/content/StylePanel";
import { CharacterView } from "../components/content/CharacterView";
import { SceneList } from "../components/content/SceneList";
import { StoryboardView } from "../components/content/StoryboardView";
import { AudioView } from "../components/content/AudioView";
import { ImageGalleryView } from "../components/content/ImageGalleryView";
import { VideoPage } from "../components/content/VideoPage";
import { TestReportView } from "../components/content/TestReportView";

export interface ViewDefinition {
  id: string;
  label: string;
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
    order: 0,
    visible: true,
    component: Dashboard,
    agentHint: "项目概览和统计数据",
  },
  {
    id: "pipeline",
    label: "流水线",
    order: 0.5,
    visible: true,
    component: PipelineView,
    agentHint: "创作流水线管理，可执行步骤、配置参数、查看验收状态",
  },
  {
    id: "style",
    label: "风格",
    order: 1,
    visible: true,
    component: StylePanel,
    agentHint: "视觉风格配置",
  },
  {
    id: "characters",
    label: "角色",
    order: 2,
    visible: true,
    component: CharacterView,
    focusable: { type: "character", labelSingular: "角色" },
  },
  {
    id: "scenes",
    label: "场景",
    order: 3,
    visible: true,
    component: SceneList,
    focusable: { type: "scene", labelSingular: "场景" },
  },
  {
    id: "shots",
    label: "分镜",
    order: 4,
    visible: true,
    component: StoryboardView,
    focusable: { type: "shot", labelSingular: "分镜" },
  },
  {
    id: "images",
    label: "图片",
    order: 5,
    visible: true,
    component: ImageGalleryView,
  },
  {
    id: "audio",
    label: "音频",
    order: 6,
    visible: true,
    component: AudioView,
  },
  {
    id: "video",
    label: "视频",
    order: 7,
    visible: true,
    component: VideoPage,
  },
  {
    id: "test-report",
    label: "测试",
    order: 8,
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
