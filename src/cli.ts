#!/usr/bin/env node
import { onboard } from './onboard';
import { startAgent, startGateway } from './runtime';

function printHelp(): void {
  console.log(`octobot CLI

Usage:
  octobot onboard
  octobot agent
  octobot gateway

Examples:
  octobot onboard
  octobot agent
  octobot gateway
`);
}

async function main(): Promise<void> {
  const [command] = process.argv.slice(2);

  if (!command || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  if (command === 'onboard') {
    await onboard();
    return;
  }

  if (command === 'agent') {
    await startAgent();
    return;
  }

  if (command === 'gateway') {
    await startGateway();
    return;
  }

  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
