export interface ParamSchema {
  key: string;
  label: string;
  type: "select" | "text" | "number" | "toggle";
  options?: Array<{ value: string; label: string }>;
  default?: unknown;
}

export interface StepAction {
  id: string;
  label: string;
  variant: "primary" | "secondary" | "danger";
  requiresSelection?: boolean;
}

export interface StepDefinition {
  id: string;
  name: string;
  skill: string;
  order: number;
  dependsOn: string[];
  optional: boolean;
  parallelWith?: string[];
  actions: StepAction[];
  params: ParamSchema[];
  contentTab: string;
}

export const STEP_DEFINITIONS: StepDefinition[] = [
  {
    id: "long-novel-to-script",
    name: "长篇小说→剧本",
    skill: "novel-00-long-novel-to-script",
    order: 0.5,
    dependsOn: [],
    optional: true,
    actions: [
      { id: "split", label: "切块初始化", variant: "primary" },
      { id: "process-batch", label: "分析下一批块", variant: "primary" },
      { id: "act-scripts", label: "生成分幕剧本", variant: "secondary" },
      { id: "stitch", label: "汇编最终剧本", variant: "secondary" },
    ],
    params: [
      {
        key: "novel_path",
        label: "小说文件绝对路径",
        type: "text",
        default: "",
      },
      {
        key: "chunks_per_batch",
        label: "每批处理块数",
        type: "number",
        default: 3,
      },
    ],
    contentTab: "pipeline",
  },
  {
    id: "extract-characters",
    name: "提取角色",
    skill: "novel-01-character-extractor",
    order: 1,
    dependsOn: [],
    optional: false,
    actions: [
      { id: "run", label: "提取全部角色", variant: "primary" },
      { id: "generate-images", label: "全部角色出图", variant: "secondary" },
      { id: "regenerate-one", label: "重新生图", variant: "secondary", requiresSelection: true },
    ],
    params: [
      {
        key: "image_model",
        label: "图片模型",
        type: "select",
        options: [
          { value: "seedream-5.0-lite", label: "Seedream 5.0 Lite" },
          { value: "seedream-4.5", label: "Seedream 4.5" },
          { value: "flux-2-flash", label: "Flux 2 Flash" },
          { value: "nano-banana-pro", label: "Nano Banana Pro" },
        ],
        default: "seedream-5.0-lite",
      },
      {
        key: "image_size",
        label: "图片尺寸",
        type: "select",
        options: [
          { value: "portrait_16_9", label: "竖版 16:9" },
          { value: "landscape_16_9", label: "横版 16:9" },
          { value: "square_1_1", label: "正方形 1:1" },
        ],
        default: "portrait_16_9",
      },
    ],
    contentTab: "characters",
  },
  {
    id: "extract-props",
    name: "提取道具",
    skill: "novel-prop-extractor",
    order: 1.5,
    dependsOn: [],
    optional: true,
    actions: [
      { id: "run", label: "提取全部道具", variant: "primary" },
      { id: "generate-images", label: "全部道具出图", variant: "secondary" },
      { id: "regenerate-one", label: "选中道具出图", variant: "secondary", requiresSelection: true },
    ],
    params: [
      {
        key: "image_model",
        label: "图片模型",
        type: "select",
        options: [
          { value: "seedream-5.0-lite", label: "Seedream 5.0 Lite" },
          { value: "seedream-4.5", label: "Seedream 4.5" },
          { value: "nano-banana-pro", label: "Nano Banana Pro" },
        ],
        default: "seedream-5.0-lite",
      },
    ],
    contentTab: "props",
  },
  {
    id: "script-to-scenes",
    name: "剧本转场景",
    skill: "novel-02-script-to-scenes",
    order: 2,
    dependsOn: [],
    optional: false,
    actions: [
      { id: "run", label: "切分场景", variant: "primary" },
    ],
    params: [
      {
        key: "line_max",
        label: "每行最大字数",
        type: "number",
        default: 15,
      },
    ],
    contentTab: "scenes",
  },
  {
    id: "scenes-to-images",
    name: "场景出图",
    skill: "novel-scenes-to-images",
    order: 2.5,
    dependsOn: ["script-to-scenes"],
    optional: true,
    actions: [
      { id: "run", label: "全部场景出图", variant: "primary" },
      { id: "regenerate-one", label: "选中场景出图", variant: "secondary", requiresSelection: true },
    ],
    params: [
      {
        key: "image_model",
        label: "图片模型",
        type: "select",
        options: [
          { value: "seedream-5.0-lite", label: "Seedream 5.0 Lite" },
          { value: "seedream-4.5", label: "Seedream 4.5" },
          { value: "flux-2-flash", label: "Flux 2 Flash" },
          { value: "nano-banana-pro", label: "Nano Banana Pro" },
        ],
        default: "seedream-5.0-lite",
      },
      {
        key: "image_size",
        label: "图片尺寸",
        type: "select",
        options: [
          { value: "landscape_16_9", label: "横版 16:9" },
          { value: "portrait_16_9", label: "竖版 16:9" },
          { value: "square_1_1", label: "正方形 1:1" },
        ],
        default: "landscape_16_9",
      },
    ],
    contentTab: "scenes",
  },
  {
    id: "scenes-to-storyboard",
    name: "场景转分镜",
    skill: "novel-03-scenes-to-storyboard",
    order: 3,
    dependsOn: ["script-to-scenes"],
    optional: false,
    actions: [
      { id: "run", label: "生成分镜", variant: "primary" },
    ],
    params: [
      {
        key: "shot_duration_min",
        label: "最短镜头(秒)",
        type: "number",
        default: 3,
      },
      {
        key: "shot_duration_max",
        label: "最长镜头(秒)",
        type: "number",
        default: 7,
      },
    ],
    contentTab: "shots",
  },
  {
    id: "shots-to-images",
    name: "分镜出图",
    skill: "novel-04-shots-to-images",
    order: 4,
    dependsOn: ["scenes-to-storyboard"],
    optional: false,
    parallelWith: ["shots-to-audio"],
    actions: [
      { id: "run-all", label: "全部出图", variant: "primary" },
      { id: "run-selected", label: "选中出图", variant: "secondary", requiresSelection: true },
      { id: "retry-failed", label: "重试失败", variant: "secondary" },
      { id: "reset-all", label: "重置全部图片", variant: "danger" },
    ],
    params: [
      {
        key: "image_model",
        label: "图片模型",
        type: "select",
        options: [
          { value: "seedream-ark-4.5", label: "Seedream Ark 4.5 (火山)" },
          { value: "seedream-ark-5.0-lite", label: "Seedream Ark 5.0 Lite (火山)" },
          { value: "seedream-5.0-lite", label: "Seedream 5.0 Lite (xskill)" },
          { value: "seedream-4.5", label: "Seedream 4.5 (xskill)" },
          { value: "flux-2-flash", label: "Flux 2 Flash" },
        ],
        default: "seedream-ark-4.5",
      },
      {
        key: "quality_preset",
        label: "画质预设",
        type: "select",
        options: [
          { value: "standard", label: "标准" },
          { value: "s-tier", label: "S 级精品" },
        ],
        default: "standard",
      },
      {
        key: "use_character_ref",
        label: "使用角色参考图",
        type: "toggle",
        default: true,
      },
    ],
    contentTab: "shots",
  },
  {
    id: "shots-to-audio",
    name: "分镜配音",
    skill: "novel-05-shots-to-audio",
    order: 5,
    dependsOn: ["scenes-to-storyboard"],
    optional: false,
    parallelWith: ["shots-to-images"],
    actions: [
      { id: "run-all", label: "全部配音", variant: "primary" },
      { id: "run-selected", label: "选中配音", variant: "secondary", requiresSelection: true },
      { id: "retry-failed", label: "重试失败", variant: "secondary" },
    ],
    params: [
      {
        key: "tts_model",
        label: "TTS 模型",
        type: "select",
        options: [
          { value: "volc-tts-hd", label: "火山豆包 HD" },
          { value: "volc-tts-long", label: "火山豆包 长文本" },
          { value: "speech-2.8-hd", label: "Minimax HD" },
          { value: "speech-2.6", label: "Minimax 标准" },
        ],
        default: "volc-tts-hd",
      },
      {
        key: "quality_preset",
        label: "音质预设",
        type: "select",
        options: [
          { value: "standard", label: "标准" },
          { value: "s-tier", label: "S 级精品" },
        ],
        default: "standard",
      },
    ],
    contentTab: "audio",
  },
  {
    id: "shots-to-ai-video",
    name: "分镜AI视频",
    skill: "novel-06-shots-to-ai-video",
    order: 6,
    dependsOn: ["scenes-to-storyboard"],
    optional: true,
    actions: [
      { id: "run-all", label: "全部生成", variant: "primary" },
      { id: "run-selected", label: "选中生成", variant: "secondary", requiresSelection: true },
    ],
    params: [
      {
        key: "video_model",
        label: "视频模型",
        type: "select",
        options: [
          { value: "seedance-2.0", label: "Seedance 2.0 Pro" },
          { value: "seedance-lite", label: "Seedance Lite (旧版)" },
        ],
        default: "seedance-2.0",
      },
      {
        key: "video_duration",
        label: "视频时长(秒)",
        type: "number",
        default: 5,
      },
      {
        key: "quality_preset",
        label: "画质预设",
        type: "select",
        options: [
          { value: "standard", label: "标准" },
          { value: "s-tier", label: "S 级精品 (建议 5–8 秒、1080p/2K)" },
        ],
        default: "standard",
      },
    ],
    contentTab: "video",
  },
  {
    id: "compose-video",
    name: "合成长视频",
    skill: "novel-07-remotion",
    order: 7,
    dependsOn: ["shots-to-images", "shots-to-audio"],
    optional: false,
    actions: [
      { id: "run", label: "合成视频", variant: "primary" },
    ],
    params: [
      {
        key: "transition",
        label: "转场效果",
        type: "select",
        options: [
          { value: "fade", label: "淡入淡出" },
          { value: "wipe", label: "擦除" },
          { value: "slide", label: "滑动" },
          { value: "none", label: "无" },
        ],
        default: "fade",
      },
      {
        key: "kenburns",
        label: "Ken Burns 效果",
        type: "toggle",
        default: true,
      },
      {
        key: "subtitles",
        label: "字幕叠加",
        type: "toggle",
        default: true,
      },
    ],
    contentTab: "video",
  },
  {
    id: "ai-edit-video",
    name: "AI辅助剪辑",
    skill: "novel-08-ai-edit-video",
    order: 7.5,
    dependsOn: ["compose-video"],
    optional: true,
    actions: [
      { id: "silence-trim-all", label: "批量去首尾静音", variant: "primary" },
      { id: "apply-edl", label: "按EDL拼接", variant: "secondary" },
    ],
    params: [
      {
        key: "edl_file",
        label: "EDL JSON 相对项目路径",
        type: "text",
        default: ".pipeline/edl_scene_01.json",
      },
    ],
    contentTab: "video",
  },
  {
    id: "video-quality-review",
    name: "视频质量审核",
    skill: "novel-09-video-quality-review",
    order: 7.8,
    dependsOn: ["compose-video"],
    optional: true,
    actions: [
      { id: "sample-review", label: "全量抽检", variant: "primary" },
      { id: "deep-review", label: "选中镜深审", variant: "secondary", requiresSelection: true },
    ],
    params: [
      {
        key: "shots_per_scene",
        label: "每场景抽检镜头数",
        type: "number",
        default: 2,
      },
    ],
    contentTab: "video",
  },
];

export function getStepDefinition(stepId: string): StepDefinition | undefined {
  return STEP_DEFINITIONS.find((s) => s.id === stepId);
}

export function getStepByContentTab(tab: string): StepDefinition | undefined {
  return STEP_DEFINITIONS.find((s) => s.contentTab === tab);
}
