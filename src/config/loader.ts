/**
 * Configuration loading utilities.
 * Reference: /Users/bytedance/github/nanobot/nanobot/config/loader.py
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { Config, createDefaultConfig } from './schema';

export function getConfigPath(): string {
  return path.join(os.homedir(), '.nanobot', 'config.json');
}

export async function loadConfig(configPath?: string): Promise<Config> {
  const filePath = configPath || getConfigPath();

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    const migrated = migrateConfig(data);
    return migrated;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log(`Config file not found at ${filePath}, using defaults`);
      return createDefaultConfig();
    }
    console.warn(`Failed to load config from ${filePath}: ${error}`);
    return createDefaultConfig();
  }
}

export async function saveConfig(config: Config, configPath?: string): Promise<void> {
  const filePath = configPath || getConfigPath();
  const dir = path.dirname(filePath);

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(config, null, 2), 'utf-8');
}

function migrateConfig(data: any): Config {
  // Move tools.exec.restrictToWorkspace → tools.restrictToWorkspace
  if (data.tools?.exec?.restrictToWorkspace !== undefined && data.tools.restrictToWorkspace === undefined) {
    data.tools.restrictToWorkspace = data.tools.exec.restrictToWorkspace;
    delete data.tools.exec.restrictToWorkspace;
  }
  return data;
}
