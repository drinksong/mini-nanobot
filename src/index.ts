import dotenv from 'dotenv';
dotenv.config();

import { LLMProvider } from './providers/openrouter';
import { AgentLoop } from './agent/loop';
import { CLIChannel } from './channels/cli';

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('OPENROUTER_API_KEY not set in .env file');
    process.exit(1);
  }

  const provider = new LLMProvider(apiKey);
  const workspace = process.cwd();
  const agent = new AgentLoop(provider, workspace);
  const cli = new CLIChannel(agent);

  await cli.start();
}

main().catch(console.error);
