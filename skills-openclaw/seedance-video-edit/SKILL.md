---
name: seedance-video-edit
displayName: 参考视频画面编辑
version: 1.0.0
description: 使用 Seedance 2.0 多模态参考能力，在参考视频基础上按提示词与参考图进行编辑（如替换物体、改风格）。当用户想要视频编辑、替换视频中物体、改视频风格、edit video、视频内替换时使用此 skill。
trigger: "视频编辑|替换视频中物体|改视频风格|edit video|视频内替换"
tools: [filesystem, shell]
---

# 视频编辑（Seedance 2.0）

基于 [docs/seedance2-0.md](../../docs/seedance2-0.md) 中的**多模态参考**能力，输入 1 段参考视频 URL、0~9 张参考图（如要替换成的物体/风格）与编辑说明文本，调用 Seedance 2.0 生成编辑后的视频。

## 何时使用

- 将视频中某物体替换成参考图中的物体（如礼盒中的香水换成面霜）
- 在保持运镜/节奏不变的前提下改风格、改局部内容
- 对已有成片做多轮编辑（每轮 1 次 API 调用）

## API 对应

- **能力**：多模态参考生视频（编辑场景）
- **content**：1 个 `reference_video` + 1~9 个 `reference_image` + 1 个 `text`
- **模型**：仅 Seedance 2.0

## 调用方式

通过 shell 调用 [seedance-2/seedance_ark_api.py](../seedance-2/seedance_ark_api.py)：

```bash
# 文档示例：将视频1礼盒中的香水替换成图片1中的面霜，运镜不变
python skills-openclaw/seedance-2/seedance_ark_api.py generate \
  --prompt "将视频1礼盒中的香水替换成图片1中的面霜，运镜不变" \
  --reference_images "https://example.com/product.jpg" \
  --reference_videos "https://example.com/original.mp4" \
  --duration 5 --resolution 720p --aspect_ratio 16:9
```

## 提示词建议

- 明确写出「视频1」「图片1」及编辑动作（替换、改成、保留运镜等）
- 与**延长**区分：编辑是单视频 + 图 + 说明；延长是多视频 + 衔接文案

## 输入要求

- 参考视频：1 段，2~15 秒，mp4/mov，480p/720p
- 参考图：1~9 张，替换目标或风格参考
- 提示词：编辑说明，中文建议不超过 500 字

## 相关技能

- **视频延长**：[seedance-video-extend](../seedance-video-extend/SKILL.md) — 多段视频衔接
- **全能参考**：[seedance-multimodal-reference](../seedance-multimodal-reference/SKILL.md) — 任意图+视频+音频组合
