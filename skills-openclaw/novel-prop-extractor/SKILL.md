---
name: novel-prop-extractor
version: 1.0.0
description: 从剧本/分镜中提取关键道具（武器、信物、法宝等），生成道具资产 YAML 并为每个道具生成配图。当用户需要提取道具、建立道具库、生成道具图时使用此 skill。
trigger: "提取道具|道具资产|道具出图|prop extract"
tools: [filesystem, shell]
---

# 道具提取与出图

从剧本或分镜内容中识别关键道具（武器、信物、法宝、重要物品等），输出 `{项目名}_道具资产.yaml`，并可选择为每个道具生成一张代表图。

## 产物路径

- **道具资产**：`{项目目录}/{项目名}_道具资产.yaml`
- **道具图**：`{项目目录}/assets/props/{prop_id}.png`

YAML 结构示例：

```yaml
props:
  - id: prop_01
    name: 青龙偃月刀
    description: 关羽所用长刀，青龙纹饰……
    category: 武器
    image_path: assets/props/prop_01.png
    image_status: completed
```

## 执行流程

### 操作 1：提取全部道具

1. 读取项目内剧本/对话脚本或分镜 YAML，识别文中出现的**关键道具**（对剧情或角色有标志意义的物品）。
2. 为每个道具分配唯一 `id`（如 `prop_01`）、`name`、`description`、可选 `category`（武器/信物/法宝/其他）。
3. 在 `{项目目录}` 下创建或更新 `{项目名}_道具资产.yaml`，写入 `props` 数组。若目录或文件不存在则先创建。

### 操作 2：全部道具出图 / 重新生成选中道具的配图

1. 读取 `{项目名}_道具资产.yaml` 和 `style.yaml`（取 `style_base` 等保证画风一致）。
2. **全部道具出图**：对 `props` 中所有项生成配图（可跳过已有 `image_status === "completed"` 且本地文件存在的）。
3. **重新生成选中道具的配图**：仅对「目标对象」中给出的道具 ID 生成/覆盖配图。
4. 对每个待处理道具：根据 `name`、`description`、`category` 构建画面提示词，调用图像生成接口，保存为 `assets/props/{id}.png`，并在该道具对象上写入 `image_path`、`image_status: "completed"`，写回 YAML。

## 注意事项

- 所有产物必须在 `{项目目录}` 下。
- 道具 ID 建议与角色/场景命名风格一致（如 `prop_01`、`prop_weapon_01`）。
- 配图提示词需包含 `style_base`，以与全剧风格统一。
