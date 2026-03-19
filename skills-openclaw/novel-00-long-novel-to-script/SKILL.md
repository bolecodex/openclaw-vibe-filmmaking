---
name: novel-00-long-novel-to-script
displayName: 长篇小说分块转剧本
version: 1.0.0
description: 百万字级长篇小说分块 Map-Reduce 转为漫剧剧本。切块、story_bible、分幕剧本、断点续跑。当小说超长无法一次进上下文、或需从 novel_chunks_manifest 续跑时使用。
trigger: "长篇小说|百万字|分块剧本|novel_chunks|story_bible|断点续跑"
tools: [filesystem, shell]
---

# 长篇小说 → 剧本（分块 Map-Reduce）

**禁止**将整本小说一次性读入模型上下文。必须按 manifest 逐块处理。

## 何时用本技能

- 原文明显超出单请求安全长度（通常 >3～5 万字即应考虑分块）。
- 若全文 &lt;4 万字且用户明确要求一次性改写，可跳过切块，直接输出 `{项目名}_剧本.md`（仍建议保留 `story_bible.yaml` 骨架）。

## 目录与例外

允许且必须使用子目录（与本仓库其他技能不同）：

- `{项目目录}/novel_chunks/chunk_XXXX.md` — 原文块
- `{项目目录}/.pipeline/novel_chunks_manifest.json` — 进度
- `{项目目录}/novel_analysis/chunk_XXXX_analysis.md` — 每块情节节拍分析
- `{项目目录}/story_bible.yaml` — 全局圣经
- `{项目目录}/_剧本_第N幕.md` — 分幕剧本
- `{项目目录}/{项目名}_剧本.md` — 最终汇编

## 阶段 0：切块（仅脚本）

在项目目录执行（按实际路径调整）：

```bash
python skills-openclaw/novel-00-long-novel-to-script/scripts/split_novel.py \
  --novel "/绝对路径/小说.txt" \
  --project-dir "{项目目录}" \
  --max-chars 12000 \
  --overlap 400 \
  --project-name "{项目名}"
```

- `--no-chapters`：无视章节标题，纯固定窗口。
- 切块完成后检查 manifest 中 `total_chunks`。

## 阶段 1：逐块分析（循环直到无 pending）

对 manifest 中每个 `status: pending` 的 chunk：

1. **只读取**当前 `novel_chunks/chunk_XXXX.md` + 当前 `story_bible.yaml`（若不存在则从 `story_bible.template.yaml` 复制初始化）。
2. 输出到 `novel_analysis/chunk_XXXX_analysis.md`，结构建议：
   - 情节节拍（条列）
   - 关键对白要点（非全文照抄）
   - 本块新登场人物/地名
   - `bible_patch` 小节（YAML 代码块，可被 merge 使用）
3. 将 `bible_patch` 存为 `novel_analysis/chunk_XXXX_bible_patch.yaml`，执行合并：

```bash
python skills-openclaw/novel-00-long-novel-to-script/scripts/merge_bible.py \
  --bible "{项目目录}/story_bible.yaml" \
  --patch "{项目目录}/novel_analysis/chunk_XXXX_bible_patch.yaml"
```

（需 `pip install pyyaml`）

4. 更新 manifest：该 chunk 的 `phases.analyzed`、`phases.bible_merged` 为 true，`status` 改为 `analyzed`。

**Human-in-the-loop（可选）**：每完成 10 块，可暂停让用户确认 `story_bible.yaml` 再继续。

## 阶段 2：分幕剧本

依据 manifest 中 `acts`：每个 act 对应连续若干 chunk。

对每个 act：

1. 读取这些 chunk 的 `novel_analysis/chunk_*_analysis.md` + 完整 `story_bible.yaml`。
2. 写出漫剧剧本片段到 `_剧本_第N幕.md`（场次、对白、旁白、节奏提示，格式需与下游 `novel-02-script-to-scenes` 兼容：可拍、可剪、可分镜）。
3. 更新 manifest 中对应 `acts[].status = done`。

## 阶段 3：汇编

```bash
python skills-openclaw/novel-00-long-novel-to-script/scripts/stitch_script.py \
  --project-dir "{项目目录}"
```

生成 `{项目名}_剧本.md`。将 manifest 中所有 chunk `status` 标为 `completed`（若已全部完成）。

## 断点续跑

1. 读取 `.pipeline/novel_chunks_manifest.json`。
2. 找到第一个 `phases.analyzed: false` 的 chunk，从该块继续。
3. 若 acts 已有 `done`，汇编时 stitch 会跳过缺失文件 — 确保每幕文件存在后再 stitch。

## 下游

完成后用户可执行 **剧本转场景**（`novel-02-script-to-scenes`），输入为 `{项目名}_剧本.md`。
