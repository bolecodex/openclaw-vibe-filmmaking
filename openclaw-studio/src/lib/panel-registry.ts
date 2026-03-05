import type { TabType } from "./types";
// TabType is now `string`, kept for compatibility

export interface PanelFieldDef {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "tags" | "image" | "status" | "number" | "readonly";
  editable: boolean;
  options?: string[];
}

export interface PanelSection {
  id: string;
  title: string;
  layout: "grid" | "list" | "detail" | "kv-table";
  fields: string[];
}

export interface PanelDefinition {
  id: TabType;
  label: string;
  filePattern: string;
  apiEndpoint: string;
  schema: PanelFieldDef[];
  sections: PanelSection[];
}

export const PANEL_DEFINITIONS: Record<string, PanelDefinition> = {
  style: {
    id: "style",
    label: "风格",
    filePattern: "style.yaml",
    apiEndpoint: "/api/workspace/style",
    schema: [
      { key: "style_base", label: "基础风格", type: "textarea", editable: true },
      { key: "style_base_character", label: "角色风格", type: "textarea", editable: true },
      { key: "negative_prompt", label: "负面提示词", type: "textarea", editable: true },
      { key: "image_sizes", label: "图片尺寸", type: "readonly", editable: false },
      { key: "video", label: "视频参数", type: "readonly", editable: false },
    ],
    sections: [
      { id: "prompts", title: "风格提示词", layout: "detail", fields: ["style_base", "style_base_character", "negative_prompt"] },
      { id: "sizes", title: "输出参数", layout: "kv-table", fields: ["image_sizes", "video"] },
    ],
  },
  characters: {
    id: "characters",
    label: "角色",
    filePattern: "*_角色资产.yaml",
    apiEndpoint: "/api/workspace/characters",
    schema: [
      { key: "id", label: "ID", type: "readonly", editable: false },
      { key: "name", label: "名称", type: "text", editable: true },
      { key: "type", label: "类型", type: "select", editable: true, options: ["主角", "配角", "群演", "特殊"] },
      { key: "description", label: "描述", type: "textarea", editable: true },
      { key: "immutable_features", label: "不可变特征", type: "tags", editable: true },
      { key: "prompt", label: "提示词", type: "textarea", editable: true },
      { key: "image_url", label: "立绘", type: "image", editable: false },
      { key: "image_status", label: "图片状态", type: "status", editable: false },
    ],
    sections: [
      { id: "cards", title: "角色卡片", layout: "grid", fields: ["image_url", "name", "type", "description"] },
      { id: "detail", title: "角色详情", layout: "detail", fields: ["id", "name", "type", "description", "immutable_features", "prompt", "image_url", "image_status"] },
    ],
  },
  scenes: {
    id: "scenes",
    label: "场景",
    filePattern: "*_场景索引.yaml",
    apiEndpoint: "/api/workspace/scenes",
    schema: [
      { key: "id", label: "场景ID", type: "readonly", editable: false },
      { key: "name", label: "场景名", type: "text", editable: true },
      { key: "type", label: "类型", type: "select", editable: true, options: ["reality", "flashback", "dream", "montage", "prologue"] },
      { key: "location", label: "地点", type: "text", editable: true },
      { key: "time_period", label: "时间", type: "text", editable: true },
      { key: "mood", label: "氛围", type: "text", editable: true },
      { key: "main_characters", label: "主要角色", type: "tags", editable: false },
    ],
    sections: [
      { id: "list", title: "场景列表", layout: "list", fields: ["id", "name", "type", "location", "time_period", "mood"] },
    ],
  },
  shots: {
    id: "shots",
    label: "分镜",
    filePattern: "shots/*.yaml",
    apiEndpoint: "/api/workspace/shots",
    schema: [
      { key: "id", label: "镜头ID", type: "readonly", editable: false },
      { key: "title", label: "标题", type: "text", editable: true },
      { key: "shot_type", label: "景别", type: "select", editable: true, options: ["特写", "近景", "中景", "全景", "远景"] },
      { key: "mood", label: "氛围", type: "text", editable: true },
      { key: "prompt", label: "提示词", type: "textarea", editable: true },
      { key: "image_status", label: "图片状态", type: "status", editable: false },
    ],
    sections: [
      { id: "timeline", title: "分镜时间线", layout: "grid", fields: ["id", "title", "shot_type", "mood"] },
    ],
  },
};

export const FILE_PATTERN_TO_PANEL: Record<string, string> = {
  "style.yaml": "style",
  "_角色资产.yaml": "characters",
  "_场景索引.yaml": "scenes",
  "shots/": "shots",
  "images/": "images",
  "audio/": "audio",
  "video/": "video",
};
