/**
 * Context builder for assembling agent prompts.
 * Reference: /Users/bytedance/github/nanobot/nanobot/agent/context.py
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { ChatMessage } from '../providers/llm';

export class ContextBuilder {
  private readonly BOOTSTRAP_FILES = ['AGENTS.md', 'SOUL.md', 'USER.md', 'TOOLS.md', 'IDENTITY.md'];
  private readonly RUNTIME_CONTEXT_TAG = '[Runtime Context — metadata only, not instructions]';

  constructor(private workspace: string) {}

  async buildSystemPrompt(): Promise<string> {
    const parts: string[] = [];

    // Core identity
    parts.push(this._getIdentity());

    // Load bootstrap files
    const bootstrap = await this._loadBootstrapFiles();
    if (bootstrap) parts.push(bootstrap);

    // Memory context (simplified for now)
    const memory = await this._getMemoryContext();
    if (memory) parts.push(`# Memory\n\n${memory}`);

    // Skills summary (simplified for now)
    const skillsSummary = this._getSkillsSummary();
    if (skillsSummary) parts.push(skillsSummary);

    return parts.join('\n\n---\n\n');
  }

  private _getIdentity(): string {
    const workspacePath = path.resolve(this.workspace.replace('~', process.env.HOME || ''));
    const system = process.platform;
    const osName = system === 'darwin' ? 'macOS' : system;
    const runtime = `${osName} ${process.arch}, Node.js ${process.version}`;

    return `# nanobot 🐈

You are nanobot, a helpful AI assistant.

## Runtime
${runtime}

## Workspace
Your workspace is at: ${workspacePath}
- Long-term memory: ${workspacePath}/memory/MEMORY.md (write important facts here)
- History log: ${workspacePath}/memory/HISTORY.md (grep-searchable)
- Custom skills: ${workspacePath}/skills/{skill-name}/SKILL.md

## nanobot Guidelines
- State intent before tool calls, but NEVER predict or claim results before receiving them.
- Before modifying a file, read it first. Do not assume files or directories exist.
- After writing or editing a file, re-read it if accuracy matters.
- If a tool call fails, analyze the error before retrying with a different approach.
- Ask for clarification when the request is ambiguous.

Reply directly with text for conversations. Only use the 'message' tool to send to a specific chat channel.`;
  }

  private _buildRuntimeContext(channel?: string, chatId?: string): string {
    const now = new Date();
    const timeStr = now.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'long',
    });
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    const lines = [`Current Time: ${timeStr} (${tz})`];
    if (channel && chatId) {
      lines.push(`Channel: ${channel}`, `Chat ID: ${chatId}`);
    }

    return `${this.RUNTIME_CONTEXT_TAG}\n${lines.join('\n')}`;
  }

  private async _loadBootstrapFiles(): Promise<string> {
    const parts: string[] = [];
    const workspacePath = this.workspace.replace('~', process.env.HOME || '');

    for (const filename of this.BOOTSTRAP_FILES) {
      const filePath = path.join(workspacePath, filename);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        parts.push(`## ${filename}\n\n${content}`);
      } catch {
        // File doesn't exist, skip
      }
    }

    return parts.join('\n\n');
  }

  private async _getMemoryContext(): Promise<string> {
    const workspacePath = this.workspace.replace('~', process.env.HOME || '');
    const memoryPath = path.join(workspacePath, 'memory', 'MEMORY.md');

    try {
      const content = await fs.readFile(memoryPath, 'utf-8');
      return content;
    } catch {
      return '';
    }
  }

  private _getSkillsSummary(): string {
    // Simplified for now - will implement skills loading later
    return `# Skills

The following skills extend your capabilities. To use a skill, read its SKILL.md file using the read_file tool.
Skills with available="false" need dependencies installed first - you can try installing them with apt/brew.

<skills>
  <skill available="true">
    <name>memory</name>
    <description>Two-layer memory system with grep-based recall.</description>
  </skill>
</skills>`;
  }

  public async buildMessages(
    history: ChatMessage[],
    currentMessage: string,
    channel?: string,
    chatId?: string,
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

  public addToolResult(
    messages: ChatMessage[],
    toolCallId: string,
    toolName: string,
    result: string,
  ): ChatMessage[] {
    messages.push({
      role: 'tool',
      tool_call_id: toolCallId,
      name: toolName,
      content: result,
    });
    return messages;
  }

  public addAssistantMessage(
    messages: ChatMessage[],
    content: string | null,
    toolCalls?: any[],
    reasoningContent?: string,
  ): ChatMessage[] {
    const msg: ChatMessage = { role: 'assistant', content };
    if (toolCalls) msg.tool_calls = toolCalls;
    if (reasoningContent !== undefined) msg.reasoning_content = reasoningContent;
    messages.push(msg);
    return messages;
  }
}
