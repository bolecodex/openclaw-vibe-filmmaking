---
name: seedance-video-extend
displayName: 视频续接延长
version: 1.0.0
description: 使用 Seedance 2.0 多模态参考能力，将 2~3 段参考视频按提示词衔接或续写，生成延长/接龙视频。当用户想要视频延长、续写视频、多段视频衔接、extend video、视频接龙时使用此 skill。
trigger: "视频延长|续写视频|多段视频衔接|extend video|视频接龙|延长视频"
tools: [filesystem, shell]
---

# 视频延长（Seedance 2.0）

基于 [docs/seedance2-0.md](../../docs/seedance2-0.md) 中的**多模态参考**能力，输入 2~3 段参考视频 URL 与一段「如何衔接/续写」的文本提示词，调用 Seedance 2.0 生成延长或衔接后的视频。

## 何时使用

- 用户已有 2~3 段短视频，希望按描述接成一段完整视频
- 对已有成片做「续写结尾」或「中间插入衔接」
- 分镜/成片产出后，需要多次「接龙」以拉长时长

## API 对应

- **能力**：多模态参考生视频（延长场景）
- **content**：2~3 个 `reference_video` + 1 个 `text`
- **模型**：仅 Seedance 2.0（如 `doubao-seedance-2-0-pro-260215` 或 `doubao-seedance-2-0-260128`）

## 调用方式

通过 shell 调用 [seedance-2/seedance_ark_api.py](../seedance-2/seedance_ark_api.py)：

```bash
# 2 段视频衔接
python skills-openclaw/seedance-2/seedance_ark_api.py generate \
  --prompt "视频1的拱形窗户打开，进入美术馆室内，接视频2，镜头缓慢推进" \
  --reference_videos "https://example.com/clip1.mp4" "https://example.com/clip2.mp4" \
  --duration 8 --resolution 720p --aspect_ratio 16:9

# 3 段视频衔接（示例来自文档）
python skills-openclaw/seedance-2/seedance_ark_api.py generate \
  --prompt "视频1中的拱形窗户打开，进入美术馆室内，接视频2，之后镜头进入画内，接视频3" \
  --reference_videos "https://.../r2v_extend_video1.mp4" "https://.../r2v_extend_video2.mp4" "https://.../r2v_extend_video3.mp4" \
  --duration 8
```

提交后使用 `get` / `wait` 轮询任务状态，或使用 `run` 一站式等待并下载。

## 提示词建议

- 明确指定「视频1」「视频2」「视频3」与顺序，以及衔接动作（如「打开」「进入」「接」）
- 输出时长建议 4~15 秒，`ratio`/`resolution` 建议与参考视频一致或使用 `adaptive`

## 输入要求

- 参考视频：每段 2~15 秒，最多 3 段，总时长不超过 15 秒；格式 mp4/mov；分辨率 480p/720p
- 提示词：描述如何衔接或续写，中文建议不超过 500 字

## 与编辑视频的区别

- **延长**：多段视频 + 衔接/续写文案
- **编辑**：[seedance-video-edit](../seedance-video-edit/SKILL.md) 为单段视频 + 参考图 + 编辑说明（如替换物体）
