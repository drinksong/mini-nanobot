# mini-nanobot

nanobot 的 TypeScript 复刻版本，严格按照 nanobot 的逻辑实现。

## 功能

- ✅ Agent Loop - 核心循环，处理用户输入、调用工具、生成回复
- ✅ Context Builder - 构建提示词，加载 SOUL.md
- ✅ Tool Registry - 工具注册和调用系统
- ✅ LLM Provider - 多提供商支持（OpenRouter、VolcEngine、Anthropic、OpenAI、DeepSeek、Gemini、智谱、通义千问、Kimi）
- ✅ CLI Channel - 命令行交互
- ✅ Feishu Channel - 飞书机器人交互（使用官方 `@larksuiteoapi/node-sdk` 的 WebSocket 长连接模式）

## 已实现的工具

- `read_file` - 读取文件内容
- `write_file` - 写入文件
- `edit_file` - 替换文件中的文本
- `list_dir` - 列出目录内容
- `exec` - 执行 shell 命令
- `web_search` - 网络搜索（DuckDuckGo）
- `message` - 发送消息

## 目录结构

```
src/
├── agent/              # Agent 核心逻辑
│   ├── context.ts      # 上下文构建器
│   ├── loop.ts         # Agent 循环
│   └── tools/          # 工具实现
│
├── channels/           # 交互渠道
│   ├── cli.ts          # 命令行交互
│   └── feishu.ts       # 飞书机器人交互
│
├── providers/          # LLM 提供商
│   ├── llm.ts          # 统一 LLM 提供商
│   └── registry.ts     # 提供商注册表
│
└── index.ts            # 入口文件
```

详细说明请查看：[docs/STRUCTURE.md](docs/STRUCTURE.md)

## 安装

```bash
npm install
```

## 配置

创建 `.env` 文件，选择一个 LLM 提供商：

```bash
# 使用火山引擎（推荐国内用户）
VOLCENGINE_API_KEY=your_volcengine_api_key_here
LLM_MODEL=volcengine/doubao-pro-32k

# 或使用 OpenRouter（支持多个模型）
OPENROUTER_API_KEY=your_openrouter_api_key_here
LLM_MODEL=anthropic/claude-3.5-sonnet

# 运行模式
MODE=cli

# 飞书配置（可选）
FEISHU_APP_ID=cli_xxxxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxx
```

### 支持的 LLM 提供商

| 提供商 | 环境变量 | 示例模型 |
|--------|----------|----------|
| OpenRouter | `OPENROUTER_API_KEY` | `anthropic/claude-3.5-sonnet` |
| VolcEngine | `VOLCENGINE_API_KEY` | `volcengine/doubao-pro-32k` |
| Anthropic | `ANTHROPIC_API_KEY` | `claude-3.5-sonnet` |
| OpenAI | `OPENAI_API_KEY` | `gpt-4o-mini` |
| DeepSeek | `DEEPSEEK_API_KEY` | `deepseek-chat` |
| Gemini | `GEMINI_API_KEY` | `gemini-pro` |
| 智谱 AI | `ZHIPUAI_API_KEY` | `glm-4` |
| 通义千问 | `DASHSCOPE_API_KEY` | `qwen-max` |
| Moonshot | `MOONSHOT_API_KEY` | `kimi-k2.5` |

## 运行

```bash
npm start
```

### 飞书机器人模式

```bash
MODE=feishu npm start
```

## 开发阶段

- ✅ Phase 1: 项目结构搭建
- ✅ Phase 2: 核心功能实现
- ✅ Phase 3: 添加更多工具
- ✅ Phase 4: 添加更多交互渠道（飞书机器人）
- ✅ Phase 5: 多提供商支持
- ✅ Phase 6: 目录结构优化（参考 nanobot 源码）
- ⏳ Phase 7: 细节优化（配置、视觉体验、错误处理、性能）

## 飞书机器人接入

详细教程请查看：[docs/FEISHU_SETUP.md](docs/FEISHU_SETUP.md)

## License

MIT
