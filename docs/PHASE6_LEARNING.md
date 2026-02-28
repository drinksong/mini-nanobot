# Phase 6 学习笔记：配置模块

## 核心目标
复刻 nanobot 的配置系统，理解如何从配置文件加载和管理所有运行时参数。

---

## 一、nanobot 配置系统架构

### 1. 配置文件位置
```
~/.nanobot/config.json
```
- 用户级别的全局配置
- 所有 nanobot 实例共享

### 2. 配置结构（Python 版本）
```python
# nanobot/config/schema.py
class Config(BaseModel):
    agents: AgentConfig
    channels: ChannelConfig
    providers: Dict[str, ProviderConfig]
    tools: ToolsConfig
```

### 3. 配置加载流程
```
loadConfig()
  ↓
检查配置文件是否存在
  ↓
不存在 → 创建默认配置
  ↓
存在 → 加载并验证
  ↓
检查版本 → 需要迁移？
  ↓
是 → migrateConfig()
  ↓
返回 Config 对象
```

---

## 二、TypeScript 实现要点

### 1. 类型定义（schema.ts）

**关键设计：兼容驼峰和下划线命名**

```typescript
export interface ProviderConfig {
  api_key?: string;      // nanobot 风格
  apiKey: string;        // TypeScript 风格
  api_base?: string;
  apiBase?: string;
}
```

**为什么需要兼容？**
- nanobot 使用下划线命名（Python 风格）
- TypeScript 习惯驼峰命名
- 用户可能手动编辑配置文件
- 需要同时支持两种格式

### 2. 配置加载器（loader.ts）

**核心函数：**

```typescript
// 获取默认配置路径
export function getConfigPath(): string {
  return path.join(os.homedir(), '.nanobot', 'config.json');
}

// 加载配置
export async function loadConfig(configPath?: string): Promise<Config> {
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

**关键点：**
1. **默认路径**：`~/.nanobot/config.json`
2. **自动创建**：文件不存在时创建默认配置
3. **版本迁移**：支持配置格式升级
4. **类型安全**：返回 `Config` 类型

### 3. 配置迁移（migrateConfig）

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

  // 迁移 providers
  for (const [name, provider] of Object.entries(oldConfig.providers || {})) {
    migrated.providers[name] = {
      apiKey: provider.api_key || provider.apiKey || '',
      apiBase: provider.api_base || provider.apiBase || '',
    };
  }

  return migrated;
}
```

**迁移场景：**
- 配置格式升级（添加新字段）
- 命名风格统一（下划线 → 驼峰）
- 默认值填充

---

## 三、入口点集成（index.ts）

### 1. 加载配置
```typescript
const config = await loadConfig();  // 使用默认路径
```

### 2. 提取配置项
```typescript
const defaults = config.agents.defaults;
const model = defaults.model;
const providerName = defaults.provider;
const workspace = defaults.workspace;

// 查找提供商配置
let providerConfig = config.providers[providerName];
let apiKey = providerConfig?.api_key || providerConfig?.apiKey || '';
let apiBase = providerConfig?.api_base || providerConfig?.apiBase || '';
```

### 3. 自动检测提供商
```typescript
if (providerName === 'auto' || !apiKey) {
  for (const [name, cfg] of Object.entries(config.providers)) {
    const key = cfg.api_key || cfg.apiKey;
    if (key) {
      providerConfig = cfg;
      apiKey = key;
      apiBase = cfg.api_base || cfg.apiBase || '';
      console.log(`🔍 Auto-detected provider: ${name}`);
      break;
    }
  }
}
```

### 4. Feishu 配置
```typescript
const feishuConfig = config.channels.feishu;
const appId = feishuConfig.app_id || feishuConfig.appId || '';
const appSecret = feishuConfig.app_secret || feishuConfig.appSecret || '';
```

---

## 四、关键设计决策

### 1. 为什么使用 `~/.nanobot/config.json`？
- **全局配置**：所有项目共享同一配置
- **用户级别**：不需要每个项目单独配置
- **符合惯例**：类似 `.ssh/config`、`.npmrc`

### 2. 为什么需要配置迁移？
- **向后兼容**：旧版本配置文件仍可用
- **平滑升级**：用户升级 nanobot 后无需手动修改配置
- **默认值填充**：新字段自动添加

### 3. 为什么支持驼峰和下划线命名？
- **跨语言兼容**：Python（下划线）↔ TypeScript（驼峰）
- **用户友好**：用户可以用任何风格编辑配置
- **灵活性**：不强制用户改变习惯

---

## 五、常见问题与解决方案

### 问题 1：配置文件不存在
```typescript
// 解决方案：自动创建默认配置
if (error.code === 'ENOENT') {
  const defaultConfig = createDefaultConfig();
  await saveConfig(filePath, defaultConfig);
  return defaultConfig;
}
```

### 问题 2：配置格式过时
```typescript
// 解决方案：版本迁移
if (needsMigration(rawConfig)) {
  const migrated = migrateConfig(rawConfig);
  await saveConfig(filePath, migrated);
  return migrated;
}
```

### 问题 3：命名风格不一致
```typescript
// 解决方案：兼容两种风格
const apiKey = providerConfig?.api_key || providerConfig?.apiKey || '';
```

### 问题 4：配置路径错误
```typescript
// ❌ 错误：使用相对路径
const config = await loadConfig('./config.json');

// ✅ 正确：使用默认路径
const config = await loadConfig();
```

---

## 六、与 nanobot 的对比

| 特性 | nanobot (Python) | mini-nanobot (TypeScript) |
|------|------------------|---------------------------|
| 配置文件 | `~/.nanobot/config.json` | `~/.nanobot/config.json` |
| 类型验证 | Pydantic BaseModel | TypeScript 接口 |
| 命名风格 | 下划线 | 驼峰 + 下划线兼容 |
| 迁移机制 | migrateConfig() | migrateConfig() |
| 默认配置 | createDefaultConfig() | createDefaultConfig() |
| 自动创建 | ✅ | ✅ |

---

## 七、核心知识点总结

### 1. 配置系统设计原则
- **单一配置源**：所有配置来自一个文件
- **类型安全**：编译时使用 TypeScript 类型检查
- **向后兼容**：支持旧版本配置
- **用户友好**：自动创建、自动迁移

### 2. TypeScript 技巧
- **可选属性**：`api_key?: string` 支持兼容
- **类型守卫**：`if (error.code === 'ENOENT')` 判断错误类型
- **类型断言**：`as Config` 在必要时使用
- **默认值**：`|| ''` 提供后备值

### 3. 文件系统操作
- **读取**：`fs.readFile(path, 'utf-8')`
- **写入**：`fs.writeFile(path, JSON.stringify(config, null, 2))`
- **路径处理**：`path.join(os.homedir(), '.nanobot', 'config.json')`

### 4. 错误处理
- **文件不存在**：`ENOENT` 错误码
- **JSON 解析失败**：`SyntaxError`
- **类型不匹配**：运行时验证

---

## 八、下一步学习方向

1. **工具系统**：理解 nanobot 如何加载和管理工具
2. **技能系统**：学习如何动态加载技能
3. **内存系统**：理解长期记忆和短期记忆的实现
4. **插件系统**：学习如何扩展 nanobot 功能

---

## 九、实战练习

### 练习 1：添加新的配置项
在 `schema.ts` 中添加一个新的配置项，例如：
```typescript
export interface Config {
  // ... 现有字段
  debug?: boolean;  // 新增：调试模式
}
```

### 练习 2：实现配置热重载
监听配置文件变化，自动重新加载配置：
```typescript
import * as chokidar from 'chokidar';

const watcher = chokidar.watch(getConfigPath());
watcher.on('change', async () => {
  console.log('🔄 Config changed, reloading...');
  const newConfig = await loadConfig();
  // 更新运行时配置
});
```

### 练习 3：添加配置验证
使用 `zod` 或 `class-validator` 添加运行时验证：
```typescript
import { z } from 'zod';

const ConfigSchema = z.object({
  agents: z.object({
    defaults: z.object({
      model: z.string(),
      provider: z.string(),
    }),
  }),
});

const validatedConfig = ConfigSchema.parse(rawConfig);
```

---

## 十、参考资源

- [nanobot 配置系统](https://github.com/nanobot-ai/nanobot/blob/main/nanobot/config/)
- [TypeScript 类型系统](https://www.typescriptlang.org/docs/handbook/2/basic-types.html)
- [Pydantic 数据验证](https://docs.pydantic.dev/)
- [Node.js 文件系统](https://nodejs.org/api/fs.html)

---

*Created on 2026-02-28*
