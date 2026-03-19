---
name: novel-09-video-quality-review
displayName: 视频质量抽检
version: 1.0.0
description: 对分镜视频做质量审核：抽关键帧 + 对照分镜文案，多模态打分，写入 video_quality.json。支持全量抽检与选中深审。
trigger: "视频审核|质量评分|video quality|抽检|成片验收"
tools: [filesystem, shell]
---

# 视频质量审核

## 输出

写入 `{项目目录}/.pipeline/video_quality.json`，结构示例：

```json
{
  "version": 1,
  "updated_at": "ISO8601",
  "shots": [
    {
      "shot_id": "SC_01_SH01",
      "video_path": "output/videos/SC_01_SH01.mp4",
      "visual_prompt_ref": "从 shots YAML 摘录",
      "scores": {
        "motion_stability": 0.0,
        "prompt_match": 0.0,
        "artifact_free": 0.0,
        "overall": 0.0
      },
      "issues": ["列问题"],
      "regenerate_suggested": false,
      "notes": "短评"
    }
  ],
  "summary": { "avg_overall": 0.0, "need_regen": 0 }
}
```

分数范围建议 0–10 或 0–1，团队内统一即可。

## 流程

### 1. 抽帧

```bash
python skills-openclaw/novel-09-video-quality-review/scripts/extract_review_frames.py \
  --video "{项目}/output/videos/某镜.mp4" \
  --out-dir "{项目}/.review_frames/某镜" \
  --count 6
```

### 2. 模型评审

将 **6 张帧图** + 该镜 `visual_prompt`（及台词摘要）送入**多模态模型**，要求输出严格 JSON 单行或 fenced block，解析后追加到 `video_quality.json` 的 `shots` 数组。

**抽检**：每 scene 随机或首尾各 1～2 镜。  
**深审**：仅对用户指定 `shot_id` 执行。

### 3. 合并

多次运行需按 `shot_id` 去重更新，保留最新 `updated_at`。

## 与流水线

- 本步骤**可选**，不阻塞合成。
- Studio 视频页可展示 `video_quality.json` 表格。
