---
name: novel-scenes-to-images
displayName: 场景环境配图
version: 1.0.0
description: 为每个场景生成一张场景图。读取场景索引与 style.yaml，根据场景的 location、mood、time_period 等生成画面，写入 assets/scenes/ 并更新场景索引中的 image_path。当用户需要场景出图、生成场景图、为场景配图时使用此 skill。
trigger: "场景出图|场景图|scenes to images|生成场景图"
tools: [filesystem, shell]
---

# 场景图生成

为项目中每个场景生成一张代表该场景的 AI 绘画图像，用于场景列表展示与分镜参考。读取 `{项目名}_场景索引.yaml` 与 `style.yaml`，按场景的 location、mood、time_period、name 构建提示词，调用图像模型生成图片，保存到 `assets/scenes/` 并回写场景索引。

## 项目目录与产物路径

- **项目目录**：由上游「剧本转场景」确定，即包含 `*_场景索引.yaml` 和 `scenes/` 的子目录。
- **场景索引**：`{项目目录}/{项目名}_场景索引.yaml`，其中 `scenes` 数组每项含 `id`、`name`、`location`、`time_period`、`mood` 等。
- **场景图输出**：`{项目目录}/assets/scenes/{scene_id}.png`（例如 `SC_01.png`）。
- **回写字段**：在每个场景对象上写入 `image_path: "assets/scenes/{scene_id}.png"` 和 `image_status: "completed"`（若为远程 URL 可写 `image_url`）。

## 执行流程

### 1. 读取资产

1. 读取 `{项目目录}/style.yaml`，提取 `style_base`（全局风格词）、`negative_prompt`（若有）。所有场景图提示词必须包含 `style_base`，保证与全剧画风一致。
2. 读取 `{项目目录}/{项目名}_场景索引.yaml`，得到 `scenes` 列表。确认每个 scene 有 `id`、`name`、`location`、`time_period`、`mood` 等字段。

### 2. 确定待出图场景

- **操作 = 全部场景出图**：对 `scenes` 中所有场景出图（可跳过已存在 `image_status === "completed"` 且本地文件存在的）。
- **操作 = 重新生成选中场景的场景图**：仅对「目标对象」中给出的场景 ID（如 `SC_01`）出图；若未给出则报错提示需选中场景。

### 3. 为每个场景生成图像

对每个待处理场景：

1. **构建提示词**：  
   `{style_base}, 场景名:{name}, 地点:{location}, 时代/时间:{time_period}, 氛围:{mood}, 画面要求:该场景的代表性画面, 构图完整, 适合作为场景封面。`  
   可根据 `notes` 或场景内容做适当补充，但不要偏离场景设定。
2. **调用图像生成**：使用参数中的 `image_model`、`image_size`（默认横版 16:9 适合场景）。与「分镜出图」「角色出图」使用同一套 MCP/CLI 图像接口（如 `xskill_api.py generate` 等）。
3. **保存文件**：将生成结果保存为 `{项目目录}/assets/scenes/{scene.id}.png`，若目录不存在则先 `mkdir -p`。
4. **更新场景索引**：在该场景对象上设置 `image_path: "assets/scenes/{scene.id}.png"`、`image_status: "completed"`；若有远程 URL 可同时写 `image_url`。**必须**写回 `{项目名}_场景索引.yaml`（整体读入 → 修改对应 scene → 写回），或通过后端提供的更新接口（如 `updateScene`）回写。

### 4. 结果汇报

简要列出：已处理场景数、成功数、失败数；若有失败，写出场景 ID 与原因。

## 注意事项

- 所有产物必须在 `{项目目录}` 下，禁止写入 workspace 根目录。
- 图片尺寸建议使用 `landscape_16_9`（横版）以符合场景展示习惯，除非参数指定其他比例。
- 若某场景已有 `image_status === "completed"` 且本地文件存在，可选跳过；「重新生成选中场景」则强制覆盖该场景图。
