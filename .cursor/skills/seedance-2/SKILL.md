---
name: seedance-2
version: 1.0.0
description: 使用火山方舟 Ark 官方 API 调用 Seedance 2.0 生成视频。支持文生视频、图生视频、原生音频、多模态参考。当用户提到 seedance 2.0、方舟视频生成、doubao-seedance 时使用此 skill。
trigger: "seedance 2|seedance2|方舟视频|doubao-seedance|ark视频生成"
tools: [filesystem]
---

# Seedance 2.0 视频生成（火山方舟 Ark API）

> **官方文档**: https://www.volcengine.com/docs/82379/1366799
>
> **API 调用方式**：通过 shell 调用 CLI 包装器，直接请求火山方舟 Ark REST API：
> ```bash
> python /Users/bytedance/Documents/实验/long_video_skills/skills-openclaw/seedance-2/seedance_ark_api.py generate --prompt PROMPT [--image_url URL] [--duration SEC] [--resolution RES]
> python /Users/bytedance/Documents/实验/long_video_skills/skills-openclaw/seedance-2/seedance_ark_api.py get --task_id TASK_ID
> python /Users/bytedance/Documents/实验/long_video_skills/skills-openclaw/seedance-2/seedance_ark_api.py wait --task_id TASK_ID
> python /Users/bytedance/Documents/实验/long_video_skills/skills-openclaw/seedance-2/seedance_ark_api.py run --prompt PROMPT [--output video.mp4]
> ```
>
> **环境变量**（在 `.env` 中配置）：
> - `ARK_API_KEY` - 火山方舟 API Key（必需）
> - `ARK_BASE_URL` - API 地址（默认 `https://ark.cn-beijing.volces.com/api/v3`）
> - `SEEDANCE_MODEL` - 模型名（默认 `doubao-seedance-2-0-pro-260215`）

## 概述

Seedance 2.0 是字节跳动最新一代 AI 视频生成模型，通过火山方舟（Volcano Engine Ark）平台提供 API 服务。相比 1.x 版本，2.0 新增了多模态参考输入、原生音频生成、更好的物理模拟和视频编辑能力。

### 核心能力

| 特性 | 说明 |
|------|------|
| **文生视频** | 纯文本提示词生成 2K 视频，最长 15 秒 |
| **图生视频** | 以图片为首帧动画化，精确控制主体运动 |
| **原生音频** | 同步生成对话、音效、背景音乐，支持唇形同步 |
| **多模态参考** | 混合图片、视频、音频作为输入（2.0 独有） |
| **高分辨率** | 支持 480p / 720p / 1080p / 2K |
| **快速生成** | 5 秒片段约 30-60 秒生成 |

## 可用模型

| 模型 ID | 版本 | 说明 |
|---------|------|------|
| `doubao-seedance-2-0-pro-260215` | **2.0 Pro** | 最新旗舰，多模态参考+原生音频 |
| `doubao-seedance-1-5-pro-251215` | 1.5 Pro | 文/图生视频+音频+唇形同步 |
| `doubao-seedance-1-0-pro-250528` | 1.0 Pro | 文/图生视频 |
| `doubao-seedance-1-0-pro-250428` | 1.0 Pro | 文/图生视频 |

> 推荐使用 `doubao-seedance-2-0-pro-260215`（默认）

## 定价参考

| 模型 | 类型 | 分辨率 | 时长 | 单价 |
|------|------|--------|------|------|
| Seedance 2.0 Pro | 文/图 → 视频 | 最高 2K | 4–15s | ~¥0.20/秒 |
| Seedance 1.5 Pro | 文/图 → 视频 | 最高 1080p | 5–10s | ~¥0.12/秒 |
| Seedance 1.0 Lite | 图 → 视频 | 最高 720p | 5s | ~¥0.06/秒 |

---

## API 接口

### REST 端点

| 操作 | 方法 | 路径 |
|------|------|------|
| 创建任务 | POST | `/api/v3/contents/generations/tasks` |
| 查询任务 | GET | `/api/v3/contents/generations/tasks/{task_id}` |
| 任务列表 | GET | `/api/v3/contents/generations/tasks` |
| 取消任务 | POST | `/api/v3/contents/generations/tasks/{task_id}/cancel` |

**Base URL**: `https://ark.cn-beijing.volces.com`
**认证**: `Authorization: Bearer {ARK_API_KEY}`

### 请求格式

```json
{
  "model": "doubao-seedance-2-0-pro-260215",
  "content": [
    {"type": "text", "text": "视频描述提示词"}
  ]
}
```

图生视频时，在 `content` 数组前面添加图片：

```json
{
  "model": "doubao-seedance-2-0-pro-260215",
  "content": [
    {"type": "image_url", "image_url": {"url": "https://example.com/photo.jpg"}},
    {"type": "text", "text": "Camera slowly zooms in, the subject smiles"}
  ]
}
```

### 任务状态流转

```
pending → processing → succeeded
                    ↘ failed
```

- `pending` - 排队中
- `processing` - 生成中（有进度百分比）
- `succeeded` - 完成，视频 URL 在 `content` 数组中
- `failed` - 失败，查看 `error` 字段

### 响应格式（完成后）

```json
{
  "id": "task-xxxxx",
  "model": "doubao-seedance-2-0-pro-260215",
  "status": "succeeded",
  "content": [
    {
      "type": "video_url",
      "video_url": {"url": "https://...mp4"}
    }
  ]
}
```

---

## CLI 使用指南

### 命令一览

| 命令 | 用途 |
|------|------|
| `generate` | 提交任务，返回 task 信息（含 task_id） |
| `get` | 查询任务状态 |
| `wait` | 轮询等待任务完成 |
| `run` | 一站式：提交 + 等待 + 可选下载 |

### 参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `--prompt` | string | **必填** | 视频生成提示词 |
| `--image_url` | string | - | 首帧图片 URL（图生视频时使用） |
| `--model` | string | doubao-seedance-2-0-pro-260215 | 模型名称 |
| `--duration` | int | 5 | 视频时长（4-15 秒） |
| `--resolution` | string | 720p | 分辨率：480p / 720p / 1080p |
| `--aspect_ratio` | string | 16:9 | 宽高比：16:9 / 9:16 / 1:1 / 4:3 / 3:4 / 21:9 |
| `--no-audio` | flag | - | 关闭音频生成 |
| `--seed` | int | - | 随机种子（-1 为随机） |
| `--output` / `-o` | string | - | 视频下载路径（仅 `run` 命令） |
| `--timeout` | int | 600 | 最大等待秒数 |

---

## 文生视频

### 基础示例

```bash
python seedance_ark_api.py run \
  --prompt "A golden retriever running through autumn leaves in slow motion, cinematic lighting, 4K quality" \
  --duration 5 \
  --resolution 720p \
  --output golden_retriever.mp4
```

### 带对话和音效

Seedance 2.0 支持在视频中生成对话和音效。对话用引号包裹：

```bash
python seedance_ark_api.py run \
  --prompt 'A lawyer in a courtroom declares "Ladies and gentlemen, reasonable doubt is the foundation of justice itself", footsteps on marble, jury murmuring, dramatic lighting' \
  --duration 8 \
  --resolution 1080p \
  --output courtroom.mp4
```

### 竖版短视频（TikTok/抖音）

```bash
python seedance_ark_api.py run \
  --prompt "A cat astronaut floating in a space station, looking out the window at Earth, weightless movement" \
  --aspect_ratio 9:16 \
  --resolution 1080p \
  --duration 5 \
  --output cat_space.mp4
```

---

## 图生视频

以一张图片作为首帧，生成动画视频：

```bash
python seedance_ark_api.py run \
  --prompt "Camera slowly zooms in, the subject smiles and waves" \
  --image_url "https://example.com/portrait.jpg" \
  --duration 5 \
  --resolution 720p \
  --output animated.mp4
```

> **注意**：图片必须是公开可访问的 URL。如果是本地图片，需要先上传（可用 coze-upload 或 catbox skill）。

---

## 分步调用（适合异步场景）

### 第 1 步：提交任务

```bash
python seedance_ark_api.py generate \
  --prompt "A woman walking through a rain-soaked Tokyo alley at night, neon reflections" \
  --duration 5
```

返回 JSON，记下 `id` 字段。

### 第 2 步：查询状态

```bash
python seedance_ark_api.py get --task_id "你的task_id"
```

### 第 3 步：等待完成

```bash
python seedance_ark_api.py wait --task_id "你的task_id" --timeout 300
```

---

## Python SDK 调用（可选）

如果已安装 `volcengine-python-sdk[ark]`，也可以直接使用 Python SDK：

```python
import os, time
from volcenginesdkarkruntime import Ark

client = Ark(api_key=os.getenv("ARK_API_KEY"))

# 文生视频
task = client.content.generations.tasks.create(
    model="doubao-seedance-2-0-pro-260215",
    content=[{
        "type": "text",
        "text": "A golden retriever running through autumn leaves, cinematic"
    }]
)
print(f"Task ID: {task.id}")

# 轮询等待
while True:
    result = client.content.generations.tasks.get(task_id=task.id)
    if result.status == "succeeded":
        video_url = result.content[0].url
        print(f"Video: {video_url}")
        break
    elif result.status == "failed":
        print(f"Error: {result.error}")
        break
    time.sleep(10)
```

```python
# 图生视频
task = client.content.generations.tasks.create(
    model="doubao-seedance-2-0-pro-260215",
    content=[
        {"type": "image_url", "image_url": {"url": "https://example.com/photo.jpg"}},
        {"type": "text", "text": "Camera slowly zooms in, the subject smiles"}
    ]
)
```

安装 SDK：
```bash
pip install 'volcengine-python-sdk[ark]'
```

---

## 提示词技巧

### 结构化提示词

像写电影镜头描述一样组织提示词：

| 元素 | 示例 |
|------|------|
| **主体** | "A young woman in a red dress" |
| **动作** | "walks slowly toward the camera, then turns" |
| **场景** | "rain-soaked Tokyo alley, neon reflections on wet pavement" |
| **对话** | `"I told you — we don't have much time."` (引号包裹) |
| **镜头** | "Slow dolly-in ending on a close-up" |
| **音效** | "Rain on metal, distant traffic, her heels on concrete" |
| **光影** | "cinematic lighting, golden hour, soft backlight" |

### 最佳实践

1. **使用英文提示词** - 英文效果通常优于中文
2. **一镜一主题** - 每段视频聚焦 1-2 个角色和一个场景
3. **动作要具体** - "runs" 不如 "sprints through a crowded market, dodging people"
4. **对话加情绪** - `"I can't believe it," voice breaking with emotion`
5. **音效要写实** - "room reverb, crowd murmur, wind through trees"
6. **先用 480p 测试** - 确认效果后再用高分辨率渲染

### 示例提示词库

**电影感人物**：
```
A detective in a dimly lit office, cigarette smoke curling through a shaft of 
light from venetian blinds. He picks up an old photograph and says "She was 
here. Three days ago." Ticking clock, paper rustling, distant sirens.
```

**自然风景**：
```
Aerial shot over a misty mountain range at sunrise, golden light breaking 
through clouds, a winding river below reflecting the sky. Camera slowly 
descends toward a hidden valley. Wind sounds, bird calls.
```

**产品展示**：
```
A sleek smartphone slowly rotating on a glass surface, studio lighting with 
soft reflections. Camera orbits 180 degrees, then pushes in to show screen 
detail. Minimal ambient music, subtle glass surface taps.
```

---

## 模型选择建议

| 场景 | 推荐模型 | 理由 |
|------|---------|------|
| **综合最优** | 2.0 Pro | 最新旗舰，全能力支持 |
| **文生视频+音频** | 2.0 Pro / 1.5 Pro | 原生音频+唇形同步 |
| **图生视频** | 2.0 Pro | 图片动画化效果最好 |
| **竖版短视频** | 2.0 Pro (9:16) | 适合抖音/TikTok |
| **快速测试** | 2.0 Pro (480p, 4s) | 成本最低，速度最快 |
| **高质量成品** | 2.0 Pro (1080p, 10-15s) | 最高画质 |
| **静音视频** | 2.0 Pro (--no-audio) | 关闭音频省成本 |

## 注意事项

1. **视频 URL 有效期**：生成的视频 URL 24 小时后失效，请及时下载
2. **图片要求**：图生视频的图片必须是公开可访问的 URL，不支持本地路径
3. **时长范围**：4-15 秒，越长生成越慢、成本越高
4. **内容审核**：不支持上传真实人脸照片，使用插画/风格化角色效果更好
5. **并发限制**：注意 API 并发限额，批量处理时加入适当延迟
6. **API Key 安全**：Key 保存在 `.env` 中，已被 `.gitignore` 排除
