# OpenClaw Studio

> 🎬 **小说 / 剧本 → 分镜 → 配图 · 配音 · AI 视频 → 成片** 的一体化工作台  
> 后台由 **OpenClaw Gateway（业内常称「龙虾」）** 把多模态 AI 工序编排成**可重复执行、可留痕**的标准流程，产出落在**你的项目目录**，而不是散落在聊天记录里。

---

## ✨ 核心特性

| 特性 | 优势 |
|------|------|
| 🚀 **全链路一站式** | 从文本到成片无需切换多工具，预览与日志同屏展示 |
| 🎨 **全局资产统一** | 角色/场景/道具做成可引用资产，保证多镜头风格一致性 |
| ⚡ **增量式迭代** | 支持按步骤/按镜头重跑，修改一处无需从头生成 |
| 📝 **全程可追溯** | 固定技能工序 + 项目目录沉淀，便于协作、审计与版本管理 |
| 🔧 **高可扩展性** | 技能系统支持自定义接入各类大模型与生产工具 |

**一句话**：你在台前**定调、验收、管进度**；龙虾在台后**排队调用画图 / 配音 / 视频 / 大模型**，并把每一版**写进同一个项目**。

---

## 📚 目录

| 章节 | 你会读到什么 |
|------|----------------|
| [解决什么问题](#解决什么问题) | 常见痛点 → 我们提供的核心价值 |
| [业务价值流](#1-业务价值流从-ip-到成片) | 从内容输入到交付的完整流程（附架构图） |
| [角色与分工](#2-角色与分工谁在用) | 不同岗位如何协作，平台统一承载能力（附架构图） |
| [产品工作台](#3-产品工作台一块屏幕里有什么) | 界面分区与功能模块说明（附架构图） |
| [龙虾在任务里](#4-龙虾在一次任务里做什么) | 从操作到结果落盘的完整链路（附架构图） |
| [Vibe 制片](#5-vibe-filmmaking工作方法) | 先定氛围再做细节的高效工作法（附架构图） |
| [技术分层](#6-技术分层怎么读这张图) | 四层技术架构对照说明（附架构图） |
| [部署与信任域](#7-集成与部署三类信任域) | 三类安全域划分与部署建议（附架构图） |
| [标准工序 8 步](#标准工序八步) | 端到端生产流程与技能对照表 |
| [仓库结构](#仓库结构) | 代码目录说明与模块职责 |
| [🚀 快速开始](#快速开始) | 本地启动与基础使用指南 |
| [❓ 常见问题](#常见问题) | 高频问题排查与解决方案 |
| [🤝 贡献指南](#贡献指南) | 参与项目开发的说明 |
| [📄 更多文档](#更多文档) | 延伸阅读与相关材料链接 |

---

## 解决什么问题

| 常见痛点 | OpenClaw Studio + 龙虾 |
|----------|-------------------------|
| 脚本、分镜、出图、配音、剪辑在多个工具间拷来拷去 | **一个界面**跑通主线，预览与日志同屏 |
| 前后镜头人物、场景「不像一部戏」 | **角色 / 场景 / 道具**做成可引用资产，全局对齐 |
| 不知道 AI 跑到哪一步、成片文件在哪 | **流水线 + 实时日志**，结果写回**项目工作区** |
| 改一句词就要从头生成 | **按步骤、按镜头重跑**，不必从零开始 |
| 只有聊天框，版本与审计对不上 | **固定技能工序 + 项目目录沉淀**，便于协作与对接 |

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

| 顺序 | 层 | 白话说明 |
|:----:|----|------|
| ① | **体验层**（OpenClaw Studio Web） | 你在浏览器里操作的一切：项目、流水线、预览、对话、日志。 |
| ② | **应用与编排服务层** | 本仓库提供的 API：工作区、流水线状态、对话、Prompt 构建等；通过 HTTPS / SSE 等与前端通信。 |
| ③ | **OpenClaw Gateway（龙虾）+ Skill 系统** | 智能体与工序封装：按步骤路由工具、会话与重试；技能可扩展。 |
| ④ | **多模态模型服务 + 项目存储** | 画图 / 配音 / 视频 / 大模型等由贵司账号与合同接入；文件与 YAML 落在项目工作区。 |

> 💡 研发若要看详细 API、数据流与配置，请打开根目录 [architecture.html](./architecture.html)；上图是给**快速建立心智模型**用的。

---

## 7. 集成与部署：三类信任域

从左到右：**用户终端**（浏览器访问 Studio）→ **应用与智能体域**（Studio + Gateway / 龙虾，建议内网互通）→ **外部服务域**（各家云 API、密钥与计费由贵司治理）。

![集成与部署：三类信任域](./docs/solution-handbook-diagrams/deployment-trust-zones.svg)

---

## 标准工序（八步）

端到端技能链路与仓库内 Skills 对应关系（模型品牌可按实施替换）：

| 步骤 | 做什么 | 技能 / 能力（示例） | 是否必选 |
|:----:|--------|---------------------|----------|
| 01 | 上传小说 / 剧本 | 文本输入 | ✅ 是 |
| 02 | 剧本 → 场景 | novel-02-script-to-scenes | ✅ 是 |
| 03 | 提取角色资产 | novel-01-character-extractor | ✅ 是 |
| 04 | 场景 → 分镜 | novel-03-scenes-to-storyboard | ✅ 是 |
| 05 | 分镜出图 | novel-04-shots-to-images（如 Seedream） | ✅ 是 |
| 06 | 分镜配音 | novel-05-shots-to-audio（如 Minimax TTS） | ⭕ 可选 |
| 07 | AI 视频镜头 | novel-06-shots-to-ai-video（如 Seedance） | ⭕ 可选 |
| 08 | 合成成片 | novel-07-remotion | ✅ 是 |

**极简流向**：`01 → 02 → 03 → 04 → 05 → [06/07] → 08`（中间任一步可按镜头或按步重跑）。

---

## 仓库结构

```
├── openclaw-studio/          # 前端 (Vite + React) + 后端 (Express) 一体化应用
├── skills-openclaw/          # OpenClaw 技能库（YAML + Markdown 格式）
├── plugins/                  # 扩展插件示例
├── docs/                     # 对客材料、宣讲手册、SVG 图库、投屏 HTML
├── architecture.html         # 研发向：详细分层、API、数据流、配置说明
├── architecture-presentation.html # 架构单页演示页
└── openclaw-extra.json5      # OpenClaw 扩展配置示例
```

- **前端**：左侧项目 / 技能导航；中间内容 Tab；右侧对话与执行面板。  
- **后端**：REST API（workspace、chat、pipeline、skills、render 等）+ Gateway 连接服务。  
- **Skills**：`skills-openclaw/` 内各技能对应上表工序；Gateway 经 MCP / HTTP 等调用外部模型服务。

---

## 🚀 快速开始

### 环境要求
- Node.js 18.x ~ 20.x（不推荐 Node 21+ 版本）
- 部分技能需要 Python 3.10+ 环境
- 可访问的 OpenClaw Gateway（龙虾）服务（默认端口 `18789`）

### 安装与启动
1. **克隆仓库**
   ```bash
   git clone <仓库地址>
   cd long_video_skills
   ```

2. **配置环境变量**
   ```bash
   cp .env.example .env
   # 编辑 .env 文件，填写 Gateway 地址、模型密钥等必要配置
   ```

3. **安装依赖**
   ```bash
   cd openclaw-studio
   npm install
   ```

4. **启动 Gateway 服务**（如果还没启动的话）
   - 参考 Gateway 项目的启动文档，确保服务正常运行在 `http://localhost:18789`

5. **启动 Studio 应用**
   ```bash
   npm run dev
   ```

6. **访问应用**
   打开浏览器访问 `http://localhost:1420`，创建或选择工作空间与项目，即可从「流水线」或对话面板执行各生产步骤。

---

## ❓ 常见问题

<details>
<summary>Q: 启动后提示无法连接 Gateway 怎么办？</summary>
<p>A: 1. 确认 Gateway 服务已经正常启动 2. 检查 `.env` 文件里的 `GATEWAY_URL` 配置是否正确 3. 确认网络可以正常访问 Gateway 服务地址，没有被防火墙拦截</p>
</details>

<details>
<summary>Q: 端口 1420 被占用了怎么修改？</summary>
<p>A: 可以在 `openclaw-studio/package.json` 里修改 `dev` 命令的端口参数，或者启动时指定端口：`npm run dev -- --port <自定义端口>`</p>
</details>

<details>
<summary>Q: 技能执行失败如何排查？</summary>
<p>A: 1. 查看右侧面板的执行日志，看具体报错信息 2. 检查对应技能的配置是否正确 3. 确认相关模型服务的密钥是否有效，额度是否充足</p>
</details>

<details>
<summary>Q: 如何添加自定义技能？</summary>
<p>A: 参考 `skills-openclaw/` 目录下的现有技能格式编写 YAML 配置文件，放置在技能目录下即可被自动识别加载</p>
</details>

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request 参与项目改进：

1. Fork 本仓库
2. 创建你的功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的修改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

---

## 📄 更多文档

| 类型 | 链接 |
|------|------|
| 研发架构（长文） | [architecture.html](./architecture.html) |
| 架构单页演示 | [architecture-presentation.html](./architecture-presentation.html) |
| 对客材料门户（投屏） | [docs/presentation/index.html](./docs/presentation/index.html) |
| 对客索引 + 图库（与本文 SVG 同源） | [docs/对客材料-README.md](./docs/对客材料-README.md) |
| SVG 说明与单独预览页 | [docs/solution-handbook-diagrams/README.md](./docs/solution-handbook-diagrams/README.md) |
| 方案全文（客户版） | [docs/解决方案架构师-对客宣讲手册.md](./docs/解决方案架构师-对客宣讲手册.md) |

---

## 📄 License

见仓库根目录或各子项目说明。
