---
name: seedream-ark
displayName: 火山方舟图像生成
version: 1.0.0
description: 通过火山方舟 Ark 调用 Seedream 做文生图、图生图，与 Seedance2 共用鉴权。分镜/角色出图走 Ark 通道时使用。
trigger: "seedream ark|方舟图像|火山图像|ARK 生图"
tools: [filesystem, shell]
---

# Seedream Ark - 火山方舟图像生成

通过火山方舟 Ark 官方 API 调用 Seedream 模型生成图像，与 [seedance-2](seedance-2/SKILL.md) 共用鉴权（`ARK_API_KEY`、`ARK_BASE_URL`）。

## 何时使用

- 分镜出图、角色/场景图需要走**火山方舟统一鉴权**时
- 项目要求图像与视频（Seedance 2.0）同源（同一 Ark 账号）时
- 使用 Seedream 4.5 / 5.0 模型做文生图、图生图时

## 环境

- `.env` 或环境变量：`ARK_API_KEY`（必填）、`ARK_BASE_URL`（可选，默认 `https://ark.cn-beijing.volces.com/api/v3`）
- 可选：`SEEDREAM_ARK_MODEL`，默认 `doubao-seedream-4-5-251128`

## 用法

```bash
# 文生图（提交任务，返回 task_id）
python seedream_ark_api.py generate --prompt "画面描述" [--size 1024x1024] [--model MODEL]

# 图生图
python seedream_ark_api.py generate --prompt "描述" --image_url "https://..."

# 查询状态
python seedream_ark_api.py get --task_id TASK_ID

# 等待完成
python seedream_ark_api.py wait --task_id TASK_ID [--timeout 300]

# 一步到位：生成 + 等待 + 可选下载
python seedream_ark_api.py run --prompt "画面描述" [--output out.png]
```

## 与 novel-04 的关系

[novel-04-shots-to-images](novel-04-shots-to-images/SKILL.md) 可将「调用 Seedream 生成分镜图」改为调用本脚本（Ark 通道），替代通过 MCP 的 `generate`（如 fal-ai/bytedance/seedream）。由 step-actions 的 `image_model` 选择 `seedream-ark-4.5` / `seedream-ark-5.0-lite` 时走本脚本。
