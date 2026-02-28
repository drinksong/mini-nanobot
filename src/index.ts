/**
 * mini-nanobot entry point.
 * Reference: /Users/bytedance/github/nanobot/nanobot/__main__.py
 */

import dotenv from 'dotenv';
dotenv.config();

import { LLMProvider } from './providers/llm';
import { AgentLoop } from './agent/loop';
import { CLIChannel } from './channels/cli';
import { FeishuChannel } from './channels/feishu';
import { loadConfig, Config } from './config';

async function main() {
  // 加载配置
  const config = await loadConfig('./config.json');

  // 从配置获取模型和提供商
  const model = config.agents.defaults.model;
  const providerName = config.agents.defaults.provider;
  const workspace = config.agents.defaults.workspace;

  // 查找提供商配置
  let providerConfig = config.providers[providerName];
  let apiKey = providerConfig?.api_key || providerConfig?.apiKey || '';
  let apiBase = providerConfig?.api_base || providerConfig?.apiBase || '';

  // 如果 provider 是 auto，尝试自动检测
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

  if (!apiKey) {
    console.error('❌ No LLM API key found in config.json');
    console.error('   Please add an API key to config.json under providers.{provider_name}.api_key');
    process.exit(1);
  }

  console.log(`\n🚀 mini-nanobot starting...`);
  console.log(`📦 Model: ${model}`);
  console.log(`🔑 Provider: ${providerName}`);
  console.log(`📁 Workspace: ${workspace}`);

  const provider = new LLMProvider(apiKey, apiBase, model, providerName);
  const agent = new AgentLoop(provider, workspace, model);

  // 检查运行模式
  const mode = process.env.MODE || 'cli';

  if (mode === 'feishu') {
    // 飞书机器人模式
    const feishuConfig = config.channels.feishu;

    const appId = feishuConfig.app_id || feishuConfig.appId || '';
    const appSecret = feishuConfig.app_secret || feishuConfig.appSecret || '';

    if (!feishuConfig.enabled || !appId || !appSecret) {
      console.error('❌ Feishu channel not configured in config.json');
      console.error('   Please set channels.feishu.enabled = true');
      console.error('   And provide channels.feishu.app_id and channels.feishu.app_secret');
      process.exit(1);
    }

    const feishuChannel = new FeishuChannel(agent, appId, appSecret);
    await feishuChannel.start();
  } else {
    // CLI 模式（默认）
    const cli = new CLIChannel(agent);
    await cli.start();
  }
}

main().catch(console.error);
