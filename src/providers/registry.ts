/**
 * Provider Registry — single source of truth for LLM provider metadata.
 */

export interface ProviderSpec {
  // identity
  name: string;                       // config field name, e.g. "volcengine"
  keywords: string[];                 // model-name keywords for matching (lowercase)
  envKey: string;                     // env var name, e.g. "VOLCENGINE_API_KEY"
  displayName: string;                // shown in status

  // API configuration
  defaultApiBase: string;             // fallback base URL
  litellmPrefix: string;              // prefix for model name, e.g. "volcengine"
  skipPrefixes: string[];             // don't prefix if model already starts with these

  // detection
  isGateway: boolean;                 // routes any model (OpenRouter, VolcEngine)
  detectByKeyPrefix: string;          // match api_key prefix, e.g. "sk-or-"
  detectByBaseKeyword: string;        // match substring in api_base URL
}

export const PROVIDERS: ProviderSpec[] = [
  // === Gateways (detected by api_key / api_base, not model name) =========
  
  // OpenRouter: global gateway, keys start with "sk-or-"
  {
    name: "openrouter",
    keywords: ["openrouter"],
    envKey: "OPENROUTER_API_KEY",
    displayName: "OpenRouter",
    defaultApiBase: "https://openrouter.ai/api/v1",
    litellmPrefix: "openrouter",
    skipPrefixes: [],
    isGateway: true,
    detectByKeyPrefix: "sk-or-",
    detectByBaseKeyword: "openrouter",
  },

  // VolcEngine (火山引擎): OpenAI-compatible gateway
  {
    name: "volcengine",
    keywords: ["volcengine", "volces", "ark"],
    envKey: "VOLCENGINE_API_KEY",
    displayName: "VolcEngine",
    defaultApiBase: "https://ark.cn-beijing.volces.com/api/coding/v3",
    litellmPrefix: "volcengine",
    skipPrefixes: [],
    isGateway: true,
    detectByKeyPrefix: "",
    detectByBaseKeyword: "volces",
  },

  // === Standard providers (matched by model-name keywords) ===============

  // Anthropic
  {
    name: "anthropic",
    keywords: ["anthropic", "claude"],
    envKey: "ANTHROPIC_API_KEY",
    displayName: "Anthropic",
    defaultApiBase: "https://api.anthropic.com/v1",
    litellmPrefix: "",
    skipPrefixes: [],
    isGateway: false,
    detectByKeyPrefix: "",
    detectByBaseKeyword: "",
  },

  // OpenAI
  {
    name: "openai",
    keywords: ["openai", "gpt"],
    envKey: "OPENAI_API_KEY",
    displayName: "OpenAI",
    defaultApiBase: "https://api.openai.com/v1",
    litellmPrefix: "",
    skipPrefixes: [],
    isGateway: false,
    detectByKeyPrefix: "",
    detectByBaseKeyword: "",
  },

  // DeepSeek
  {
    name: "deepseek",
    keywords: ["deepseek"],
    envKey: "DEEPSEEK_API_KEY",
    displayName: "DeepSeek",
    defaultApiBase: "https://api.deepseek.com/v1",
    litellmPrefix: "deepseek",
    skipPrefixes: ["deepseek/"],
    isGateway: false,
    detectByKeyPrefix: "",
    detectByBaseKeyword: "",
  },

  // Gemini
  {
    name: "gemini",
    keywords: ["gemini"],
    envKey: "GEMINI_API_KEY",
    displayName: "Gemini",
    defaultApiBase: "https://generativelanguage.googleapis.com/v1beta",
    litellmPrefix: "gemini",
    skipPrefixes: ["gemini/"],
    isGateway: false,
    detectByKeyPrefix: "",
    detectByBaseKeyword: "",
  },

  // Zhipu (智谱)
  {
    name: "zhipu",
    keywords: ["zhipu", "glm", "zai"],
    envKey: "ZHIPUAI_API_KEY",
    displayName: "Zhipu AI",
    defaultApiBase: "https://open.bigmodel.cn/api/paasai/v4",
    litellmPrefix: "zai",
    skipPrefixes: ["zhipu/", "zai/"],
    isGateway: false,
    detectByKeyPrefix: "",
    detectByBaseKeyword: "",
  },

  // DashScope (通义千问)
  {
    name: "dashscope",
    keywords: ["qwen", "dashscope"],
    envKey: "DASHSCOPE_API_KEY",
    displayName: "DashScope",
    defaultApiBase: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    litellmPrefix: "dashscope",
    skipPrefixes: ["dashscope/"],
    isGateway: false,
    detectByKeyPrefix: "",
    detectByBaseKeyword: "",
  },

  // Moonshot (Kimi)
  {
    name: "moonshot",
    keywords: ["moonshot", "kimi"],
    envKey: "MOONSHOT_API_KEY",
    displayName: "Moonshot",
    defaultApiBase: "https://api.moonshot.cn/v1",
    litellmPrefix: "moonshot",
    skipPrefixes: ["moonshot/"],
    isGateway: false,
    detectByKeyPrefix: "",
    detectByBaseKeyword: "",
  },
];

/**
 * Find provider by model name
 */
export function findByModel(model: string): ProviderSpec | undefined {
  const modelLower = model.toLowerCase();
  const modelPrefix = modelLower.split("/")[0];

  // Prefer explicit provider prefix
  for (const spec of PROVIDERS) {
    if (modelPrefix && modelPrefix === spec.name) {
      return spec;
    }
  }

  // Match by keywords
  for (const spec of PROVIDERS) {
    if (spec.isGateway) continue; // Skip gateways
    if (spec.keywords.some(kw => modelLower.includes(kw))) {
      return spec;
    }
  }

  return undefined;
}

/**
 * Find gateway by api_key or api_base
 */
export function findGateway(apiKey?: string, apiBase?: string): ProviderSpec | undefined {
  for (const spec of PROVIDERS) {
    if (!spec.isGateway) continue;

    // Detect by api_key prefix
    if (spec.detectByKeyPrefix && apiKey && apiKey.startsWith(spec.detectByKeyPrefix)) {
      return spec;
    }

    // Detect by api_base keyword
    if (spec.detectByBaseKeyword && apiBase && apiBase.includes(spec.detectByBaseKeyword)) {
      return spec;
    }
  }

  return undefined;
}

/**
 * Find provider by name
 */
export function findByName(name: string): ProviderSpec | undefined {
  return PROVIDERS.find(spec => spec.name === name);
}

/**
 * Resolve model name with provider prefix
 */
export function resolveModel(model: string, apiKey?: string, apiBase?: string, providerName?: string): string {
  // Priority 1: provider_name (from config) is primary signal
  if (providerName) {
    const spec = findByName(providerName);
    if (spec && spec.litellmPrefix) {
      // Strip existing prefix if needed
      const bareModel = model.split('/').pop() || model;
      if (!model.startsWith(`${spec.litellmPrefix}/`)) {
        return `${spec.litellmPrefix}/${bareModel}`;
      }
    }
  }

  // Priority 2: Check for gateway
  const gateway = findGateway(apiKey, apiBase);
  if (gateway) {
    if (!model.startsWith(`${gateway.litellmPrefix}/`)) {
      return `${gateway.litellmPrefix}/${model}`;
    }
    return model;
  }

  // Priority 3: Check for standard provider
  const spec = findByModel(model);
  if (spec && spec.litellmPrefix) {
    // Skip if already prefixed
    if (spec.skipPrefixes.some(prefix => model.startsWith(prefix))) {
      return model;
    }
    if (!model.startsWith(`${spec.litellmPrefix}/`)) {
      return `${spec.litellmPrefix}/${model}`;
    }
  }

  return model;
}
