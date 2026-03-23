# OpenClaw Studio

**小说 / 剧本 → 分镜 → 配图 · 配音 · AI 视频 → 成片** 的一体化工作台；后台由 **OpenClaw Gateway（业内常称「龙虾」）** 把多模态 AI 工序编排成**可重复执行、可留痕**的标准流程，产出落在**你的项目目录**，而不是散落在聊天记录里。

---

## 目录

| 章节 | 你会读到什么 |
|------|----------------|
| [解决什么问题](#解决什么问题) | 痛点 → 我们提供的价值 |
| [业务价值流](#1-业务价值流从-ip-到成片) | 从内容输入到交付的主线（图） |
| [角色与分工](#2-角色与分工谁在用) | 岗位怎么协作、平台统一承载什么（图） |
| [产品工作台](#3-产品工作台一块屏幕里有什么) | 左中右分区与 Tab 含义（图） |
| [龙虾在任务里](#4-龙虾在一次任务里做什么) | 从点击到落盘的链路（图） |
| [Vibe 制片](#5-vibe-filmmaking工作方法) | 先氛围再镜头，减少整段推翻（图） |
| [技术分层](#6-技术分层怎么读这张图) | 四层架构对照说明（图） |
| [部署与信任域](#7-集成与部署三类信任域) | 浏览器 / 应用与智能体 / 外部服务（图） |
| [标准工序 8 步](#标准工序八步) | 技能与工具对照表 |
| [仓库结构 · 快速开始 · 文档](#仓库结构) | 研发上手与延伸阅读 |

---

## 解决什么问题

| 常见痛点 | OpenClaw Studio + 龙虾 |
|----------|-------------------------|
| 脚本、分镜、出图、配音、剪辑在多个工具间拷来拷去 | **一个界面**跑通主线，预览与日志同屏 |
| 前后镜头人物、场景「不像一部戏」 | **角色 / 场景 / 道具**做成可引用资产，全局对齐 |
| 不知道 AI 跑到哪一步、成片文件在哪 | **流水线 + 日志**，结果写回**项目工作区** |
| 改一句词就要从头生成 | **按步骤、按镜头重跑**，不必从零开始 |
| 只有聊天框，版本与审计对不上 | **固定技能工序 + 项目目录沉淀**，便于协作与对接 |

**一句话**：你在台前**定调、验收、管进度**；龙虾在台后**排队调用画图 / 配音 / 视频 / 大模型**，并把每一版**写进同一个项目**。

---

## 1. 业务价值流：从 IP 到成片

下图从左到右读即可：**输入 → 结构化 → 资产 → 视听 → 交付**。

![业务价值流：从 IP 到成片](./docs/solution-handbook-diagrams/business-value-stream.svg)

- **内容输入**：剧本、设定、IP 材料。  
- **结构化生产**：场景切分、分镜脚本，让后续步骤「有据可依」。  
- **数字资产**：角色 / 场景 / 道具可引用，保证多镜头一致性。  
- **视听产出**：按镜头的图、音、视频，可反复迭代到满意。  
- **交付审阅**：合成成片、内审与对外发布仍按贵司流程走。

---

## 2. 角色与分工：谁在用？

编导策划、美术分镜、运营发行、技术中台可在同一套能力上分工；**底层能力是同一套平台**，避免「每人一套工具、口径对不齐」。

![干系人与能力域（可按岗位分工）](./docs/solution-handbook-diagrams/business-roles-capabilities.svg)

---

## 3. 产品工作台：一块屏幕里有什么？

**左**：项目与文件树、技能与标准工序入口。  
**中**：主界面 Tab——上行偏**总控与资产**（概览、流水线、风格、角色、场景、道具），下行偏**镜头级出品**（分镜图、音频、视频、剪辑）。  
**右**：流水线执行、对话触发单步/单镜、日志与异常排查。

![产品工作台：一屏完成管项目 · 跑工序 · 看出品](./docs/solution-handbook-diagrams/product-workbench.svg)

---

## 4. 龙虾在一次任务里做什么？

你在 Studio 里点某一步或发对话指令后，系统整理**项目上下文** → Gateway（龙虾）按 **Skill** 编排调用 → 多模态服务出结果 → **写回项目目录**并在界面预览。

![从点击到落盘：龙虾在其中的位置](./docs/solution-handbook-diagrams/openclaw-task-flow.svg)

---

## 5. Vibe Filmmaking：工作方法

先对齐整部戏的**气质与节奏（Vibe）**，再落到单镜细抠，减少「一开始就钉死细节、后面整段推翻」的浪费；定调之后，后续镜头可**沿用同一套资产**批量延展。

![先氛围、再试镜、再收敛交付](./docs/solution-handbook-diagrams/vibe-filmmaking-loop.svg)

---

## 6. 技术分层：怎么读这张图？

按 **自上而下** 对照下图即可，不必记组件名：

![技术架构（四层）](./docs/solution-handbook-diagrams/tech-four-layers.svg)

| 顺序 | 层 | 白话 |
|:----:|----|------|
| ① | **体验层**（OpenClaw Studio Web） | 你在浏览器里操作的一切：项目、流水线、预览、对话、日志。 |
| ② | **应用与编排服务层** | 本仓库提供的 API：工作区、流水线状态、对话、Prompt 构建等；通过 HTTPS / SSE 等与前端通信。 |
| ③ | **OpenClaw Gateway（龙虾）+ Skill 系统** | 智能体与工序封装：按步骤路由工具、会话与重试；技能可扩展。 |
| ④ | **多模态模型服务 + 项目存储** | 画图 / 配音 / 视频 / 大模型等由贵司账号与合同接入；文件与 YAML 落在项目工作区。 |

> **和「整坨架构脑图」的区别**：研发若要看 API、数据流与配置，请打开根目录 [architecture.html](./architecture.html)；上图是给**快速建立心智模型**用的。

---

## 7. 集成与部署：三类信任域

从左到右：**用户终端**（浏览器访问 Studio）→ **应用与智能体域**（Studio + Gateway / 龙虾，建议内网互通）→ **外部服务域**（各家云 API、密钥与计费由贵司治理）。

![集成与部署：三类信任域](./docs/solution-handbook-diagrams/deployment-trust-zones.svg)

---

## 标准工序（八步）

端到端技能链路与仓库内 Skills 对应关系（模型品牌可按实施替换）：

| 步骤 | 做什么 | 技能 / 能力（示例） |
|:----:|--------|---------------------|
| 01 | 上传小说 / 剧本 | 文本输入 |
| 02 | 剧本 → 场景 | novel-02-script-to-scenes |
| 03 | 提取角色资产 | novel-01-character-extractor |
| 04 | 场景 → 分镜 | novel-03-scenes-to-storyboard |
| 05 | 分镜出图 | novel-04-shots-to-images（如 Seedream） |
| 06 | 分镜配音 | novel-05-shots-to-audio（如 Minimax TTS） |
| 07 | AI 视频镜头 | novel-06-shots-to-ai-video（如 Seedance） |
| 08 | 合成成片 | novel-07-remotion |

**极简流向**：`01 → 02 → 03 → 04 → 05 → 06 → 07 → 08`（中间任一步可按镜头或按步重跑）。

---

## 仓库结构

```
├── openclaw-studio/          # 前端 (Vite + React) + 后端 (Express)
├── skills-openclaw/          # OpenClaw Skills（YAML + Markdown）
├── plugins/                  # 插件示例
├── docs/                     # 对客材料、宣讲手册、SVG 图库、投屏 HTML
├── architecture.html         # 研发向：分层、API、数据流、配置
├── architecture-presentation.html
└── openclaw-extra.json5      # OpenClaw 扩展配置示例
```

- **前端**：左侧项目 / 技能；中间 Tab；右侧对话与执行面板。  
- **后端**：REST（workspace、chat、pipeline、skills、render 等）+ 连接 Gateway。  
- **Skills**：`skills-openclaw/` 内各技能对应上表工序；Gateway 经 MCP / HTTP 等调用外部模型服务。

---

## 快速开始

1. **环境**：Node 18+；部分 Skill 需 Python 3.10+。  
2. **配置**：复制 `.env.example` 为 `.env`，填写 Gateway 地址、模型与密钥等。  
3. **启动 OpenClaw Gateway**：本机或可访问环境（常见默认端口 `18789`）。  
4. **启动本仓库**：
   ```bash
   cd openclaw-studio && npm install && npm run dev
   ```
5. 浏览器打开前端（如 `http://localhost:1420`），创建或选择工作空间与项目，从「流水线」或对话执行各步。

---

## 更多文档

| 类型 | 链接 |
|------|------|
| 研发架构（长文） | [architecture.html](./architecture.html) |
| 架构单页演示 | [architecture-presentation.html](./architecture-presentation.html) |
| 对客材料门户（投屏） | [docs/presentation/index.html](./docs/presentation/index.html) |
| 对客索引 + 图库（与本文 SVG 同源） | [docs/对客材料-README.md](./docs/对客材料-README.md) |
| SVG 说明与单独预览页 | [docs/solution-handbook-diagrams/README.md](./docs/solution-handbook-diagrams/README.md) |
| 方案全文（客户版） | [docs/解决方案架构师-对客宣讲手册.md](./docs/解决方案架构师-对客宣讲手册.md) |

---

## License

见仓库根目录或各子项目说明。
