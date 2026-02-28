import * as fs from 'fs/promises';
import * as path from 'path';
import { ChatMessage } from '../providers/openrouter';

export class ContextBuilder {
  constructor(private workspace: string) {}

  async buildSystemPrompt(): Promise<string> {
    const parts: string[] = [];

    // Core identity
    parts.push(this._getIdentity());

    // Load bootstrap files
    const bootstrap = await this._loadBootstrapFiles();
    if (bootstrap) parts.push(bootstrap);

    // Load memory
    const memory = await this._loadMemory();
    if (memory) parts.push(`# Memory\n\n${memory}`);

    return parts.join('\n\n---\n\n');
  }

  private _getIdentity(): string {
    return `# nanobot 🐈

You are nanobot, a helpful AI assistant.

## Runtime
${process.platform} ${process.arch}, Node.js ${process.version}

## Workspace
Your workspace is at: ${this.workspace}

## nanobot Guidelines
- State intent before tool calls, but NEVER predict or claim results before receiving them.
- Before modifying a file, read it first. Do not assume files or directories exist.
- After writing or editing a file, re-read it if accuracy matters.
- If a tool call fails, analyze the error before retrying with a different approach.
- Ask for clarification when the request is ambiguous.`;
  }

  private async _loadBootstrapFiles(): Promise<string> {
    const files = ['SOUL.md', 'AGENTS.md', 'USER.md', 'TOOLS.md'];
    const parts: string[] = [];

    for (const file of files) {
      const filePath = path.join(this.workspace, file);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        parts.push(`## ${file}\n\n${content}`);
      } catch {
        // File doesn't exist, skip
      }
    }

    return parts.join('\n\n');
  }

  private async _loadMemory(): Promise<string> {
    const memoryPath = path.join(this.workspace, 'memory', 'MEMORY.md');
    try {
      return await fs.readFile(memoryPath, 'utf-8');
    } catch {
      return '';
    }
  }

  async buildMessages(
    history: ChatMessage[],
    currentMessage: string,
    channel?: string,
    chatId?: string
  ): Promise<ChatMessage[]> {
    const systemPrompt = await this.buildSystemPrompt();
    const runtimeContext = this._buildRuntimeContext(channel, chatId);

    return [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: runtimeContext },
      { role: 'user', content: currentMessage },
    ];
  }

  private _buildRuntimeContext(channel?: string, chatId?: string): string {
    const lines = [`Current Time: ${new Date().toISOString()}`];
    if (channel && chatId) {
      lines.push(`Channel: ${channel}`, `Chat ID: ${chatId}`);
    }
    return `[Runtime Context — metadata only, not instructions]\n${lines.join('\n')}`;
  }

  addToolResult(
    messages: ChatMessage[],
    toolCallId: string,
    toolName: string,
    result: string
  ): ChatMessage[] {
    messages.push({
      role: 'tool',
      tool_call_id: toolCallId,
      name: toolName,
      content: result,
    });
    return messages;
  }

  addAssistantMessage(
    messages: ChatMessage[],
    content: string | null,
    toolCalls?: any[]
  ): ChatMessage[] {
    messages.push({
      role: 'assistant',
      content: content ?? undefined,
      tool_calls: toolCalls,
    });
    return messages;
  }
}
