import { ContextBuilder } from './context';
import { ToolRegistry } from './tools/registry';
import { LLMProvider, ChatMessage } from '../providers/llm';
import { ReadFileTool, WriteFileTool, EditFileTool, ListDirTool, ExecTool } from './tools/filesystem';
import { WebSearchTool } from './tools/web_search';
import { MessageTool } from './tools/message';
import { MessageBus, InboundMessage, OutboundMessage, createOutboundMessage } from '../bus';

export class AgentLoop {
  private maxIterations = 40;
  private memoryWindow = 100;
  private context: ContextBuilder;
  private tools: ToolRegistry;
  private running = false;
  private history: Map<string, ChatMessage[]> = new Map();

  constructor(
    private bus: MessageBus,
    private provider: LLMProvider,
    private workspace: string,
    private model: string = 'anthropic/claude-3.5-sonnet'
  ) {
    this.context = new ContextBuilder(workspace);
    this.tools = new ToolRegistry();
    this._registerDefaultTools();
  }

  private _registerDefaultTools(): void {
    this.tools.register(new ReadFileTool(this.workspace));
    this.tools.register(new WriteFileTool(this.workspace));
    this.tools.register(new EditFileTool(this.workspace));
    this.tools.register(new ListDirTool(this.workspace));
    this.tools.register(new ExecTool(this.workspace));
    this.tools.register(new WebSearchTool());
    this.tools.register(new MessageTool());
  }

  async run(): Promise<void> {
    this.running = true;
    console.log('🤖 Agent loop started');

    while (this.running) {
      try {
        const msg = await this.bus.consumeInbound();
        if (msg) {
          this._dispatch(msg).catch(err => {
            console.error('Error processing message:', err);
          });
        }
      } catch (error) {
        console.error('Error in agent loop:', error);
      }
    }
  }

  stop(): void {
    this.running = false;
    console.log('🤖 Agent loop stopping');
  }

  private async _dispatch(msg: InboundMessage): Promise<void> {
    try {
      const response = await this._processMessage(msg);
      if (response) {
        await this.bus.publishOutbound(response);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      await this.bus.publishOutbound(createOutboundMessage(
        msg.channel,
        msg.chatId,
        'Sorry, I encountered an error.'
      ));
    }
  }

  private async _processMessage(msg: InboundMessage): Promise<OutboundMessage | null> {
    const preview = msg.content.length > 80 
      ? msg.content.substring(0, 80) + '...' 
      : msg.content;
    console.log(`📩 Processing message from ${msg.channel}:${msg.senderId}: ${preview}`);

    const sessionKey = msg.sessionKey;
    const history = this.history.get(sessionKey) || [];

    const initialMessages = await this.context.buildMessages(
      history,
      msg.content
    );

    const { finalContent, allMessages } = await this._runAgentLoop(initialMessages);

    this.history.set(sessionKey, allMessages.slice(-this.memoryWindow));

    const responseContent = finalContent || 'No response';
    console.log(`📤 Response to ${msg.channel}:${msg.senderId}: ${responseContent.substring(0, 120)}...`);

    return createOutboundMessage(
      msg.channel,
      msg.chatId,
      responseContent,
      msg.metadata
    );
  }

  private async _runAgentLoop(
    initialMessages: ChatMessage[]
  ): Promise<{ finalContent: string | null; allMessages: ChatMessage[] }> {
    let messages = [...initialMessages];
    let finalContent: string | null = null;

    for (let iteration = 0; iteration < this.maxIterations; iteration++) {
      const response = await this.provider.chat({
        messages,
        tools: this.tools.getDefinitions(),
        model: this.model,
      });

      if (response.tool_calls.length > 0) {
        messages = this.context.addAssistantMessage(
          messages,
          response.content,
          response.tool_calls
        );

        for (const toolCall of response.tool_calls) {
          const args = typeof toolCall.function.arguments === 'string'
            ? JSON.parse(toolCall.function.arguments)
            : toolCall.function.arguments;

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

  async processDirect(content: string, sessionKey: string = 'cli:direct'): Promise<string> {
    const msg: InboundMessage = {
      channel: 'cli',
      senderId: 'user',
      chatId: 'direct',
      content,
      media: [],
      metadata: {},
      sessionKey,
    };

    const response = await this._processMessage(msg);
    return response?.content || '';
  }
}
