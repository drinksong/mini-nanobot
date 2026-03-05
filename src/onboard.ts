import * as fs from 'fs/promises';
import { createDefaultConfig, getConfigPath, loadConfig, saveConfig, Config } from './config';
import { initWorkspace } from './runtime';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mergeDeep<T>(base: T, override: Partial<T>): T {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return (override ?? base) as T;
  }
  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(override)) {
    const baseValue = (base as Record<string, unknown>)[key];
    if (isPlainObject(baseValue) && isPlainObject(value)) {
      result[key] = mergeDeep(baseValue, value);
    } else if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as T;
}

async function loadExistingConfig(configPath: string): Promise<Config | null> {
  try {
    await fs.access(configPath);
    return await loadConfig(configPath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export async function onboard(): Promise<void> {
  const configPath = getConfigPath();
  const defaults = createDefaultConfig();
  const existing = await loadExistingConfig(configPath);

  const config = existing ? mergeDeep(defaults, existing) : defaults;
  await saveConfig(config, configPath);

  if (existing) {
    console.log(`✅ Config refreshed at ${configPath}`);
  } else {
    console.log(`✅ Created config at ${configPath}`);
  }

  await initWorkspace(config.agents.defaults.workspace);

  console.log('\n🐙 octobot is ready!');
  console.log('\nNext steps:');
  console.log('  1. Add your API key to ~/.octobot/config.json');
  console.log('  2. Chat: octobot agent');
  console.log('  3. Gateway: octobot gateway');
}
