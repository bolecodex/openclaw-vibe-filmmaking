/**
 * 与 backend/src/services/skill-display-names.ts 的 SKILL_ZH_TITLES 保持一致（流水线等处的 skill id 展示用）
 */
export const SKILL_ZH_TITLES: Record<string, string> = {
  "novel-00-long-novel-to-script": "长篇小说分块转剧本",
  "novel-01-character-extractor": "剧本角色提取",
  "novel-02-script-to-scenes": "剧本拆场景与对白",
  "novel-03-scenes-to-storyboard": "场景转分镜稿",
  "novel-04-shots-to-images": "分镜镜头配图",
  "novel-05-shots-to-audio": "分镜台词配音",
  "novel-06-shots-to-ai-video": "分镜 AI 动画视频",
  "novel-07-shots-to-video": "FFmpeg 分镜拼视频",
  "novel-07-remotion": "Remotion 高清成片",
  "novel-08-ai-edit-video": "成片智能剪辑",
  "novel-09-video-quality-review": "视频质量抽检",
  "novel-prop-extractor": "剧本道具提取",
  "novel-scenes-to-images": "场景环境配图",
  "seedance-2": "方舟 Seedance 2 视频",
  "seedance-video": "即梦视频生成",
  "seedance-video-edit": "参考视频画面编辑",
  "seedance-video-extend": "视频续接延长",
  "seedance-first-last-frame": "首尾帧生视频",
  "seedance-multimodal-reference": "多模态参考生视频",
  "seedance-t2v-web-search": "联网文生视频",
  "seedream-image": "即梦文图生图",
  "seedream-ark": "火山方舟图像生成",
  "nano-banana-pro": "香蕉 Pro 图像",
  "volc-tts": "火山豆包语音合成",
  "coze-upload": "本地文件上传取链",
  "usage-cost-stats": "用量与费用统计",
};

export function skillTitle(id: string): string {
  return SKILL_ZH_TITLES[id] ?? id;
}
