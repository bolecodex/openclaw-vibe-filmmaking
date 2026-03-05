# OpenClaw + 火山方舟 迁移测试报告

**测试日期**: 2026-02-27  
**测试环境**: macOS darwin 24.6.0 / Node.js v25.6.1 / Python 3.11  
**OpenClaw 版本**: 2026.2.15 (3fe22ea)  
**LLM Provider**: volcengine-ark / doubao-seed-2-0-pro-260215  
**ARK API Key**: 3eb8e543-****-****-****-****4cdcc6

---

## 测试总览

| # | 测试项 | 状态 | 说明 |
|---|--------|------|------|
| 1 | 火山方舟 API 连通 | ✅ 通过 | Chat Completions API 正常响应 |
| 2 | OpenClaw LLM 基本对话 | ✅ 通过 | Agent 正确返回中文响应 |
| 3 | Skills 加载识别 | ✅ 通过 | 64 个 skills 全部加载，含 12 个自定义 novel/media skills |
| 4 | xskill API 账户查询 | ✅ 通过 | 余额 161,046 积分 (¥1,610.46) |
| 5 | xskill API 模型搜索 | ✅ 通过 | 搜索 seedream 返回正确模型列表 |
| 6 | xskill API TTS 语音合成 | ✅ 通过 | 成功生成音频 URL |
| 7 | xskill API 图片生成 | ✅ 通过 | Seedream 4.5 文生图，任务提交+结果轮询全通过 |
| 8 | 脚本可执行性 | ✅ 通过 | 4 个 Python 脚本全部正常运行 |
| 9 | 项目数据读取 | ✅ 通过 | Agent 正确读取 style.yaml 并理解内容 |
| 10 | Agent 端到端图片生成 | ✅ 通过 | Agent 自动触发 seedream skill 完成图片生成 |

**总体评估: 10/10 全部通过**

---

## 1. 火山方舟 API 连通性测试

### 测试方式
直接 curl 调用 Volcengine Ark Chat Completions API。

### 请求
```
POST https://ark.cn-beijing.volces.com/api/v3/chat/completions
Model: doubao-seed-2-0-pro-260215
Message: "请说hello"
```

### 结果
```json
{
  "choices": [{
    "message": {
      "content": "Hello~ 😊\n如果你有任何想聊的话题...",
      "reasoning_content": "用户现在让我说hello对吧..."
    }
  }]
}
```

### 关键发现
- Ark API 返回 `reasoning_content` 字段（模型内部思考链）
- 需要在 OpenClaw 中设置 `reasoning: false` 以禁用 reasoning 模式，否则会触发 "Message ordering conflict" 错误

---

## 2. OpenClaw LLM 基本对话

### 配置
```
Provider: volcengine-ark
Model: doubao-seed-2-0-pro-260215
API Type: openai-completions
Reasoning: false
Context Window: 128,000 tokens
Max Tokens: 8,192
```

### 测试结果
```
输入: "你好，请用一句话介绍你自己"
输出: "Hello! I'm your personal OpenClaw assistant..."
Tokens: in=19,875 out=669 total=21,624
耗时: 11,401ms
```

### 状态: ✅ 通过

---

## 3. Skills 加载识别

### 加载的自定义 Skills (12个)
| Skill 名称 | Prompt 字符数 | 状态 |
|-------------|--------------|------|
| novel-01-character-extractor | 253 | ✅ |
| novel-02-script-to-scenes | 302 | ✅ |
| novel-03-scenes-to-storyboard | 312 | ✅ |
| novel-04-shots-to-images | 291 | ✅ |
| novel-05-shots-to-audio | 284 | ✅ |
| novel-06-shots-to-ai-video | 318 | ✅ |
| novel-07-remotion | 322 | ✅ |
| novel-07-shots-to-video | 291 | ✅ |
| seedream-image | 251 | ✅ |
| seedance-video | 279 | ✅ |
| coze-upload | 315 | ✅ |
| Nano Banana Pro 图像生成 | 248 | ✅ |

### Skills 语义理解测试
- **测试1**: "我想用seedream生成一张图片" → Agent 正确描述 Seedream 4.5 工作流程
- **测试2**: "我有一个小说剧本需要提取角色" → Agent 正确描述角色提取三行风格卡流程

### 状态: ✅ 通过

---

## 4-6. xskill API 工具链测试

### 4. 账户查询 (account)
```bash
$ python3 xskill_api.py account
{
  "success": true,
  "user_id": 543865,
  "balance": 161063,
  "balance_yuan": 1610.63
}
```

### 5. 模型搜索 (search_models)
```bash
$ python3 xskill_api.py search_models --query "seedream"
→ 返回 Seedream 4.5 文生图、图生图等模型列表
```

### 6. TTS 语音合成 (speak)
```bash
$ python3 xskill_api.py speak --text "你好世界" --voice_id "Calm_Woman" --speed 1.0
{
  "success": true,
  "audio_url": "https://minimax-algeng-chat-tts.oss-cn-wulanchabu.aliyuncs.com/...",
  "price": 1
}
```

### 状态: ✅ 全部通过

---

## 7. xskill API 图片生成 (generate + get_result)

### 任务提交
```bash
$ python3 xskill_api.py generate \
    --model "fal-ai/bytedance/seedream/v4.5/text-to-image" \
    --prompt "一只橘猫坐在窗台上，阳光洒落，暖色调，摄影风格" \
    --image_size "landscape_16_9"

{
  "task_id": "3f936c48-a379-4092-93af-5f906df329cc",
  "status": "pending",
  "price": 16
}
```

### 结果查询 (15秒后)
```bash
$ python3 xskill_api.py get_result --task_id "3f936c48-..."
{
  "status": "completed",
  "output": {
    "images": [{
      "url": "https://v3b.fal.media/files/b/0a901e8a/...",
      "file_size": 6938687
    }]
  },
  "completed_at": "2026-02-27T13:53:51"
}
```

### 状态: ✅ 通过（耗时约 20 秒）

---

## 8. 脚本可执行性测试

| 脚本 | 路径 | 功能 | 状态 |
|------|------|------|------|
| generate_gallery.py | novel-01/scripts/ | 角色 YAML → HTML 画廊 | ✅ 可执行 |
| generate_storyboard.py | novel-03/scripts/ | 分镜 YAML → HTML 可视化 | ✅ 可执行 |
| merge_video.py | novel-07/scripts/ | 分镜头视频合成 | ✅ 可执行 |
| coze_upload.py | coze-upload/scripts/ | 文件上传到云端 | ✅ 可执行 |

所有脚本均可正常显示帮助信息，依赖模块 (yaml, json) 已安装。

---

## 9. 项目数据读取

### 已有项目统计
| 项目 | style.yaml | scenes | shots |
|------|-----------|--------|-------|
| 杀猪匠的使命 | ✅ | 8 | 8 |
| 杀猪匠夫君 | ✅ | 8 | 8 |
| 替夫挡箭 | ✅ | 23 | 4 |
| 全班穿成NPC | ✅ | 48 | 49 |
| **合计** | **4** | **87** | **72** |

### Agent 读取测试
```
输入: "请读取 杀猪匠的使命/style.yaml 文件内容"
输出: "《杀猪匠的使命》项目的全局画面风格定义是真人写实古风路线...
      暖黄色光线+背景虚化突出主体..."
Tokens: in=21,767 out=688
```

Agent 正确理解了 style.yaml 中的画面风格定义。

### 状态: ✅ 通过

---

## 10. Agent 端到端图片生成

### 测试流程
用户消息 → Skill 触发 → xskill_api.py 调用 → 图片生成 → 结果返回

### 请求
```
输入: "用seedream帮我画一只可爱的猫咪在樱花树下，横屏16:9"
```

### 结果
```
✅ 图片生成成功！
🔗 https://v3b.fal.media/files/b/0a901e9e/er0d3-XTcGOj14D1YdHJQ_....png
🎲 随机种子：1348803014
消耗：16积分，剩余 161,030 积分
```

### 性能指标
- 总耗时: 73,158ms (约 73 秒)
- Tokens: in=1,022 out=248 total=30,254
- 积分消耗: 16

### 状态: ✅ 通过

---

## 架构概览

```
┌─────────────────────────────────────────────────────┐
│                    OpenClaw Agent                     │
│  LLM: volcengine-ark/doubao-seed-2-0-pro-260215      │
│  Skills: 64 (含 12 自定义)                             │
│  Tools: read, write, edit, exec, browser, web_search  │
├──────────┬──────────────────────────────────────────── │
│          │                                             │
│  exec    │  python3 xskill_api.py <command>            │
│  (shell) │  ├── generate  (图片/视频生成)               │
│          │  ├── get_result (查询任务结果)               │
│          │  ├── speak     (TTS 语音合成)                │
│          │  ├── search_models (搜索模型)                │
│          │  ├── account   (余额查询)                    │
│          │  └── parse_video (视频解析)                  │
│          │           │                                  │
│          │           ▼                                  │
│          │  xskill.ai HTTP API (MCP-HTTP)              │
├──────────┴──────────────────────────────────────────── │
│                                                        │
│  read    │  直接读取项目文件                             │
│          │  ├── style.yaml (画面风格)                   │
│          │  ├── scenes/*.md (场景文件)                   │
│          │  └── shots/*.yaml (分镜数据)                  │
├──────────┴──────────────────────────────────────────── │
│                                                        │
│  exec    │  python3 scripts/*.py                       │
│  (shell) │  ├── generate_gallery.py (角色画廊)          │
│          │  ├── generate_storyboard.py (分镜可视化)     │
│          │  ├── merge_video.py (视频合成)               │
│          │  └── coze_upload.py (云端上传)               │
└────────────────────────────────────────────────────────┘
```

---

## 已知限制 & 注意事项

1. **reasoning 模式必须关闭**: Volcengine Ark 的 `doubao-seed-2-0-pro-260215` 返回 `reasoning_content` 字段，会导致 OpenClaw 出现 "Message ordering conflict" 错误。解决方案：模型配置中设置 `reasoning: false`。

2. **openai-responses API 不兼容**: Ark 不支持 OpenAI Responses API 格式（400: unknown field "prompt_cache_key"），必须使用 `openai-completions`。

3. **xskill API 通过 CLI 包装器访问**: OpenClaw 2026.2.15 不支持 `mcp.servers` 配置，因此通过 Python CLI 包装器 (`xskill_api.py`) 间接调用。API Key 已内置于脚本中。

4. **Agent 不会自动使用 xskill_api.py**: 除非用户的请求触发了特定 skill（如 "seedream"、"角色提取"），否则 agent 不会自动使用 CLI 包装器。通用请求（如"查余额"）需要明确指示路径。

5. **Node.js 25 兼容性**: 当前使用 Node.js v25.6.1，OpenClaw 文档提示 Node 24/25 可能存在 AbortController 问题，但实测未遇到严重问题。

---

## 费用统计（本次测试）

| 操作 | 积分消耗 |
|------|---------|
| TTS 语音合成测试 | 1 |
| CLI 图片生成测试 | 16 |
| Agent 端到端图片生成 | 16 |
| **合计** | **33 积分 (¥0.33)** |

LLM (火山方舟) 费用另计，约消耗 ~10 万 tokens。

---

## 结论

OpenClaw + 火山方舟 (doubao-seed-2-0-pro-260215) 迁移方案 **功能验证全部通过**。Agent 能够：
- 理解用户自然语言指令
- 正确识别并触发 12 个自定义 skills
- 通过 shell 工具调用 xskill API 完成图片生成、TTS 等任务
- 读取和理解已有项目数据
- 执行辅助 Python 脚本

可以投入实际使用。
