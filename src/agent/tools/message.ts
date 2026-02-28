import { Tool, ToolParams } from './base';

export class MessageTool extends Tool {
  constructor() {
    super();
  }

  get name() { return 'message'; }
  get description() { return 'Send a message to the user. Use this when you want to communicate something.'; }
  get parameters() {
    return {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'The message content to send' },
        channel: { type: 'string', description: 'Optional: target channel (telegram, discord, etc.)' },
        chat_id: { type: 'string', description: 'Optional: target chat/user ID' }
      },
      required: ['content']
    };
  }

  async execute({ content, channel, chat_id }: ToolParams): Promise<string> {
    try {
      // 在 CLI 模式下，直接打印消息
      console.log(`\n📨 Message${channel ? ` to ${channel}` : ''}: ${content}`);
      
      // TODO: 未来可以集成 Feishu、Telegram、Discord 等消息发送
      // if (channel === 'feishu' && chat_id) {
      //   await sendFeishuMessage(chat_id, content);
      // }
      
      return `Message sent: ${content}`;
    } catch (e: any) {
      return `Error sending message: ${e.message}`;
    }
  }
}
