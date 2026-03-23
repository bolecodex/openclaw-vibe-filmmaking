/**
 * 与仓库 skills-openclaw 各 SKILL.md 的 displayName 对齐。
 * 当 ~/.openclaw 内旧副本缺少 displayName 时，用此表保证界面显示中文名。
 *
 * 与前端 `src/lib/skill-zh-titles.ts` 保持同步（流水线步骤角标等）。
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

/**
 * 从多份 frontmatter 中依次取 displayName / display_name（不用 name 字段，避免英文 id 当标题）。
 */
export function pickDisplayName(
  skillId: string,
  ...layers: Array<Record<string, unknown> | null | undefined>
): string {
  for (const layer of layers) {
    if (!layer) continue;
    const raw = layer.displayName ?? layer.display_name;
    if (typeof raw === "string") {
      const t = raw.trim();
      if (t.length > 0) return t;
    }
  }
  return SKILL_ZH_TITLES[skillId] ?? skillId;
}
