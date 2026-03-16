---
name: novel-06-shots-to-ai-video
version: 2.0.0
description: 将分镜头数据转换为 AI 动画视频。读取 shots/*.yaml 分镜文件，使用 Seedance 2.0 Pro 模型（火山方舟 Ark API）生成视频片段，支持图生视频和文生视频两种模式。当用户想要为分镜生成 AI 视频、制作动画片段、将分镜图片转为动态视频时使用此 skill。
trigger: "AI视频|动画视频|shots to ai video|分镜视频|Seedance"
tools: [filesystem, shell]
---

# 分镜头 AI 视频生成（Seedance 2.0）

> **API 调用方式**：通过 shell 调用 CLI 包装器，直接请求火山方舟 Ark REST API：
> ```bash
> # 一站式生成（提交 + 等待 + 下载）
> python /Users/bytedance/Documents/实验/long_video_skills/skills-openclaw/seedance-2/seedance_ark_api.py run --prompt PROMPT [--image_url URL] --duration SEC --resolution RES --aspect_ratio RATIO [--output PATH]
>
> # 分步操作
> python /Users/bytedance/Documents/实验/long_video_skills/skills-openclaw/seedance-2/seedance_ark_api.py generate --prompt PROMPT [--image_url URL] --duration SEC --resolution RES --aspect_ratio RATIO
> python /Users/bytedance/Documents/实验/long_video_skills/skills-openclaw/seedance-2/seedance_ark_api.py get --task_id TASK_ID
> python /Users/bytedance/Documents/实验/long_video_skills/skills-openclaw/seedance-2/seedance_ark_api.py wait --task_id TASK_ID
> ```
>
> **环境变量**（在 `.env` 中配置）：
> - `ARK_API_KEY` - 火山方舟 API Key（必需）
> - `ARK_BASE_URL` - API 地址（默认 `https://ark.cn-beijing.volces.com/api/v3`）
> - `SEEDANCE_MODEL` - 模型名（默认 `doubao-seedance-2-0-pro-260215`）

使用 Seedance 2.0 Pro（火山方舟 Ark API）将分镜头数据转换为 AI 动画视频。Seedance 2.0 使用统一模型，根据输入内容（纯文本 / 文本+图片）自动选择生成模式。

## 项目目录定位规则（必须首先执行）

> **本 skill 的所有读写操作都基于 `{项目目录}`，不是 workspace 根目录。**

`{项目目录}` 是 workspace 根目录下以剧本简称命名的子目录，由上游 skill 创建：

```
{workspace根目录}/
├── {剧本简称}/          ← 这就是 {项目目录}
│   ├── style.yaml
│   ├── shots/
│   └── ...
└── 剧本原文.md
```

### 如何定位

1. 用户指定了项目名 → 直接使用 `{workspace}/{项目名}/`
2. 用户未指定 → 列出 workspace 下的子目录，找到包含 `shots/` 和 `style.yaml` 的目录
3. **禁止**在 workspace 根目录下直接读写产物文件

---

## 模型说明

Seedance 2.0 Pro（`doubao-seedance-2-0-pro-260215`）是统一模型，根据 `content` 数组中的输入类型自动切换模式：

| 输入内容 | 生成模式 | 说明 |
|---------|---------|------|
| 仅 `text` | 文生视频 | 纯文本描述生成视频 |
| `image_url` + `text` | 图生视频 | 以图片为首帧，文本描述动作 |

> Seedance 2.0 不再区分 reference-to-video / image-to-video / text-to-video 子模型，统一使用一个模型。

## 生成模式选择策略

```python
for shot in scene.shots:
    if shot.image_url and shot.image_status == "completed":
        # 模式 1：图生视频（推荐，以分镜图做首帧）
        generate_image_to_video(shot)
    else:
        # 模式 2：文生视频
        generate_text_to_video(shot)
```

> 优先使用图生视频模式，效果更稳定可控。

---

## 工作流程

```
任务进度：
- [ ] 步骤 1：读取资产清单
- [ ] 步骤 2：选择场景
- [ ] 步骤 3：生成 AI 视频
- [ ] 步骤 4：更新状态并展示结果
```

---

## 步骤 1：读取资产清单

读取以下文件：

```
{项目目录}/style.yaml                    # 全局风格配置（视频参数）
{项目目录}/shots/_manifest.yaml          # 分镜索引
```

### 1.1 从 `style.yaml` 提取视频参数

```python
style_base = style_yaml['style_base']                    # 全局风格词（文生视频模式用）
aspect_ratio = style_yaml['video']['aspect_ratio']       # 视频宽高比，如 "9:16"
resolution = style_yaml['video']['resolution']           # 分辨率，如 "720p"
duration_default = style_yaml['video']['duration_default']  # 默认时长，如 "5"
```

### 1.2 从 `_manifest.yaml` 提取

- `characters`: 角色 ID 与描述映射
- `files`: 所有场景分镜文件列表

---

## 步骤 2：选择场景

展示场景列表及资源状态：

```
可用场景：
1. SC_01_开篇悬念 (2 镜头, 图片: 2/2)
2. SC_02_西市日常 (4 镜头, 图片: 4/4)
...

请选择要生成 AI 视频的场景编号（或 "all"）：
```

读取选中场景的分镜 YAML 文件。

---

## 步骤 3：生成 AI 视频

### 3.1 构建视频提示词

视频提示词 = 动作描述 + 场景氛围。

**提示词模板**：

```
{场景描述}，{氛围/光照}。
{角色1动作描述}，{角色1情绪}。
{角色2动作描述}，{角色2情绪}。
{镜头运动描述}。
```

**示例**：

```
简陋卧房内，雨夜暗调，窗外闪电偶尔照亮房间。
一个女子惊醒坐起在床上，眼神惊恐地看向地面。
一个男子躺在床边地上，面容扭曲挣扎，额上青筋暴起。
中景镜头，缓慢推近，紧张恐惧氛围。
```

### 3.2 模式 1：图生视频（推荐）

当镜头有已完成的分镜图片时使用。以分镜图为首帧生成动画。

```bash
python /Users/bytedance/Documents/实验/long_video_skills/skills-openclaw/seedance-2/seedance_ark_api.py run \
  --prompt "简陋卧房内，雨夜暗调，窗外闪电偶尔照亮房间。一个女子惊醒坐起在床上，眼神惊恐地看向地面。中景镜头，缓慢推近。" \
  --image_url "https://example.com/shot_image.png" \
  --duration 5 \
  --resolution 720p \
  --aspect_ratio 9:16
```

> 首帧图片已定义场景，提示词应聚焦于**动作**和**镜头运动**。

### 3.3 模式 2：文生视频

当无分镜图片时使用。纯文本描述生成视频。

```bash
python /Users/bytedance/Documents/实验/long_video_skills/skills-openclaw/seedance-2/seedance_ark_api.py run \
  --prompt "真人写实高清，古风场景。简陋卧房内，雨夜暗调，窗外闪电偶尔照亮房间。一个女子惊醒坐起在床上，眼神惊恐地看向地面。中景镜头，缓慢推近。" \
  --duration 5 \
  --resolution 720p \
  --aspect_ratio 9:16
```

> 文生视频模式下，提示词需要包含完整的风格描述和角色外貌特征。使用 `style_base` + 原始 prompt。

### 3.4 时长选择策略

根据镜头台词数量和内容估算合适时长：

| 台词数 | 建议时长 | 说明 |
|--------|---------|------|
| 0-1 条 | 4-5 秒 | 快速过渡镜头 |
| 2-3 条 | 5-6 秒 | 标准叙事镜头 |
| 4-5 条 | 7-8 秒 | 重要剧情镜头 |
| 6+ 条 | 10-15 秒 | 高潮/转折镜头 |

> Seedance 2.0 支持 4-15 秒时长。

### 3.5 查询任务结果

使用 `wait` 命令自动轮询直到完成：

```bash
python /Users/bytedance/Documents/实验/long_video_skills/skills-openclaw/seedance-2/seedance_ark_api.py wait --task_id TASK_ID --timeout 300
```

或者使用 `run` 命令一站式完成（推荐）。

**轮询策略**（`run` 命令自动处理）：
1. 提交任务后每 10 秒查询一次状态
2. 超时 10 分钟则标记失败
3. 状态为 `succeeded` 时提取视频 URL

---

## 步骤 4：更新状态并展示结果

### 4.1 更新分镜 YAML

每个镜头生成成功后，立即更新 YAML：

```yaml
- id: "SC_07_001"
  # ... 其他字段保持不变
  video_url: "https://ark-output.../xxx.mp4"
  video_status: completed
  video_mode: image   # image / text
  video_duration: "5"
  video_generated_at: "2026-03-08T10:30:00"
```

新增字段说明：

| 字段 | 类型 | 说明 |
|------|------|------|
| `video_url` | string | 生成视频的 URL |
| `video_status` | string | `pending` / `completed` / `failed` |
| `video_mode` | string | 生成模式: `image` / `text` |
| `video_duration` | string | 视频时长（秒） |
| `video_generated_at` | string | 生成时间 |

### 4.2 展示结果

```markdown
## 场景 SC_07_雨夜惊梦 AI 视频生成完成

### 镜头 SC_07_001: 雨夜惊醒
- 模式：图生视频
- 时长：5 秒
- 视频：[点击查看](视频URL)
- 状态：已写入 YAML

---
已自动更新 YAML 文件
如需重新生成某个镜头，请告诉我镜头编号。
```

---

## 完整示例

### 示例：生成 SC_07_001 镜头视频（图生视频模式）

**镜头数据**：
```yaml
- id: "SC_07_001"
  title: "雨夜惊醒"
  shot_type: "中景"
  characters:
    - ref: "@szj_suwan"
      action: 惊醒坐起
      emotion: 惊恐
  mood: 紧张、恐惧
  lighting: 雨夜暗调，闪电
  image_url: "https://example.com/SC_07_001.png"
  image_status: completed
```

**执行命令**：

```bash
python /Users/bytedance/Documents/实验/long_video_skills/skills-openclaw/seedance-2/seedance_ark_api.py run \
  --prompt "简陋卧房内，雨夜暗调，窗外闪电偶尔照亮房间。一个女子惊醒坐起在床上，眼神惊恐地看向地面。中景镜头，缓慢推近，紧张恐惧氛围。" \
  --image_url "https://example.com/SC_07_001.png" \
  --duration 5 \
  --resolution 720p \
  --aspect_ratio 9:16
```

**输出 JSON**（关键字段）：

```json
{
  "id": "task-xxxxx",
  "status": "succeeded",
  "content": [
    {
      "type": "video_url",
      "video_url": {"url": "https://ark-output.../video.mp4"}
    }
  ]
}
```

从 `content[0].video_url.url` 提取视频地址，写入 YAML。

---

## 批量生成策略

### 逐个提交并等待

由于视频生成耗时较长（约 30-120 秒/个），建议：

1. 逐个镜头使用 `run` 命令（自动等待完成）
2. 每完成一个镜头立即写入 YAML
3. 记录已完成的镜头，断点续传

### 重试策略

| 失败原因 | 处理方式 |
|---------|---------|
| 图片 URL 失效 | 提示用户重新生成分镜图片 |
| 生成超时 | 自动重试 1 次 |
| 内容审核失败 | 调整提示词后重试 |
| 无分镜图片 | 回退到文生视频模式 |

---

## 参数参考

### aspect_ratio 选择（从 style.yaml 读取）

视频宽高比统一从 `style.yaml → video.aspect_ratio` 读取：

| 值 | 说明 | 适用场景 |
|----|------|---------|
| `16:9` | 横屏 | B站、YouTube |
| `9:16` | 竖屏 | 抖音、快手 |
| `1:1` | 方形 | 微信朋友圈 |

> **不在本 skill 中硬编码宽高比**，统一由 `style.yaml` 控制，保证与分镜图尺寸一致。

### resolution 选择

| 分辨率 | 速度 | 质量 | 推荐场景 |
|--------|------|------|---------|
| `480p` | 快 | 一般 | 快速预览 |
| `720p` | 中 | 好 | 正式生成（默认）|
| `1080p` | 慢 | 最佳 | 高质量成品 |

### duration 范围

Seedance 2.0 支持 4-15 秒。
