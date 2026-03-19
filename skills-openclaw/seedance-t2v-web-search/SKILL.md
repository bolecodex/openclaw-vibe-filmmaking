---
name: seedance-t2v-web-search
displayName: 联网文生视频
version: 1.0.0
description: 使用 Seedance 2.0 文生视频并开启联网搜索，模型可依据提示词自动检索互联网内容以增强时效性（如商品、天气、实景）。当用户想要文生视频联网、带搜索的文生视频、时效性视频时使用此 skill。
trigger: "文生视频联网|带搜索的文生视频|时效性视频|web search video|联网文生视频"
tools: [filesystem, shell]
---

# 文生视频 + 联网搜索（Seedance 2.0）

基于 [docs/seedance2-0.md](../../docs/seedance2-0.md) 中的**联网搜索**能力，在纯文生视频请求中开启 `tools: [{ "type": "web_search" }]`，模型会根据提示词自主判断是否搜索互联网（如商品、天气、实景），以提升生成视频的时效性与真实感。

## 何时使用

- 提示词涉及近期事件、真实商品、天气、地点等需要时效信息的画面
- 希望模型自动补充可检索到的现实元素
- 仅文生视频；不支持图生/多模态时使用

## API 对应

- **能力**：文生视频 + 联网搜索
- **content**：仅 `text`
- **body**：`tools: [{ "type": "web_search" }]`
- **说明**：实际搜索次数见查询任务 API 返回的 `usage.tool_usage.web_search`；为 0 表示未搜索。时延可能略增。

## 调用方式

通过 shell 调用 [seedance-2/seedance_ark_api.py](../seedance-2/seedance_ark_api.py)：

```bash
# 文档示例：微距玻璃蛙，模型可能搜索真实物种/画面参考
python skills-openclaw/seedance-2/seedance_ark_api.py generate \
  --prompt "微距镜头对准叶片上翠绿的玻璃蛙。焦点逐渐从它光滑的皮肤，转移到它完全透明的腹部，一颗鲜红的心脏正在有力地、规律地收缩扩张。" \
  --web_search \
  --duration 11 --resolution 720p --aspect_ratio 16:9
```

## 提示词建议

- 可包含具体物种、商品名、地点、时间等便于联网检索的关键词
- 对话部分可置于双引号内以优化音频生成（若开启 generate_audio）

## 限制与注意

- **仅文生视频**：不可与 `--image_url`、`--reference_*`、`--first_frame`/`--last_frame` 同时使用
- 时延可能略增；实际是否搜索由模型判断，搜索次数以 `usage.tool_usage.web_search` 为准

## 相关技能

- **文生视频（无联网）**：[seedance-2](../seedance-2/SKILL.md) — 不传 `--web_search` 即可
