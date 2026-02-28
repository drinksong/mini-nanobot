import dotenv from 'dotenv';
dotenv.config();

import { LLMProvider } from './providers/openrouter';
import { FeishuProvider } from './providers/feishu';
import { AgentLoop } from './agent/loop';
import { CLIChannel } from './channels/cli';
import { FeishuChannel } from './channels/feishu';

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('OPENROUTER_API_KEY not set in .env file');
    process.exit(1);
  }

  const provider = new LLMProvider(apiKey);
  const workspace = process.cwd();
  const agent = new AgentLoop(provider, workspace);

  // 检查运行模式
  const mode = process.env.MODE || 'cli';

  if (mode === 'feishu') {
    // 飞书机器人模式
    const appId = process.env.FEISHU_APP_ID;
    const appSecret = process.env.FEISHU_APP_SECRET;

    if (!appId || !appSecret) {
      console.error('Missing required Feishu environment variables:');
      console.error('  - FEISHU_APP_ID');
      console.error('  - FEISHU_APP_SECRET');
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
