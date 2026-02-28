import { ContextBuilder } from './context';
import { ToolRegistry } from '../tools/registry';
import { LLMProvider, ChatMessage, ChatResponse } from '../providers/openrouter';
import { ReadFileTool, WriteFileTool, EditFileTool, ListDirTool, ExecTool } from '../tools/filesystem';
import { WebSearchTool } from '../tools/web_search';
import { MessageTool } from '../tools/message';

export class AgentLoop {
  private maxIterations = 40;
  private memoryWindow = 100;
  private history: ChatMessage[] = [];

  constructor(
    private provider: LLMProvider,
    private workspace: string,
    private model: string = 'anthropic/claude-3.5-sonnet'
  ) {
    this.context = new ContextBuilder(workspace);
    this.tools = new ToolRegistry();
    this._registerDefaultTools();
  }

  private context: ContextBuilder;
  private tools: ToolRegistry;

  private _registerDefaultTools(): void {
    // File system tools
    this.tools.register(new ReadFileTool(this.workspace));
    this.tools.register(new WriteFileTool(this.workspace));
    this.tools.register(new EditFileTool(this.workspace));
    this.tools.register(new ListDirTool(this.workspace));
    
    // System tools
    this.tools.register(new ExecTool(this.workspace));
    
    // Network tools
    this.tools.register(new WebSearchTool());
    
    // Communication tools
    this.tools.register(new MessageTool());
  }

  async processMessage(message: string): Promise<string> {
    const initialMessages = await this.context.buildMessages(
      this.history,
      message
    );

    const { finalContent, allMessages } = await this._runAgentLoop(initialMessages);

    // 保存到历史
    this.history = allMessages.slice(-this.memoryWindow);

    return finalContent || 'No response';
  }

  private async _runAgentLoop(
    initialMessages: ChatMessage[]
  ): Promise<{ finalContent: string | null; allMessages: ChatMessage[] }> {
    let messages = [...initialMessages];
    let finalContent: string | null = null;
    const toolsUsed: string[] = [];

    for (let iteration = 0; iteration < this.maxIterations; iteration++) {
      const response = await this.provider.chat({
        messages,
        tools: this.tools.getDefinitions(),
        model: this.model,
      });

      if (response.tool_calls.length > 0) {
        // 添加 assistant 消息（包含 tool_calls）
        messages = this.context.addAssistantMessage(
          messages,
          response.content,
          response.tool_calls
        );

        // 执行每个 tool call
        for (const toolCall of response.tool_calls) {
          toolsUsed.push(toolCall.function.name);

          const args = JSON.parse(toolCall.function.arguments);
          const result = await this.tools.execute(
            toolCall.function.name,
            args
          );

          messages = this.context.addToolResult(
            messages,
            toolCall.id,
            toolCall.function.name,
            result
          );
        }
      } else {
        // 没有 tool calls，结束循环
        messages = this.context.addAssistantMessage(
          messages,
          response.content
        );
        finalContent = response.content;
        break;
      }
    }

    if (finalContent === null) {
      finalContent = `I reached the maximum number of iterations (${this.maxIterations}) without completing the task.`;
    }

    return { finalContent, allMessages: messages };
  }
}
