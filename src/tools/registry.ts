import { Tool, ToolParams } from './base';

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  unregister(name: string): void {
    this.tools.delete(name);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getDefinitions(): any[] {
    return Array.from(this.tools.values()).map(t => t.toSchema());
  }

  async execute(name: string, params: ToolParams): Promise<string> {
    const tool = this.tools.get(name);
    if (!tool) {
      return `Error: Tool '${name}' not found`;
    }

    const errors = tool.validateParams(params);
    if (errors.length > 0) {
      return `Error: ${errors.join('; ')}`;
    }

    try {
      return await tool.execute(params);
    } catch (e) {
      return `Error executing ${name}: ${e}`;
    }
  }

  get toolNames(): string[] {
    return Array.from(this.tools.keys());
  }
}
