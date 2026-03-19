---
name: volc-tts
displayName: 火山豆包语音合成
version: 1.0.0
description: 火山引擎豆包 TTS，同步短句与异步长文本，用于分镜配音与 Ark 体系统一鉴权。
trigger: "火山语音|豆包tts|volc tts|分镜配音 火山"
tools: [filesystem, shell]
---

# Volc TTS - 火山豆包语音

通过火山引擎豆包语音合成 API 做 TTS，支持同步短文本与异步长文本。用于分镜配音时与图像、视频统一走火山体系。

## 何时使用

- 分镜配音需要走**火山 API**（与 Seedream Ark、Seedance 2.0 同体系）时
- 需要豆包语音精品音色或长文本异步合成时

## 环境

- `.env` 或环境变量：
  - `VOLC_APP_ID` 或 `VOLC_APPID`（火山控制台 APP ID）
  - `VOLC_ACCESS_KEY` 或 `VOLC_TOKEN`（Access Token）
  - 可选：`VOLC_TTS_RESOURCE_ID`，默认 `seed-tts-2.0`
  - 可选：`VOLC_TTS_BASE`，默认 `https://openspeech.bytedance.com`

## 用法

```bash
# 列出内置音色（完整列表见火山文档）
python volc_tts_api.py list_voices

# 同步合成（短句，推荐分镜逐句配音）
python volc_tts_api.py synthesize --text "台词内容" --voice_id zh_female_shuangkuaisisi_moon_bigtts --output line_001.mp3

# 异步长文本：提交任务
python volc_tts_api.py submit --text "很长的一段文本..." --voice_id zh_male_bvlazysheep
# 查询并下载
python volc_tts_api.py query --task_id TASK_ID --output out.mp3

# 一步：异步提交并等待下载
python volc_tts_api.py wait --text "长文本" --voice_id zh_female_xiaoxuan_moon_bigtts --output out.mp3
```

## 与 novel-05 的关系

[novel-05-shots-to-audio](novel-05-shots-to-audio/SKILL.md) 可将「调用 TTS 生成每条台词」改为调用本脚本（火山通道）。`_manifest.yaml` 的 `voice_mapping` 中 `voice_id` 填豆包发音人 ID（如 `zh_female_shuangkuaisisi_moon_bigtts`）。step-actions 的 `tts_model` 选 `volc-tts-hd` / `volc-tts-long` 时走本脚本；保留 Minimax 选项以兼容旧项目。
