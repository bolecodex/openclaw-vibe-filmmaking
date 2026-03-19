---
name: seedance-multimodal-reference
displayName: 多模态参考生视频
version: 1.0.0
description: 使用 Seedance 2.0 多模态参考能力，以 1~9 图 + 0~3 视频 + 0~3 音频 + 可选文本的任意合法组合生成视频，覆盖全新创作、编辑、延长等场景。当用户想要多模态生视频、图片加视频加音频生视频、全能参考时使用此 skill。
trigger: "多模态生视频|图片加视频加音频生视频|全能参考|reference image video audio|多模态参考"
tools: [filesystem, shell]
---

# 全能参考 / 多模态参考（Seedance 2.0）

基于 [docs/seedance2-0.md](../../docs/seedance2-0.md) 中的**多模态参考**能力，输入任意合法组合：1~9 张参考图 + 0~3 段参考视频 + 0~3 段参考音频 + 可选文本，调用 Seedance 2.0 生成一条视频。用途由提示词决定（全新创作、编辑、延长等）。

## 何时使用

- 需要同时用多张图、多段视频、背景音乐等做一条成片
- 广告/宣传片：产品图 + 参考视频风格 + BGM + 文案
- 高级用户或 Agent 自动组合多素材，单次请求价值高

## API 对应

- **能力**：多模态参考生视频
- **content**：1~9 个 `reference_image` + 0~3 个 `reference_video` + 0~3 个 `reference_audio` + 可选 `text`
- **约束**：至少包含 1 图或 1 视频（不可仅音频）
- **模型**：仅 Seedance 2.0

## 调用方式

通过 shell 调用 [seedance-2/seedance_ark_api.py](../seedance-2/seedance_ark_api.py)：

```bash
# 图 + 视频 + 音频 + 文本（文档多模态示例风格）
python skills-openclaw/seedance-2/seedance_ark_api.py generate \
  --prompt "全程使用视频1的第一视角构图，全程使用音频1作为背景音乐。首帧为图片1，…尾帧定格为图片2。" \
  --reference_images "https://example.com/pic1.jpg" "https://example.com/pic2.jpg" \
  --reference_videos "https://example.com/ref.mp4" \
  --reference_audios "https://example.com/bgm.mp3" \
  --duration 11 --resolution 720p --aspect_ratio 16:9

# 仅图 + 文本（全新创作）
python skills-openclaw/seedance-2/seedance_ark_api.py generate \
  --prompt "以图片1和图片2为参考，生成一段产品展示视频" \
  --reference_images "https://example.com/a.jpg" "https://example.com/b.jpg" \
  --duration 8
```

## 提示词建议

- 可在提示词中指定「首帧/尾帧用某图」（由模型理解；严格首尾帧一致请用 [seedance-first-last-frame](../seedance-first-last-frame/SKILL.md)）
- 组合示例：图+视频、图+音频、图+视频+音频

## 输入要求

- 参考图：1~9 张，单张 &lt; 30MB
- 参考视频：0~3 段，每段 2~15 秒，总时长 ≤15 秒
- 参考音频：0~3 段，每段 2~15 秒，总时长 ≤15 秒；不可单独使用，需至少 1 图或 1 视频
- 提示词：可选，用于说明创作/编辑/延长意图

## 相关技能

- **视频延长**：[seedance-video-extend](../seedance-video-extend/SKILL.md)
- **视频编辑**：[seedance-video-edit](../seedance-video-edit/SKILL.md)
- **首尾帧**：[seedance-first-last-frame](../seedance-first-last-frame/SKILL.md) — 严格首尾帧一致时使用
