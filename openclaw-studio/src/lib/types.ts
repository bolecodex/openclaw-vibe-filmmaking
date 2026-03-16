export interface ProjectInfo {
  name: string;
  path: string;
  hasStyle: boolean;
  hasCharacters: boolean;
  hasScenes: boolean;
  hasShots: boolean;
  hasImages: boolean;
  hasAudio: boolean;
  hasVideo: boolean;
  hasSource: boolean;
  mtime: string;
}

export interface SourceFile {
  name: string;
  path: string;
  size: number;
  mtime: string;
}

export interface UploadResult {
  saved: string[];
  skipped: string[];
}

export interface DirEntry {
  name: string;
  path: string;
}

export interface DirListing {
  current: string;
  parent: string | null;
  dirs: DirEntry[];
}

export interface FileEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  mtime: string;
  extension?: string;
  children?: FileEntry[];
}

export interface Character {
  id: string;
  name: string;
  type: string;
  first_appearance: string;
  style: string;
  description: string;
  view: string;
  immutable_features: string[];
  prompt: string;
  image_url?: string;
  image_path?: string;
  image_status?: string;
}

export interface SceneInfo {
  id: string;
  name: string;
  type: string;
  location: string;
  time_period: string;
  line_count: number;
  main_characters: string[];
  mood: string;
  notes?: string;
  content?: string;
  fileName?: string;
  /** 场景图：远程 URL（可能过期） */
  image_url?: string;
  /** 场景图：本地相对路径，优先使用 */
  image_path?: string;
  image_status?: string;
}

/** 道具/物品（武器、信物、法宝等） */
export interface PropItem {
  id: string;
  name: string;
  description: string;
  category?: string;
  image_url?: string;
  image_path?: string;
  image_status?: string;
}

export interface ShotInfo {
  id: string;
  title: string;
  shot_type: string;
  characters: Array<{ ref: string; action: string; emotion: string }>;
  mood: string;
  lighting: string;
  lines: Array<{ speaker: string; text: string; audio_url?: string; audio_path?: string; audio_status?: string }>;
  prompt: string;
  image_url?: string;
  image_path?: string;
  image_status?: string;
  audio_url?: string;
  audio_path?: string;
  audio_status?: string;
  audio_speaker?: string;
  video_url?: string;
  video_path?: string;
  video_status?: string;
  video_mode?: string;
  duration_sec?: number;
}

export interface SceneShots {
  sceneId: string;
  sceneName: string;
  shots: ShotInfo[];
}

export interface MediaFile {
  name: string;
  path: string;
  size: number;
  mtime: string;
}

export interface Skill {
  name: string;
  displayName: string;
  description: string;
  version?: string;
  source: "workspace" | "managed" | "bundled";
  path: string;
  enabled: boolean;
  config: Record<string, string>;
  metadata?: Record<string, unknown>;
  content: string;
  hasScripts: boolean;
  hasReferences: boolean;
  updatedAt: string;
  overridden?: boolean;
  pipelineStep?: number;
  pipelineId?: string;
}

export interface MarketplaceSkill {
  slug: string;
  name: string;
  description: string;
  version: string;
  author: string;
  downloads: number;
  tags: string[];
  installed: boolean;
}

export type MentionType = "file" | "character" | "scene" | "shot" | "skill" | "audio" | "video";

export interface MentionRef {
  type: MentionType;
  id: string;
  label: string;
}

export interface MentionItem extends MentionRef {
  subtitle?: string;
}

export interface ImageAttachment {
  id: string;
  dataUrl: string;
  name?: string;
  size: number;
}

export interface AvailableView {
  id: string;
  label: string;
  focusType?: string;
  focusLabel?: string;
}

export interface AgentContext {
  project: { name: string; path: string } | null;
  view: { currentTab: TabType; currentView: "workspace" | "skills" };
  focus: {
    characterId?: string;
    characterName?: string;
    sceneId?: string;
    sceneName?: string;
    shotId?: string;
    selectedFile?: string;
    selectedSkill?: string;
  };
  summary: {
    totalCharacters?: number;
    totalScenes?: number;
    totalShots?: number;
    hasStyle?: boolean;
    sourceFiles?: Array<{ name: string; path: string; size: number }>;
  };
  availableViews?: AvailableView[];
}

export interface ToolCallInfo {
  id: string;
  title: string;
  status: "pending" | "running" | "completed" | "failed";
  input?: string;
  output?: string;
}

export interface UiActionRecord {
  action: string;
  target: string;
  label: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  attachments?: ImageAttachment[];
  mentions?: MentionRef[];
  thinking?: string;
  toolCalls?: ToolCallInfo[];
  uiActions?: UiActionRecord[];
}

export interface StyleConfig {
  version?: string;
  style_base: string;
  style_base_character?: string;
  negative_prompt?: string;
  image_sizes?: Record<
    string,
    { preset: string; description?: string }
  >;
  video?: {
    aspect_ratio?: string;
    resolution?: string;
    duration_default?: string;
    fps?: number;
  };
}

export interface SceneMeta {
  title: string;
  source_script?: string;
  character_asset?: string;
  total_scenes: number;
  total_lines: number;
  avg_lines_per_scene?: number;
  created_at?: string;
}

export interface ShotManifest {
  version?: string;
  script_name?: string;
  style_base?: string;
  generated_at?: string;
  total_scenes: number;
  total_shots: number;
  voice_mapping?: Record<string, { voice_id: string; voice_name: string }>;
  files?: Array<{
    file: string;
    scene_id: string;
    scene_name: string;
    shots_count: number;
    images_ready?: number;
    audio_ready?: number;
    audio_total?: number;
  }>;
}

export type TabType = string;
