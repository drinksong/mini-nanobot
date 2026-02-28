import OpenAI from 'openai';
import { findByModel, findGateway, findByName, resolveModel, ProviderSpec } from './registry';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
  reasoning_content?: string;
}

export interface ChatResponse {
  content: string | null;
  tool_calls: any[];
  reasoning_content?: string;
}

export class LLMProvider {
  private client: OpenAI;
  private provider: ProviderSpec | undefined;
  private resolvedModel: string;

  constructor(
    private apiKey: string,
    private apiBase: string = '',
    private defaultModel: string = 'gpt-4o-mini',
    private providerName: string = ''
  ) {
    // Detect provider: provider_name (from config) is primary signal
    this.provider = findByName(this.providerName) || findGateway(this.apiKey, this.apiBase) || findByModel(this.defaultModel);
    
    // Resolve API base
    const baseURL = this.apiBase || this.provider?.defaultApiBase || 'https://api.openai.com/v1';
    
    // Create OpenAI client
    this.client = new OpenAI({
      apiKey: this.apiKey,
      baseURL: baseURL,
    });

    // Resolve model name
    this.resolvedModel = resolveModel(this.defaultModel, this.apiKey, this.apiBase, this.providerName);
    
    console.log(`🤖 LLM Provider: ${this.provider?.displayName || 'Custom'}`);
    console.log(`🤖 Model: ${this.resolvedModel}`);
    console.log(`🤖 API Base: ${baseURL}`);
  }

  async chat({
    messages,
    tools = [],
    model,
    temperature = 0.1,
    max_tokens = 512,
  }: {
    messages: ChatMessage[];
    tools?: any[];
    model?: string;
    temperature?: number;
    max_tokens?: number;
  }): Promise<ChatResponse> {
    const finalModel = model ? resolveModel(model, this.apiKey, this.apiBase) : this.resolvedModel;
    
    console.log(`📤 Sending request to model: ${finalModel}`);

    try {
      const response = await this.client.chat.completions.create({
        model: finalModel,
        messages: messages as any,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? 'auto' : undefined,
        temperature,
        max_tokens,
      });

      const choice = response.choices[0];
      const message = choice.message;

      const tool_calls = message.tool_calls?.map((tc: any) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments),
      })) || [];

      return {
        content: message.content,
        tool_calls,
        reasoning_content: (message as any).reasoning_content,
      };
    } catch (error: any) {
      console.error('❌ LLM API Error:', error.message);
      return {
        content: `Error calling LLM: ${error.message}`,
        tool_calls: [],
      };
    }
  }
}
