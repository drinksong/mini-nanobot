import { Tool, ToolParams } from './base';

export class WebSearchTool extends Tool {
  constructor() {
    super();
  }

  get name() { return 'web_search'; }
  get description() { return 'Search the web. Returns titles, URLs, and snippets.'; }
  get parameters() {
    return {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        count: { type: 'number', description: 'Results (1-10)', minimum: 1, maximum: 10 }
      },
      required: ['query']
    };
  }

  async execute({ query, count = 5 }: ToolParams): Promise<string> {
    try {
      // 使用 DuckDuckGo 的即时答案 API（无需 API key）
      const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
      
      const response = await fetch(ddgUrl);
      const data = await response.json();
      
      let result = '';
      
      // 相关主题
      if (data.RelatedTopics && data.RelatedTopics.length > 0) {
        result += '📌 Related Topics:\n';
        const topics = data.RelatedTopics.slice(0, count);
        for (const topic of topics) {
          if (topic.Text && topic.FirstURL) {
            result += `- ${topic.Text}\n  ${topic.FirstURL}\n`;
          }
        }
      }
      
      // 即时答案
      if (data.AbstractText) {
        result += `\n📝 Abstract:\n${data.AbstractText}\n`;
        if (data.AbstractURL) {
          result += `Source: ${data.AbstractURL}\n`;
        }
      }
      
      // 即时答案
      if (data.Answer) {
        result += `\n✨ Answer:\n${data.Answer}\n`;
      }
      
      // 定义
      if (data.Definition) {
        result += `\n📖 Definition:\n${data.Definition}\n`;
      }
      
      return result || 'No results found. Try a different query.';
    } catch (e: any) {
      return `Error searching web: ${e.message}`;
    }
  }
}
