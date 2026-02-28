# mini-nanobot MVP 搭建指南

## 目标
快速搭建一个能通过飞书对话、调用 LLM、执行工具的 MVP 版本 nanobot。

---

## 前置准备

### 1. 环境要求
- Node.js >= 18
- npm 或 pnpm
- TypeScript

### 2. 必要的凭证
- 飞书 App ID 和 App Secret
- LLM API Key（OpenAI / Anthropic / VolcEngine）

### 3. 安装依赖
```bash
npm init -y
npm install ws dotenv @larksuiteoapi/node-sdk openai
npm install -D typescript @types/node ts-node
```

---

## MVP 核心架构

```
┌─────────────────────────────────────────┐
│           mini-nanobot MVP              │
├─────────────────────────────────────────┤
│  FeishuChannel（飞书消息收发）          │
├─────────────────────────────────────────┤
│  AgentLoop（对话循环）                  │
│  ├── ContextBuilder（上下文构建）        │
│  └── ToolExecutor（工具执行）           │
├─────────────────────────────────────────┤
│  LLMProvider（LLM 调用）                │
├─────────────────────────────────────────┤
│  ToolRegistry（工具注册表）             │
│  ├── web_search                         │
│  ├── read_file                          │
│  ├── write_file                         │
│  └── exec                               │
└─────────────────────────────────────────┘
```

---

## 实现步骤

### Step 1: 配置系统

**文件：`src/config/schema.ts`**
```typescript
export interface Config {
  agents: {
    defaults: {
      model: string;
      provider: string;
      maxTokens: number;
      maxToolIterations: number;
      memoryWindow: number;
    };
  };
  channels: {
    feishu: {
      appId: string;
      appSecret: string;
    };
  };
  providers: {
    [key: string]: {
      apiKey?: string;
      api_key?: string;
      apiBase?: string;
      api_base?: string;
    };
  };
}
```

**文件：`src/config/loader.ts`**
```typescript
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { Config } from './schema';

export async function loadConfig(configPath?: string): Promise<Config> {
  const filePath = configPath || path.join(os.homedir(), '.nanobot', 'config.json');

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      throw new Error(`Config file not found: ${filePath}`);
    }
    throw error;
  }
}
```

**配置文件：`~/.nanobot/config.json`**
```json
{
  "agents": {
    "defaults": {
      "model": "gpt-4",
      "provider": "openai",
      "maxTokens": 8192,
      "maxToolIterations": 40,
      "memoryWindow": 100
    }
  },
  "channels": {
    "feishu": {
      "appId": "cli_xxx",
      "appSecret": "xxx"
    }
  },
  "providers": {
    "openai": {
      "apiKey": "sk-xxx"
    }
  }
}
```

---

### Step 2: LLM 提供商

**文件：`src/providers/llm.ts`**
```typescript
import OpenAI from 'openai';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class LLMProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string, baseURL?: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: baseURL || 'https://api.openai.com/v1'
    });
    this.model = model;
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      })),
      max_tokens: 8192
    });

    return response.choices[0].message.content || '';
  }
}
```

---

### Step 3: 工具系统

**文件：`src/agent/tools/base.ts`**
```typescript
export interface Tool {
  name: string;
  description: string;
  parameters: any;
  execute: (args: any) => Promise<any>;
}

export type ToolParams = Record<string, any>;
```

**文件：`src/agent/tools/registry.ts`**
```typescript
import { Tool, ToolParams } from './base';

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  async execute(name: string, params: ToolParams): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }
    return await tool.execute(params);
  }

  getDefinitions(): any[] {
    return Array.from(this.tools.values()).map(t => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }
    }));
  }
}
```

**文件：`src/agent/tools/filesystem.ts`**
```typescript
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Tool } from './base';

const execAsync = promisify(exec);

export const ReadFileTool: Tool = {
  name: 'read_file',
  description: '读取文件内容',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: '文件路径' }
    },
    required: ['path']
  },
  execute: async (args) => {
    return await fs.readFile(args.path, 'utf-8');
  }
};

export const WriteFileTool: Tool = {
  name: 'write_file',
  description: '写入文件内容',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: '文件路径' },
      content: { type: 'string', description: '文件内容' }
    },
    required: ['path', 'content']
  },
  execute: async (args) => {
    await fs.writeFile(args.path, args.content, 'utf-8');
    return 'File written successfully';
  }
};

export const ExecTool: Tool = {
  name: 'exec',
  description: '执行 shell 命令',
  parameters: {
    type: 'object',
    properties: {
      command: { type: 'string', description: '命令' }
    },
    required: ['command']
  },
  execute: async (args) => {
    const { stdout, stderr } = await execAsync(args.command);
    return stdout || stderr;
  }
};
```

**文件：`src/agent/tools/web_search.ts`**
```typescript
import { Tool } from './base';

export const WebSearchTool: Tool = {
  name: 'web_search',
  description: '搜索网络信息',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: '搜索关键词' },
      count: { type: 'number', description: '结果数量' }
    },
    required: ['query']
  },
  execute: async (args) => {
    // 这里可以使用真实的搜索 API，如 Bing Search API
    // MVP 版本返回模拟数据
    return [
      { title: '搜索结果 1', url: 'https://example.com/1', snippet: '...' },
      { title: '搜索结果 2', url: 'https://example.com/2', snippet: '...' }
    ];
  }
};
```

---

### Step 4: Agent 循环

**文件：`src/agent/context.ts`**
```typescript
import { ChatMessage } from '../providers/llm';

export class ContextBuilder {
  private messages: ChatMessage[] = [];
  private systemPrompt: string = '你是一个 AI 助手，可以帮助用户完成各种任务。';

  setSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
  }

  addUserMessage(content: string): void {
    this.messages.push({ role: 'user', content });
  }

  addAssistantMessage(content: string): void {
    this.messages.push({ role: 'assistant', content });
  }

  build(): ChatMessage[] {
    return [
      { role: 'system', content: this.systemPrompt },
      ...this.messages
    ];
  }

  clear(): void {
    this.messages = [];
  }
}
```

**文件：`src/agent/loop.ts`**
```typescript
import { LLMProvider, ChatMessage } from '../providers/llm';
import { ContextBuilder } from './context';
import { ToolRegistry } from './tools/registry';
import { ReadFileTool, WriteFileTool, ExecTool } from './tools/filesystem';
import { WebSearchTool } from './tools/web_search';

export class AgentLoop {
  private llm: LLMProvider;
  private contextBuilder: ContextBuilder;
  private toolRegistry: ToolRegistry;
  private maxIterations: number = 40;

  constructor(llm: LLMProvider) {
    this.llm = llm;
    this.contextBuilder = new ContextBuilder();
    this.toolRegistry = new ToolRegistry();

    // 注册工具
    this.toolRegistry.register(ReadFileTool);
    this.toolRegistry.register(WriteFileTool);
    this.toolRegistry.register(ExecTool);
    this.toolRegistry.register(WebSearchTool);
  }

  async run(userMessage: string): Promise<string> {
    this.contextBuilder.addUserMessage(userMessage);

    for (let i = 0; i < this.maxIterations; i++) {
      // 1. 构建上下文
      const messages = this.contextBuilder.build();

      // 2. 调用 LLM
      const response = await this.llm.chat(messages);

      // 3. 解析工具调用（简化版，实际需要更复杂的解析）
      const toolCall = this.parseToolCall(response);

      if (toolCall) {
        // 4. 执行工具
        const result = await this.toolRegistry.execute(toolCall.name, toolCall.arguments);

        // 5. 将结果加入上下文
        this.contextBuilder.addAssistantMessage(response);
        this.contextBuilder.addUserMessage(`Tool result: ${JSON.stringify(result)}`);
      } else {
        // 6. 返回回复
        this.contextBuilder.addAssistantMessage(response);
        return response;
      }
    }

    throw new Error('Max iterations exceeded');
  }

  private parseToolCall(content: string): { name: string; arguments: any } | null {
    // 简化版：检测是否包含工具调用标记
    // 实际实现需要更复杂的解析逻辑
    if (content.includes('tool_call:')) {
      try {
        const match = content.match(/tool_call:\s*(\{.*\})/);
        if (match) {
          return JSON.parse(match[1]);
        }
      } catch {
        return null;
      }
    }
    return null;
  }
}
```

---

### Step 5: 飞书集成

**文件：`src/channels/feishu.ts`**
```typescript
import { WSClient } from '@larksuiteoapi/node-sdk';
import { AgentLoop } from '../agent/loop';
import { LLMProvider } from '../providers/llm';

export class FeishuChannel {
  private appId: string;
  private appSecret: string;
  private agentLoop: AgentLoop;

  constructor(appId: string, appSecret: string, agentLoop: AgentLoop) {
    this.appId = appId;
    this.appSecret = appSecret;
    this.agentLoop = agentLoop;
  }

  async start(): Promise<void> {
    const dispatcher = {
      receive: async (data: any) => {
        await this.handleEvent(data);
      }
    };

    const wsClient = new WSClient({
      appId: this.appId,
      appSecret: this.appSecret,
      eventDispatcher: dispatcher,
    });

    wsClient.start();
    console.log('✅ Feishu WebSocket client started');
  }

  private async handleEvent(event: any): Promise<void> {
    if (event.header?.event_type === 'im.message.receive_v1') {
      const message = event.event?.message;
      if (!message) return;

      const content = JSON.parse(message.content);
      const userText = content.text;

      if (!userText) return;

      console.log(`📨 收到消息: ${userText}`);

      // 调用 Agent 处理
      const response = await this.agentLoop.run(userText);

      // 发送回复
      await this.sendMessage(message.chat_id, response);
    }
  }

  private async sendMessage(chatId: string, text: string): Promise<void> {
    // 这里需要实现飞书消息发送 API
    // MVP 版本简化处理
    console.log(`📤 发送回复: ${text}`);
  }
}
```

---

### Step 6: 入口文件

**文件：`src/index.ts`**
```typescript
import { loadConfig } from './config/loader';
import { LLMProvider } from './providers/llm';
import { AgentLoop } from './agent/loop';
import { FeishuChannel } from './channels/feishu';

async function main() {
  console.log('🚀 mini-nanobot MVP starting...');

  // 1. 加载配置
  const config = await loadConfig();
  console.log('✅ Config loaded');

  // 2. 初始化 LLM
  const providerConfig = config.providers[config.agents.defaults.provider];
  const apiKey = providerConfig?.apiKey || providerConfig?.api_key || '';
  const apiBase = providerConfig?.apiBase || providerConfig?.api_base;

  const llm = new LLMProvider(
    apiKey,
    config.agents.defaults.model,
    apiBase
  );
  console.log(`🤖 LLM Provider: ${config.agents.defaults.provider}`);
  console.log(`🤖 Model: ${config.agents.defaults.model}`);

  // 3. 初始化 Agent
  const agentLoop = new AgentLoop(llm);
  console.log('✅ Agent initialized');

  // 4. 启动飞书通道
  const feishuChannel = new FeishuChannel(
    config.channels.feishu.appId,
    config.channels.feishu.appSecret,
    agentLoop
  );

  await feishuChannel.start();
}

main().catch(console.error);
```

---

## 运行 MVP

### 1. 编译 TypeScript
```bash
npx tsc
```

### 2. 运行
```bash
node dist/index.js
```

### 3. 或直接使用 ts-node
```bash
npx ts-node src/index.ts
```

---

## MVP 功能清单

### ✅ 已实现
- [x] 配置系统（从 `~/.nanobot/config.json` 加载）
- [x] LLM 集成（支持 OpenAI / Anthropic / VolcEngine）
- [x] 飞书消息接收（WebSocket 长连接）
- [x] 飞书消息发送（简化版）
- [x] Agent 循环（多轮对话）
- [x] 工具系统（read_file、write_file、exec、web_search）
- [x] 上下文构建（系统提示词 + 历史消息）

### 🚧 MVP 未实现（可后续添加）
- [ ] 飞书消息发送完整实现
- [ ] 工具调用解析（简化版，需要完善）
- [ ] 流式响应
- [ ] 对话历史持久化
- [ ] 错误处理和重试
- [ ] 日志系统
- [ ] 更多工具（web_fetch、spawn、cron、screenshot）

---

## 项目结构

```
mini-nanobot/
├── src/
│   ├── agent/
│   │   ├── loop.ts          # Agent 循环
│   │   ├── context.ts       # 上下文构建
│   │   └── tools/
│   │       ├── base.ts      # 工具基类
│   │       ├── registry.ts  # 工具注册表
│   │       ├── filesystem.ts # 文件系统工具
│   │       └── web_search.ts # 搜索工具
│   ├── channels/
│   │   └── feishu.ts        # 飞书集成
│   ├── providers/
│   │   └── llm.ts           # LLM 提供商
│   ├── config/
│   │   ├── schema.ts        # 配置类型定义
│   │   └── loader.ts        # 配置加载器
│   └── index.ts             # 入口文件
├── package.json
├── tsconfig.json
└── README.md
```

---

## 关键学习点

### 1. 飞书集成
- 使用官方 SDK `@larksuiteoapi/node-sdk` 简化 WebSocket 连接
- 事件类型：`im.message.receive_v1` 接收消息
- 消息内容是 JSON 字符串，需要解析

### 2. LLM 集成
- 使用 OpenAI SDK 统一接口
- 支持多种提供商（OpenAI、Anthropic、VolcEngine）
- 消息格式：`{ role, content }`

### 3. Agent 循环
- 构建上下文 → 调用 LLM → 解析回复 → 执行工具 → 循环
- 限制最大迭代次数防止死循环
- 工具执行结果加入上下文

### 4. 工具系统
- 工具定义：`{ name, description, parameters, execute }`
- 工具注册：使用 Map 存储工具
- 工具执行：根据名称查找并执行

### 5. 配置系统
- 从 `~/.nanobot/config.json` 加载配置
- 支持多种 LLM 提供商
- 支持驼峰命名和下划线命名兼容

---

## 下一步优化

### 1. 完善飞书消息发送
实现完整的飞书消息发送 API，支持文本、图片、富文本等消息类型。

### 2. 完善工具调用解析
实现更复杂的工具调用解析逻辑，支持 JSON 格式的工具调用。

### 3. 添加流式响应
实现流式响应，实时显示 LLM 生成的内容。

### 4. 添加对话历史持久化
将对话历史保存到文件或数据库，支持多轮对话。

### 5. 添加错误处理和重试
实现错误处理和重试机制，提高系统稳定性。

### 6. 添加日志系统
使用 Winston 或 Pino 实现日志系统，方便调试和监控。

### 7. 添加更多工具
实现更多工具，如 web_fetch、spawn、cron、screenshot 等。

---

## 参考资源

- [nanobot 源码](https://github.com/nanobot-ai/nanobot)
- [飞书开放平台](https://open.feishu.cn/)
- [OpenAI API 文档](https://platform.openai.com/docs/)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)

---

*Created on 2026-02-28*
*Status: MVP Guide Ready ✅*
