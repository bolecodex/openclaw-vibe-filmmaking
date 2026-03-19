---
name: novel-08-ai-edit-video
displayName: 成片智能剪辑
version: 1.0.0
description: 成片后 AI 辅助剪辑：FFmpeg 去首尾静音、按 EDL JSON 拼接；可选由多模态模型产出 EDL。依赖已合成的分镜/场景 mp4。
trigger: "自动剪辑|EDL|去静音|拼接视频|ai edit video"
tools: [filesystem, shell]
---

# AI 辅助剪辑（规则 + EDL）

与 **seedance-video-edit**（画面再生成）不同：本技能只做**时间线裁剪与拼接**。

## 2A — 规则剪辑（本地 FFmpeg）

对单个镜头/片段去掉首尾静音：

```bash
python skills-openclaw/novel-08-ai-edit-video/scripts/ai_video_edit.py silence-trim \
  --input "{项目}/output/videos/某镜.mp4" \
  --output "{项目}/output/edited/某镜.mp4"
```

批量：对 `output/videos/*.mp4` 循环执行，写入 `output/edited/`。

## 2B — EDL 拼接

1. 由模型按 **scene 或每 N 个 shot** 批处理，阅读 `shots/*.yaml` 中 `visual_prompt`、时长与（可选）关键帧描述，输出 **仅 JSON**：

```json
{
  "clips": [
    {
      "source": "output/videos/SC_01_SH01.mp4",
      "trim_start": 0.2,
      "trim_end": 4.8,
      "shot_id": "SC_01_SH01",
      "reason": "去掉起幅黑场"
    }
  ]
}
```

路径相对**项目根目录**。`trim_start`/`trim_end` 单位为秒。

2. 保存为 `{项目}/.pipeline/edl_scene_XX.json`，执行：

```bash
python skills-openclaw/novel-08-ai-edit-video/scripts/ai_video_edit.py edl \
  --edl "{项目}/.pipeline/edl_scene_XX.json" \
  --output "{项目}/output/edited/scene_XX.mp4"
```

多 scene 分别生成 EDL 后，可用 concat demuxer 再拼全片。

## 约束

- 全片一次送 VLM 会超上下文 → **按 scene 或 ≤8 镜一批**。
- 需本机已安装 `ffmpeg`、`ffprobe`。
