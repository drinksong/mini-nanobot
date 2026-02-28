import OpenAI from 'openai';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

export interface ChatResponse {
  content: string | null;
  tool_calls: any[];
  reasoning_content?: string;
}

export class LLMProvider {
  private client: OpenAI;

  constructor(
    private apiKey: string,
    private baseURL: string = 'https://openrouter.ai/api/v1'
  ) {
    this.client = new OpenAI({ apiKey, baseURL });
  }

  async chat({
    messages,
    tools = [],
    model = 'anthropic/claude-3.5-sonnet',
    temperature = 0.1,
    max_tokens = 1024,
  }: {
    messages: ChatMessage[];
    tools?: any[];
    model?: string;
    temperature?: number;
    max_tokens?: number;
  }): Promise<ChatResponse> {
    const response = await this.client.chat.completions.create({
      model,
      messages: messages as any,
      tools: tools.length > 0 ? tools : undefined,
      temperature,
      max_tokens,
    });

    const choice = response.choices[0];
    const message = choice.message;

    return {
      content: message.content || null,
      tool_calls: (message as any).tool_calls || [],
      reasoning_content: (message as any).reasoning_content,
    };
  }

  get_default_model(): string {
    return 'anthropic/claude-3.5-sonnet';
  }
}
