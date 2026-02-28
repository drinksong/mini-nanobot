import dotenv from 'dotenv';
dotenv.config();

import { LLMProvider } from './providers/llm';
import { FeishuProvider } from './channels/feishu';
import { AgentLoop } from './agent/loop';
import { CLIChannel } from './channels/cli';
import { FeishuChannel } from './channels/feishu';

async function main() {
  // 检测 LLM 提供商和 API key
  let apiKey = '';
  let providerName = '';

  if (process.env.OPENROUTER_API_KEY) {
    apiKey = process.env.OPENROUTER_API_KEY;
    providerName = 'openrouter';
  } else if (process.env.VOLCENGINE_API_KEY) {
    apiKey = process.env.VOLCENGINE_API_KEY;
    providerName = 'volcengine';
  } else if (process.env.ANTHROPIC_API_KEY) {
    apiKey = process.env.ANTHROPIC_API_KEY;
    providerName = 'anthropic';
  } else if (process.env.OPENAI_API_KEY) {
    apiKey = process.env.OPENAI_API_KEY;
    providerName = 'openai';
  } else if (process.env.DEEPSEEK_API_KEY) {
    apiKey = process.env.DEEPSEEK_API_KEY;
    providerName = 'deepseek';
  } else if (process.env.GEMINI_API_KEY) {
    apiKey = process.env.GEMINI_API_KEY;
    providerName = 'gemini';
  } else if (process.env.ZHIPUAI_API_KEY) {
    apiKey = process.env.ZHIPUAI_API_KEY;
    providerName = 'zhipu';
  } else if (process.env.DASHSCOPE_API_KEY) {
    apiKey = process.env.DASHSCOPE_API_KEY;
    providerName = 'dashscope';
  } else if (process.env.MOONSHOT_API_KEY) {
    apiKey = process.env.MOONSHOT_API_KEY;
    providerName = 'moonshot';
  }

  if (!apiKey) {
    console.error('❌ No LLM API key found. Please set one of the following in .env:');
    console.error('   - OPENROUTER_API_KEY');
    console.error('   - VOLCENGINE_API_KEY');
    console.error('   - ANTHROPIC_API_KEY');
    console.error('   - OPENAI_API_KEY');
    console.error('   - DEEPSEEK_API_KEY');
    console.error('   - GEMINI_API_KEY');
    console.error('   - ZHIPUAI_API_KEY');
    console.error('   - DASHSCOPE_API_KEY');
    console.error('   - MOONSHOT_API_KEY');
    process.exit(1);
  }

  // 检测 API Base
  const apiBase = process.env.API_BASE || '';

  // 检测模型
  const model = process.env.LLM_MODEL || 'gpt-4o-mini';

  console.log(`\n🚀 mini-nanobot starting...`);
  console.log(`📦 Model: ${model}`);
  console.log(`🔑 Provider: ${providerName}`);

  const provider = new LLMProvider(apiKey, apiBase, model, providerName);
  const workspace = process.cwd();
  const agent = new AgentLoop(provider, workspace, model);

  // 检查运行模式
  const mode = process.env.MODE || 'cli';

  if (mode === 'feishu') {
    // 飞书机器人模式
    const appId = process.env.FEISHU_APP_ID;
    const appSecret = process.env.FEISHU_APP_SECRET;

    if (!appId || !appSecret) {
      console.error('❌ Missing required Feishu environment variables:');
      console.error('   - FEISHU_APP_ID');
      console.error('   - FEISHU_APP_SECRET');
      process.exit(1);
    }

    const feishu = new FeishuProvider(appId, appSecret);
    const feishuChannel = new FeishuChannel(agent, feishu);

    await feishuChannel.start();
  } else {
    // CLI 模式（默认）
    const cli = new CLIChannel(agent);
    await cli.start();
  }
}

main().catch(console.error);
