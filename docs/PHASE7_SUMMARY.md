# Phase 7 总结：Context 模块重构

## 目标
参考 nanobot 的 context 实现，重构 mini-nanobot 的 ContextBuilder，使其支持完整的上下文构建功能。

---

## 实现内容

### 1. ContextBuilder 类

**核心功能：**
- 构建系统提示词（identity + bootstrap files + memory + skills）
- 构建运行时上下文（时间、channel、chat_id）
- 管理技能加载和元数据
- 添加工具结果和助手消息

### 2. 系统提示词构建

**组成部分：**
1. **Identity**：nanobot 的核心身份和运行时信息
2. **Bootstrap Files**：AGENTS.md、SOUL.md、USER.md、TOOLS.md、IDENTITY.md
3. **Memory**：长期记忆（MEMORY.md）
4. **Always Skills**：标记为 always=true 的技能
5. **Skills Summary**：所有技能的摘要（XML 格式）

**示例：**
```markdown
# nanobot 🐈

You are nanobot, a helpful AI assistant.

## Runtime
macOS arm64, Node.js v20.x.x

## Workspace
Your workspace is at: /Users/bytedance/.nanobot/workspace
- Long-term memory: /Users/bytedance/.nanobot/workspace/memory/MEMORY.md
- History log: /Users/bytedance/.nanobot/workspace/memory/HISTORY.md
- Custom skills: /Users/.../skills/{skill-name}/SKILL.md

## nanobot Guidelines
- State intent before tool calls, but NEVER predict or claim results before receiving them.
- Before modifying a file, read it first. Do not assume files or directories exist.
- After writing or editing a file, re-read it if accuracy matters.
- If a tool call fails, analyze the error before retrying with a different approach.
- Ask for clarification when the request is ambiguous.

Reply directly with text for conversations. Only use the 'message' tool to send to a specific chat channel.

---

## AGENTS.md

# Agent Instructions

You are a helpful AI assistant. Be concise, accurate, and friendly.

---

# Memory

## Long-term Memory

# Long-term Memory

This file stores important information that should persist across sessions.

## User Information

- **Name**: Drizzler
- **Role**: Front-end engineer at ByteDance Douyin E-commerce

---

# Skills

The following skills extend your capabilities. To use a skill, read its SKILL.md file using the read_file tool.
Skills with available="false" need dependencies installed first - you can try installing them with apt/brew.

<skills>
  <skill available="true">
    <name>memory</name>
    <description>Two-layer memory system with grep-based recall.</description>
    <location>/Users/.../skills/memory/SKILL.md</location>
  </skill>
</skills>
```

### 3. 运行时上下文构建

**格式：**
```
[Runtime Context — metadata only, not instructions]
Current Time: 2026-02-28 16:59 (星期六) (CST)
Channel: feishu
Chat ID: ou_xxx
'```

**用途：**
- 提供当前时间信息
- 提供消息来源信息
- 标记为"仅元数据，非指令"，防止 LLM 误用

### 4. 技能系统

**技能加载：**
- 从 `workspace/skills/` 目录加载技能
- 每个技能是一个目录，包含 `SKILL.md` 文件
- 支持技能元数据（YAML frontmatter）

**技能元数据示例：**
```yaml
---
description: Two-layer memory system with grep-based recall.
always: true
requires: CLI: grep
---

# Memory

## Structure

- `memory/MEMORY.md` — Long-term facts
- `memory/HISTORY.md` — Append-only event log
```

**技能摘要（XML 格式）：**
```xml
<skills>
  <skill available="true">
    <name>memory</name>
    <description>Two-layer memory system with grep-based recall.</description>
    <location>/Users/.../skills/memory/SKILL.md</location>
  </skill>
  <skill available="false">
    <name>github</name>
    <description>Interact with GitHub using the gh CLI.</description>
    <location>/Users/.../skills/github/SKILL.md</location>
    <requires>CLI: gh</requires>
  </skill>
</skills>
```

### 5. 消息构建

**完整消息列表：**
```typescript
[
  { role: 'system', content: systemPrompt },
  ...history,
  { role: 'user', content: runtimeContext },
  { role: 'user', content: currentMessage }
]
```

**工具结果添加：**
```typescript
messages.push({
  role: 'tool',
  content: result,
  tool_call_id: toolCallId,
  name: toolName
});
```

**助手消息添加：**
```typescript
messages.push({
  role: 'assistant',
  content: content,
  tool_calls: toolCalls
});
```

---

## 关键设计决策

### 1. 为什么使用 XML 格式表示技能摘要？
- **结构化**：易于解析
- **清晰**：明确标记可用性和依赖
- **兼容**：与 nanobot 保持一致

### 2. 为什么需要运行时上下文标签？
- **防止误用**：标记为"仅元数据"，防止 LLM 将其作为指令
- **安全性**：运行时信息不应影响 AI 的行为
- **调试**：方便追踪消息来源

### 3. 为什么支持技能元数据？
- **描述**：提供技能的简短描述
- **自动加载**：标记为 always=true 的技能自动加载
- **依赖检查**：检查技能依赖是否满足

### 4. 为什么需要 Bootstrap Files？
- **自定义**：用户可以自定义 AI 的行为
- **持久化**：配置保存在文件中，不丢失
- **灵活性**：可以随时修改，无需重启

---

## 与 nanobot 的对比

| 特性 | nanobot (Python) | mini-nanobot (TypeScript) |
|------|------------------|---------------------------|
| 系统提示词构建 | ✅ | ✅ |
| Bootstrap Files | ✅ | ✅ |
| Memory 上下文 | ✅ | ✅ |
| 技能系统 | ✅ | ✅ |
| 技能元数据 | ✅ | ✅ |
| 运行时上下文 | ✅ | ✅ |
| 工具结果添加 | ✅ | ✅ |
| 助手消息添加 | ✅ | ✅ |

---

## 测试结果

### 编译测试
```bash
$ npx tsc --noEmit
# 无错误
```

### 运行测试
```bash
$ npm start
🚀 mini-nanobot starting...
📦 Model: ark-code-latest
🔑 Provider: volcengine
📁 Workspace: ~/.nanobot/workspace
🤖 LLM Provider: VolcEngine
🤖 Model: ark-code-latest
🤖 API Base: https://ark.cn-beijing.volces.com/api/coding/v3
[info]: [ 'client ready' ]
🚀 Starting Feishu channel...
🚀 Starting Feishu WebSocket long connection...
✅ Feishu WebSocket client started
[info]: [ '[ws]', 'ws client ready' ]
```

---

## 下一步

### Phase 8: 工具系统完善

**目标：**
- 实现更多工具（web_fetch、spawn、cron）
- 完善工具错误处理
- 添加工具权限控制

**需要实现的工具：**
1. `web_fetch`：获取网页内容
2. `spawn`：启动子任务
3. `cron`：定时任务
4. `screenshot`：截图工具

---

## 学习要点

### 1. 上下文构建的重要性
- **系统提示词**：定义 AI 的角色和行为
- **运行时上下文**：提供当前环境信息
- **历史消息**：维护对话上下文

### 2. 技能系统的设计
- **动态加载**：从文件系统加载技能
- **元数据管理**：解析 YAML frontmatter
- **依赖检查**：验证技能依赖是否满足

### 3. 消息管理
- **消息类型**：system、user、assistant、tool
- **消息结构**：role、content、tool_calls、tool_call_id
- **消息添加**：按顺序添加到消息列表

---

*Created on 2026-02-28*
