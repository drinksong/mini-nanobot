# mini-nanobot 开发指南：从零到一

## 目标
通过复刻 nanobot，掌握如何快速开发一个 AI Agent 系统。

---

## Phase 1: 飞书集成（消息接收）

### 核心目标
打通飞书消息接收，让 nanobot 能"听到"用户说话。

### 关键知识点

#### 1. 飞书 API 架构
```
飞书服务器 → WebSocket → nanobot → 处理消息
```

**两种消息接收方式：**
- **HTTP 回调**：飞书主动推送消息到你的服务器
- **WebSocket 长连接**：nanobot 主动连接飞书服务器

**为什么选择 WebSocket？**
- 无需公网 IP 和域名
- 无需配置 HTTPS 证书
- 适合本地开发

#### 2. 飞书事件类型
```typescript
// 用户发送消息
{
  "header": {
    "event_type": "im.message.receive_v1"
  },
  "event": {
    "message": {
      "chat_id": "ou_xxx",
      "content": "{\"text\":\"你好\"}",
      "sender": {
        "sender_id": {
          "open_id": "ou_xxx"
        }
      }
    }
  }
}
```

**关键事件类型：**
- `im.message.receive_v1`：接收消息
- `application.bot_menu_v6`：菜单点击
- `p2p_message_create_v1`：私聊消息

#### 3. WebSocket 连接管理
```typescript
// 1. 获取 WebSocket URL
const wsUrl = await getWebSocketUrl(appId, appSecret);

// 2. 建立 WebSocket 连接
const ws = new WebSocket(wsUrl);

// 3. 处理消息
ws.on('message', (data) => {
  const event = JSON.parse(data.toString());
  handleEvent(event);
});

// 4. 心跳保活
setInterval(() => {
  ws.send(JSON.stringify({ type: 'ping' }));
}, 30000);
```

**关键点：**
- **心跳保活**：每 30 秒发送一次 ping
- **重连机制**：连接断开时自动重连
- **事件分发**：根据 `event_type` 分发到不同处理器

#### 4. 消息内容解析
```typescript
// 飞书消息内容是 JSON 字符串
const content = JSON.parse(event.message.content);

// 文本消息
if (content.text) {
  console.log('用户说：', content.text);
}

// 图片消息
if (content.image_key) {
  console.log('用户发送了图片：', content.image_key);
}
```

### 实战要点
1. **获取飞书凭证**：App ID 和 App Secret
2. **建立 WebSocket 连接**：使用 `ws` 库
3. **处理事件**：解析 `event_type` 和 `content`
4. **心跳保活**：防止连接断开

---

## Phase 2: 飞书消息发送（消息回复）

### 核心目标
让 nanobot 能"说话"，回复用户消息。

### 关键知识点

#### 1. 飞书 API 认证
```typescript免
// 1. 获取 tenant_access_token
const token = await getTenantAccessToken(appId, appSecret);

// 2. 使用 token 调用 API
const response = await fetch('https://open.feishu.cn/open-apis/bot/v2/hook/xxx', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

**关键点：**
- `tenant_access_token` 有效期 2 小时
- 需要缓存 token，避免频繁请求
- token 失效时自动刷新

#### 2. 发送文本消息
```typescript
async function sendMessage(chatId: string, text: string) {
  const response = await fetch('https://open.feishu.cn/open-apis/im/v1/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      receive_id: chatId,
      msg_type: 'text',
      content: JSON.stringify({ text })
    })
  });
}
```

**关键参数：**
- `receive_id`：接收者 ID（chat_id 或 open_id）
- `msg_type`：消息类型（text、image、post 等）
- `content`：消息内容（JSON 字符串）

#### 3. 发送富文本消息
```typescript
async function sendRichText(chatId: string, title: string, content: any[]) {
  await fetch('https://open.feishu.cn/open-apis/im/v1/messages', {
    method: 'POST',
    body: JSON.stringify({
      receive_id: chatId,
      msg_type: 'post',
      content: JSON.stringify({
        post: {
          zh_cn: {
            title,
            content
          }
        }
      })
    })
  });
}
```

**富文本结构：**
```typescript
[
  [{ tag: 'text', text: '你好，' }],
  [{ tag: 'a', text: '点击这里', href: 'https://example.com' }],
  [{ tag: 'at', user_id: 'ou_xxx', text: '@用户' }]
]
```

### 实战要点
1. **获取 tenant_access_token**：使用 App ID 和 App Secret
2. **发送消息**：调用飞书 API
3. **处理错误**：token 失效时自动刷新
4. **支持多种消息类型**：文本、图片、富文本

---

## Phase 3: LLM 集成（AI 对话）

### 核心目标
让 nanobot 能"思考"，调用 LLM 生成回复。

### 关键知识点

#### 1. LLM API 架构
```
nanobot → LLM Provider API → LLM 模型 → 返回回复
```

**支持的 LLM Provider：**
- OpenAI（GPT-4、GPT-3.5）
- Anthropic（Claude）
- VolcEngine（豆包）
- 其他兼容 OpenAI API 的服务

#### 2. OpenAI API 调用
```typescript
async function callLLM(messages: Message[]): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'model-name',
      messages: messages,
      max_tokens: 8192
    })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}
```

**关键参数：**
- `model`：模型名称
- `messages`：对话历史
- `max_tokens`：最大生成 token 数

#### 3. 消息格式
```typescript
interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const messages: Message[] = [
  { role: 'system', content: '你是一个 AI 助手' },
  { role: 'user', content: '你好' },
  { role: 'assistant', content: '你好！有什么我可以帮助你的吗？' },
  { role: 'user', content: '今天天气怎么样？' }
];
```

**角色类型：**
- `system`：系统提示词
- `user`：用户消息
- `assistant`：AI 回复

#### 4. 流式响应
```typescript
async function streamLLM(messages: Message[]): Promise<AsyncIterable<string>> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    body: JSON.stringify({
      model: 'model-name',
      messages: messages,
      stream: true  // 启用流式响应
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        const content = data.choices[0].delta.content;
        if (content) yield content;
      }
    }
  }
}
```

**流式响应优势：**
- 实时显示生成内容
- 提升用户体验
- 减少等待时间

### 实战要点
1. **选择 LLM Provider**：OpenAI、Anthropic、VolcEngine
2. **调用 LLM API**：发送消息，获取回复
3. **处理流式响应**：实时显示生成内容
4. **管理对话历史**：维护上下文

---

## Phase 4: Agent 循环（对话管理）

### 核心目标
让 nanobot 能"持续对话"，管理多轮对话和工具调用。

### 关键知识点

#### 1. Agent 循环架构
```
用户消息 → 构建上下文 → 调用 LLM → 解析回复 → 执行工具 → 循环
```

**循环流程：**
1. 接收用户消息
2. 构建对话上下文（系统提示词 + 历史消息）
3. 调用 LLM 生成回复
4. 解析回复（是否需要调用工具）
5. 如果需要调用工具 → 执行工具 → 将结果加入上下文 → 回到步骤 3
6. 如果不需要调用工具 → 返回回复

#### 2. 上下文构建
```typescript
class ContextBuilder {
  private messages: Message[] = [];
  private systemPrompt: string = '';

  setSystemPrompt(prompt: string) {
    this.systemPrompt = prompt;
  }

  addUserMessage(content: string) {
    this.messages.push({ role: 'user', content });
  }

  addAssistantMessage(content: string) {
    this.messages.push({ role: 'assistant', content });
  }

  build(): Message[] {
    return [
      { role: 'system', content: this.systemPrompt },
      ...this.messages
    ];
  }
}
```

**上下文组成：**
- 系统提示词：定义 AI 的角色和行为
- 历史消息：维护对话上下文
- 工具调用结果：将工具执行结果加入上下文

#### 3. 工具调用解析
```typescript
interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

function parseToolCall(content: string): ToolCall | null {
  // 解析 LLM 返回的工具调用
  // 格式：{"name": "tool_name", "arguments": {...}}
  try {
    const match = content.match(/```json\n(.*?)\n```/);
    if (match) {
      return JSON.parse(match[1]);
    }
    return null;
  } catch {
    return null;
  }
}
```

**工具调用格式：**
```json
{
  "name": "web_search",
  "arguments": {
    "query": "今天天气怎么样",
    "count": 5
  }
}
```

#### 4. Agent 循环实现
```typescript
class AgentLoop {
  private llm: LLMProvider;
  private tools: Map<string, Tool>;
  private contextBuilder: ContextBuilder;
  private maxIterations: number = 40;

  async run(userMessage: string): Promise<string> {
    this.contextBuilder.addUserMessage(userMessage);

    for (let i = 0; i < this.maxIterations; i++) {
      // 1. 构建上下文
      const messages = this.contextBuilder.build();

      // 2. 调用 LLM
      const response = await this.llm.chat(messages);

      // 3. 解析工具调用
      const toolCall = parseToolCall(response);

      if (tool) {
        // 4. 执行工具
        const result = await this.executeTool(toolCall);

        // 5. 将结果加入上下文
        this.contextBuilder.addAssistantMessage(response);
        this.contextBuilder.addUserMessage(`Tool result: ${result}`);
      } else {
        // 6. 返回回复
        this.contextBuilder.addAssistantMessage(response);
        return response;
      }
    }

    throw new Error('Max iterations exceeded');
  }
}
```

### 实战要点
1. **构建上下文**：系统提示词 + 历史消息
2. **解析工具调用**：识别 LLM 返回的工具调用
3. **执行工具**：调用工具函数
4. **循环控制**：限制最大迭代次数

---

## Phase 5: 工具系统（能力扩展）

### 核心目标
让 nanobot 能"做事"，调用各种工具完成任务。

### 关键知识点

#### 1. 工具定义
```typescript
interface Tool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
  execute: (args: any) => Promise<any>;
}
```

**工具示例：**
```typescript
const webSearchTool: Tool = {
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
    const results = await searchWeb(args.query, args.count);
    return results;
  }
};
```

#### 2. 工具注册
```typescript
class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  register(tool: Tool) {
    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  getSchema(): any {
    return {
      type: 'function',
      function: {
        name: this.name,
        description: this.description,
        parameters: this.parameters
      }
    };
  }
}
```

#### 3. 工具执行
```typescript
async function executeTool(toolCall: ToolCall): Promise<any> {
  const tool = toolRegistry.get(toolCall.name);
  if (!tool) {
    throw new Error(`Tool not found: ${toolCall.name}`);
  }

  // 验证参数
  validateParameters(toolCall.arguments, tool.parameters);

  // 执行工具
  const result = await tool.execute(toolCall.arguments);
  return result;
}
```

#### 4. 工具提示词生成
```typescript
function generateToolsPrompt(tools: Tool[]): string {
  const toolDescriptions = tools.map(tool => {
    return `- ${tool.name}: ${tool.description}`;
  }).join('\n');

  return `你可以使用以下工具：
${toolDescriptions}

使用工具时，请按照以下格式回复：
\`\`\`json
{
  "name": "tool_name",
  "arguments": {
    "param1": "value1",
    "param2": "value2"
  }
}
\`\`\`
`;
`;
}
```

### 实战要点
1. **定义工具**：名称、描述、参数、执行函数
2. **注册工具**：将工具加入工具注册表
3. **执行工具**：调用工具函数
4. **生成提示词**：将工具信息加入系统提示词

---

## Phase 6: 配置系统（参数管理）

### 核心目标
让 nanobot 能"配置"，灵活管理各种参数。

### 关键知识点

#### 1. 配置文件结构
```json
{
  "agents": {
    "defaults": {
      "model": "ark-code-latest",
      "provider": "volcengine",
      "maxTokens": 8192,
      "maxToolIterations": 40,
      "memoryWindow": 100
    }
  },
  "channels": {
    "feishu": {
      "app_id": "cli_xxx",
      "app_secret": "xxx"
    }
  },
  "providers": {
    "volcengine": {
      "api_key": "xxx",
      "api_base": "https://ark.cn-beijing.volces.com/api/coding/v3"
    }
  }
}
```

#### 2. 配置加载
```typescript
async function loadConfig(configPath?: string): Promise<Config> {
  const filePath = configPath || getConfigPath();

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const rawConfig = JSON.parse(content);

    // 检查版本，需要迁移？
    if (needsMigration(rawConfig)) {
      const migrated = migrateConfig(rawConfig);
      await saveConfig(filePath, migrated);
      return migrated;
    }

    return normalizeConfig(rawConfig);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // 配置文件不存在，创建默认配置
      const defaultConfig = createDefaultConfig();
      await saveConfig(filePath, defaultConfig);
      return defaultConfig;
    }
    throw error;
  }
}
```

#### 3. 配置迁移
```typescript
function migrateConfig(oldConfig: any): Config {
  const migrated = { ...oldConfig };

  // 迁移 agents.defaults
  if (oldConfig.agents?.defaults) {
    const defaults = oldConfig.agents.defaults;
    migrated.agents.defaults = {
      ...defaults,
      maxTokens: defaults.max_tokens || defaults.maxTokens || 8192,
      maxToolIterations: defaults.max_tool_iterations || defaults.maxToolIterations || 40,
      memoryWindow: defaults.memory_window || defaults.memoryWindow || 100,
    };
  }

  return migrated;
}
```

#### 4. 配置使用
```typescript
// 加载配置
const config = await loadConfig();

// 提取配置项
const defaults = config.agents.defaults;
const model = defaults.model;
const providerName = defaults.provider;

// 查找提供商配置
const providerConfig = config.providers[providerName];
const apiKey = providerConfig?.api_key || providerConfig?.apiKey || '';
```

### 实战要点
1. **定义配置结构**：使用 TypeScript 接口
2. **加载配置**：从文件读取并解析
3. **配置迁移**：支持旧版本配置
4. **使用配置**：提取配置项并使用

---

## 核心架构总结

### nanobot 整体架构
```
┌─────────────────────────────────────────────────────────┐
│                        nanobot                          │
├─────────────────────────────────────────────────────────┤
│  Channels（消息通道）                                    │
│  ├── FeishuChannel（飞书）                              │
│  ├── CLIChannel（命令行）                               │
│  └── ...                                                │
├─────────────────────────────────────────────────────────┤
│  Agent Loop（Agent 循环）                               │
│  ├── ContextBuilder（上下文构建）                        │
│  ├── ToolExecutor（工具执行）                            │
│  └── ResponseParser（回复解析）                         │
├─────────────────────────────────────────────────────────┤
│  LLM Provider（LLM 提供商）                             │
│  ├── OpenAI                                             │
│  ├── Anthropic                                          │
│  └── VolcEngine                                         │
├─────────────────────────────────────────────────────────┤
│  Tools（工具）                                          │
│  ├── web_search                                         │
│  ├── web_fetch                                           │
│  ├── exec                                                │
│  └── ...                                                │
├─────────────────────────────────────────────────────────┤
│  Config（配置）                                         │
│  ├── agents                                             │
│  ├── channels                                           │
│  └── providers                                          │
└─────────────────────────────────────────────────────────┘
```

### 消息流转
```
用户消息
  ↓
Channel 接收消息
  ↓
AgentLoop.run()
  ↓
ContextBuilder.build() → 构建上下文
  ↓
LLMProvider.chat() → 调用 LLM
  ↓
解析回复 → 是否需要调用工具？
  ↓
是 → ToolExecutor.execute() → 执行工具 → 回到 LLM
  ↓
否 → Channel.sendMessage() → 发送回复
```

---

## 快速开发指南

### 步骤 1：初始化项目
```bash
mkdir my-nanobot
cd my-nanobot
npm init -y
npm install ws dotenv typescript @types/node ts-node
```

### 步骤 2：创建配置文件
```json
{
  "agents": {
    "defaults": {
      "model": "gpt-4",
      "provider": "openai"
    }
  },
  "channels": {
    "feishu": {
      "app_id": "your_app_id",
      "app_secret": "your_app_secret"
    }
  },
  "providers": {
    "openai": {
      "api_key": "your_api_key"
    }
  }
}
```

### 步骤 3：实现飞书集成
```typescript
// channels/feishu.ts
import WebSocket from 'ws';

export class FeishuChannel {
  private ws: WebSocket;

  async connect(appId: string, appSecret: string) {
    const wsUrl = await this.getWebSocketUrl(appId, appSecret);
    this.ws = new WebSocket(wsUrl);

    this.ws.on('message', (data) => {
      const event = JSON.parse(data.toString());
      this.handleEvent(event);
    });
  }

  private handleEvent(event: any) {
    if (event.header.event_type === 'im.message.receive_v1') {
      const message = event.event.message;
      const content = JSON.parse(message.content);
      console.log('用户说：', content.text);
    }
  }
}
```

### 步骤 4：实现 LLM 集成
```typescript
// providers/llm.ts
export class LLMProvider {
  async chat(messages: Message[]): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  }
}
```

### 步骤 5：实现 Agent 循环
```typescript
// agent/loop.ts
export class AgentLoop {
  async run(userMessage: string): Promise<string> {
    this.contextBuilder.addUserMessage(userMessage);
    const messages = this.contextBuilder.build();
    const response = await this.llm.chat(messages);
    this.contextBuilder.addAssistantMessage(response);
    return response;
  }
}
```

### 步骤 6：集成所有组件
```typescript
// index.ts
import { FeishuChannel } from './channels/feishu';
import { LLMProvider } from './providers/llm';
import { AgentLoop } from './agent/loop';
import { loadConfig } from './config';

async function main() {
  const config = await loadConfig();

  const llm = new LLMProvider(config);
  const agentLoop = new AgentLoop(llm);
  const feishuChannel = new FeishuChannel(agentLoop);

  await feishuChannel.connect(
    config.channels.feishu.app_id,
    config.channels.feishu.app_secret
  );
}

main();
```

---

## 进阶主题

### 1. 工具开发
- 定义工具接口
- 实现工具函数
- 注册工具到 Agent

### 2. 技能系统
- 动态加载技能
- 技能依赖管理
- 技能热更新

### 3. 内存系统
- 长期记忆（MEMORY.md）
- 短期记忆（对话历史）
- 记忆检索和总结

### 4. 插件系统
- 插件加载机制
- 插件生命周期
- 插件间通信

---

## 参考资源

- [nanobot 源码](https://github.com/nanobot-ai/nanobot)
- [飞书开放平台](https://open.feishu.cn/)
- [OpenAI API 文档](https://platform.openai.com/docs/)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)

---

*Created on 2026-02-28*
