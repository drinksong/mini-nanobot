# mini-nanobot 目录结构

```
mini-nanobot/
├── src/
│   ├── agent/              # Agent 核心逻辑
│   │   ├── context.ts      # 上下文构建器（加载 SOUL.md，构建提示词）
│   │   ├── loop.ts         # Agent 循环（处理消息、调用工具、生成回复）
│   │   └── tools/          # 工具实现
│   │       ├── base.ts         # 工具基类
│   │       ├── registry.ts     # 工具注册表
│   │       ├── filesystem.ts   # 文件系统工具（read_file, write_file, edit_file, list_dir, exec）
│   │       ├── web_search.ts   # 网络搜索工具
│   │       └── message.ts      # 消息发送工具
│   │
│   ├── channels/           # 交互渠道
│   │   ├── cli.ts          # 命令行交互
│   │   └── feishu.ts       # 飞书机器人交互（包含 FeishuProvider 和 FeishuChannel）
│   │
│   │
│   ├── providers/          # LLM 提供商
│   │   ├── llm.ts          # 统一 LLM 提供商（支持多提供商）
│   │   └── registry.ts     # 提供商注册表（支持 9 个提供商）
│   │
│   └── index.ts            # 入口文件
│
├── docs/                   # 文档
│   ├── FEISHU_SETUP.md     # 飞书机器人接入教程
│   └── STRUCTURE.md        # 本文件
│
├── SOUL.md                 # 项目文档（nanobot 的灵魂）
├── package.json            # 项目配置
├── tsconfig.json           # TypeScript 配置
└── README.md               # 项目说明
```

## 模块说明

### agent/
Agent 的核心逻辑，负责：
- 构建上下文（加载 SOUL.md）
- 运行 Agent 循环（处理消息、调用工具、生成回复）
- 管理工具注册和执行

### channels/
交互渠道，负责：
- 接收用户输入
- 发送回复
- 适配不同平台（CLI、飞书等）

### providers/
LLM 提供商，负责：
- 统一多个 LLM 提供商的接口
- 自动检测提供商
- 模型名称转换

## 与 nanobot 的对应关系

| mini-nanobot | nanobot |
|--------------|---------|
| `src/agent/` | `nanobot/agent/` |
| `src/channels/` | `nanobot/channels/` |
| `src/providers/` | `nanobot/providers/` |
| `src/agent/tools/` | `nanobot/agent/tools/` |
| `src/providers/registry.ts` | `nanobot/providers/registry.py` |
| `src/providers/llm.ts` | `nanobot/providers/litellm_provider.py` |
