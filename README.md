# mini-nanobot

nanobot 的 TypeScript 复刻版本，严格按照 nanobot 的逻辑实现。

## 功能

- ✅ Agent Loop - 核心循环，处理用户输入、调用工具、生成回复
- ✅ Context Builder - 构建提示词，加载 SOUL.md
- ✅ Tool Registry - 工具注册和调用系统
- ✅ LLM Provider - LLM API 调用（OpenRouter）
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

## 安装

```bash
npm install
```

## 配置

创建 `.env` 文件：

```bash
# 运行模式
MODE=cli

# LLM 配置
OPENROUTER_API_KEY=your_openrouter_api_key_here

# 飞书配置（可选）
FEISHU_APP_ID=cli_xxxxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxx
```

## 运行

```bash
npm start
```

## 开发阶段

- ✅ Phase 1: 项目结构搭建
- ✅ Phase 2: 核心功能实现
- ✅ Phase 3: 添加更多工具
- ✅ Phase 4: 添加更多交互渠道（飞书机器人）
- ⏳ Phase 5: 细节优化（配置、视觉体验、错误处理、性能）

## 飞书机器人接入

详细教程请查看：[docs/FEISHU_SETUP.md](docs/FEISHU_SETUP.md)

## License

MIT
