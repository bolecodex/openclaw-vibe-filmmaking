---
name: seedance-first-last-frame
displayName: 首尾帧生视频
version: 1.0.0
description: 使用 Seedance 2.0 图生视频-首尾帧能力，输入首帧图与尾帧图及可选提示词，生成中间运动/转场由模型补全的视频。当用户想要首尾帧、首帧尾帧生视频、first last frame、双关键帧时使用此 skill。
trigger: "首尾帧|首帧尾帧生视频|first last frame|双关键帧|首尾帧生视频"
tools: [filesystem, shell]
---

# 首尾帧生视频（Seedance 2.0）

基于 [docs/seedance2-0.md](../../docs/seedance2-0.md) 中的**图生视频-首尾帧**能力，输入首帧图 URL、尾帧图 URL 与可选文本提示词，调用 Seedance 2.0 生成一条视频，中间运动与转场由模型补全。与多模态参考互斥，仅当用户明确「首尾帧」或提供两张起止图时使用。

## 何时使用

- 已有明确「起始画面」与「结束画面」，需要补全中间动画
- 分镜中某镜头的起止关键帧已出图，需生成该镜头视频
- 需要严格保障首尾帧与指定图片一致（多模态参考可通过提示词近似，但首尾帧 API 更可靠）

## API 对应

- **能力**：图生视频-首尾帧
- **content**：2 个 `image_url`，role 分别为 `first_frame`、`last_frame`，加可选 `text`
- **与多模态互斥**：不可与 reference_image/reference_video/reference_audio 混用
- **模型**：Seedance 2.0

## 调用方式

通过 shell 调用 [seedance-2/seedance_ark_api.py](../seedance-2/seedance_ark_api.py)：

```bash
python skills-openclaw/seedance-2/seedance_ark_api.py generate \
  --prompt "镜头从首帧缓慢推近，过渡到尾帧，保持同一场景光线一致" \
  --first_frame "https://example.com/start.png" \
  --last_frame "https://example.com/end.png" \
  --duration 6 --resolution 720p --aspect_ratio 16:9
```

## 提示词建议

- 描述中间运动/转场（推拉摇移、景别变化、节奏），便于模型补全更符合预期
- 宽高比可使用 `adaptive`，以首帧/尾帧图比例为准

## 输入要求

- 首帧图、尾帧图：各 1 张，格式 jpeg/png/webp 等，单张 &lt; 30MB
- 提示词：可选，建议提供以控制中间内容

## 相关技能

- **全能参考**：[seedance-multimodal-reference](../seedance-multimodal-reference/SKILL.md) — 可通过提示词指定「首帧/尾帧用某图」，但非严格一致
- **图生视频-首帧**：[seedance-2](../seedance-2/SKILL.md) — 仅首帧单图
