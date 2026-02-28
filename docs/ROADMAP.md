# Mini-Nanobot 复刻计划

## 项目目标

完美复刻 nanobot 项目，通过实践学习 AI Agent 开发的核心知识。

---

## 已实现功能

### ✅ 基础架构（Phase 0）

**核心模块：**

| 模块 | 文件 | 功能 |
|------|------|------|
| 配置系统 | `config/index.ts`, `config/loader.ts`, `config/schema.ts` | 加载和管理配置文件 |
| LLM 提供者 | `providers/llm.ts` | 调用大语言模型 API |
| 提供者注册表 | `providers/registry.ts` | 支持多种 LLM 提供商（OpenAI、VolcEngine、DeepSeek 等） |
| 上下文构建器 | `agent/context.ts` | 构建发送给 LLM 的消息上下文 |

### ✅ 工具系统（Phase 0）

| 工具 | 文件 | 功能 |
|------|------|------|
| 文件读取 | `tools/filesystem.ts` - ReadFileTool | 读取文件内容 |
| 文件写入 | `tools/filesystem.ts` - WriteFileTool | 写入文件内容 |
| 文件编辑 | `tools/filesystem.ts` - EditFileTool | 编辑文件（查找替换） |
| 目录列表 | `tools/filesystem.ts` - ListDirTool | 列出目录内容 |
| 命令执行 | `tools/filesystem.ts` - ExecTool | 执行 Shell 命令 |
| 网络搜索 | `tools/web_search.ts` - WebSearchTool | 网络搜索（Brave API） |
| 消息发送 | `tools/message.ts` - MessageTool | 发送消息给用户 |
| 工具注册表 | `tools/registry.ts` | 管理和执行工具 |

### ✅ 通道系统（Phase 0）

| 通道 | 文件 | 功能 |
|------|------|------|
| CLI 通道 | `channels/cli.ts` | 命令行交互 |
| 飞书通道 | `channels/feishu.ts` | 飞书机器人（WebSocket 长连接） |

### ✅ 消息总线系统（Phase 1）

| 模块 | 文件 | 功能 |
|------|------|------|
| 事件定义 | `bus/events.ts` | 定义 InboundMessage 和 OutboundMessage 类型 |
| 消息队列 | `bus/queue.ts` | 实现生产者-消费者模式的消息队列 |
| Agent 循环 | `agent/loop.ts` | 重构为事件驱动模式，支持多会话 |

---

## 阶段规划

### ✅ 阶段 0: 基础功能（已完成）

**学习目标：** 理解 AI Agent 的基本架构

**实现内容：**
- [x] 配置系统 - 加载 config.json
- [x] LLM Provider - 调用大模型 API
- [x] 多提供商支持 - OpenAI、VolcEngine、DeepSeek 等
- [x] 工具系统 - 文件操作、命令执行、网络搜索
- [x] CLI 通道 - 命令行交互
- [x] 飞书通道 - 飞书机器人

**核心知识点：**
- OpenAI API 调用
- 工具调用（Function Calling）
- WebSocket 长连接
- 配置管理

---

### ✅ 阶段 1: 消息总线系统（已完成）

**学习目标：** 理解异步消息队列和生产者-消费者模式

**实现内容：**
- [x] 创建 `bus/events.ts` - 定义消息事件类型
- [x] 创建 `bus/queue.ts` - 实现消息队列
- [x] 重构 Agent Loop 使用消息总线
- [x] 重构 CLI 通道使用消息总线
- [x] 重构飞书通道使用消息总线

**核心知识点：**
- 生产者-消费者模式
- 异步消息传递
- 组件解耦
- TypeScript readonly 和 get 计算属性
- Map 数据结构
- 事件循环模式

---

### 📋 阶段 2: 会话管理系统

**学习目标：** 理解数据持久化和会话管理

**实现内容：**
- [ ] 创建 `session/manager.ts` - 会话管理器
- [ ] 实现会话的保存和加载（JSONL 格式）
- [ ] 支持多会话并发
- [ ] 会话元数据管理

**核心知识点：**
- 文件系统操作（Node.js fs）
- JSON 数据序列化
- 数据持久化模式

---

### 📋 阶段 3: 记忆系统

**学习目标：** 理解 RAG（检索增强生成）和记忆管理

**实现内容：**
- [ ] 创建 `agent/memory.ts` - 记忆存储
- [ ] 实现 MEMORY.md（长期事实记忆）
- [ ] 实现 HISTORY.md（可搜索历史）
- [ ] 记忆整合功能（通过 LLM 自动总结）

**核心知识点：**
- 提示工程（Prompt Engineering）
- LLM 工具调用模式
- 文本摘要技术

---

### 📋 阶段 4: 技能系统

**学习目标：** 理解插件系统和动态加载

**实现内容：**
- [ ] 创建 `agent/skills.ts` - 技能加载器
- [ ] 支持内置技能和工作区技能
- [ ] 技能元数据解析（YAML frontmatter）
- [ ] 技能依赖检查

**核心知识点：**
- 插件架构模式
- 文件遍历和加载
- 元数据解析

---

### 📋 阶段 5: 扩展工具和增强 Agent Loop

**学习目标：** 完善 Agent 核心能力

**实现内容：**
- [ ] 添加更多工具（Shell, Spawn, Cron, WebFetch）
- [ ] 实现 `/new`, `/stop`, `/help` 命令
- [ ] 添加任务取消功能
- [ ] 添加进度提示功能
- [ ] 实现子代理系统

**核心知识点：**
- 进程管理（child_process）
- 异步任务取消
- 命令行交互模式

---

### 📋 阶段 6: 更多通道支持

**学习目标：** 理解多平台集成

**实现内容：**
- [ ] 创建 `channels/manager.ts` - 通道管理器
- [ ] 添加 Discord 通道
- [ ] 添加 Slack 通道
- [ ] 添加 Telegram 通道
- [ ] 通道基类重构

**核心知识点：**
- Webhook 集成
- 第三方 API 调用
- 适配器模式

---

### 📋 阶段 7: 高级功能

**学习目标：** 完善生产级功能

**实现内容：**
- [ ] 添加定时任务服务（Cron）
- [ ] 添加 MCP 服务器支持
- [ ] 添加心跳服务
- [ ] 错误处理和日志优化
- [ ] 性能优化

**核心知识点：**
- 定时任务调度
- 协议集成
- 健康检查模式

---

## 当前项目结构

```
mini-nanobot/
├── docs/
│   ├── ROADMAP.md          # 本文档
│   ├── FEISHU_SETUP.md     # 飞书配置指南
│   └── STRUCTURE.md        # 项目结构说明
├── src/
│   ├── agent/
│   │   ├── tools/
│   │   │   ├── base.ts         # 工具基类
│   │   │   ├── filesystem.ts   # 文件系统工具
│   │   │   ├── message.ts      # 消息工具
│   │   │   ├── registry.ts     # 工具注册表
│   │   │   └── web_search.ts   # 网络搜索工具
│   │   ├── context.ts          # 上下文构建器
│   │   └── loop.ts             # Agent 主循环
│   ├── bus/
│   │   ├── events.ts           # 消息事件类型
│   │   ├── index.ts            # 模块导出
│   │   └── queue.ts            # 消息队列
│   ├── channels/
│   │   ├── cli.ts              # CLI 通道
│   │   └── feishu.ts           # 飞书通道
│   ├── config/
│   │   ├── index.ts            # 配置模块导出
│   │   ├── loader.ts           # 配置加载器
│   │   └── schema.ts           # 配置类型定义
│   ├── providers/
│   │   ├── llm.ts              # LLM 提供者
│   │   └── registry.ts         # 提供者注册表
│   └── index.ts                # 入口文件
├── config.json                 # 配置文件
├── package.json
└── tsconfig.json
```

---

## 学习路径建议

### 第一周（基础架构）
- ✅ 阶段 0（基础功能）
- ✅ 阶段 1（消息总线）
- 阶段 2（会话管理）

### 第二周（核心功能）
- 阶段 3（记忆系统）
- 阶段 4（技能系统）

### 第三周（增强功能）
- 阶段 5（扩展工具）

### 第四周（生态系统）
- 阶段 6（多通道）
- 阶段 7（高级功能）

---

## 实现原则

1. **保持 TypeScript 类型安全** - 充分利用 TypeScript 的类型系统
2. **参考 Python 源码但用前端思维重构** - 不要直接翻译，用前端最佳实践
3. **每个阶段都要写测试** - 保证代码质量
4. **循序渐进** - 不要跳过任何阶段，每个阶段都建立在前一个的基础上
5. **边做边学** - 遇到问题时深入研究相关技术
