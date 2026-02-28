import * as lark from '@larksuiteoapi/node-sdk';
import { MessageBus, createInboundMessage, OutboundMessage } from '../bus';

export interface FeishuEvent {
  header: {
    event_id: string;
    event_type: string;
    event_time: number;
    token: string;
  };
  event: {
    sender: {
      sender_id: {
        open_id: string;
        union_id: string;
        user_id: string;
      };
      sender_type: string;
      chat_type: string;
    };
    message: {
      message_id: string;
      chat_id: string;
      content: string;
      msg_type: string;
      create_time: string;
      update_time: string;
    };
  };
}

export interface FeishuMessageResponse {
  code: number;
  msg: string;
  data?: {
    message_id: string;
  };
}

export class FeishuChannel {
  private client: lark.Client;
  private wsClient: lark.WSClient | null = null;
  private running = false;

  constructor(
    private bus: MessageBus,
    private appId: string,
    private appSecret: string,
    private allowFrom: string[] = []
  ) {
    this.client = new lark.Client({
      appId: this.appId,
      appSecret: this.appSecret,
    });
  }

  async start(): Promise<void> {
    this.running = true;
    console.log('🚀 Starting Feishu channel...');

    this._startOutboundConsumer();

    this.wsClient = new lark.WSClient({
      appId: this.appId,
      appSecret: this.appSecret,
      loggerLevel: lark.LoggerLevel.info,
    });

    const eventDispatcher = new lark.EventDispatcher({}).register({
      'im.message.receive_v1': async (data: any) => {
        await this._handleEvent(data);
      },
    });

    this.wsClient.start({
      eventDispatcher,
    });

    console.log('✅ Feishu WebSocket client started');
  }

  stop(): void {
    this.running = false;
    if (this.wsClient) {
      this.wsClient = null;
      console.log('🛑 Feishu WebSocket client stopped');
    }
  }

  private async _startOutboundConsumer(): Promise<void> {
    while (this.running) {
      try {
        const msg = await this.bus.consumeOutbound();
        if (msg && msg.channel === 'feishu') {
          await this._sendMessage(msg.chatId, msg.content);
        }
      } catch (error) {
        console.error('Error consuming outbound message:', error);
      }
    }
  }

  private isAllowed(senderId: string): boolean {
    if (this.allowFrom.length === 0) {
      return true;
    }
    return this.allowFrom.includes(senderId);
  }

  private async _handleEvent(event: any): Promise<void> {
    try {
      if (event.event_type !== 'im.message.receive_v1') {
        return;
      }

      const { sender, message } = event;

      if (message.message_type !== 'text') {
        return;
      }

      const userId = sender.sender_id.open_id;
      const chatId = message.chat_id;
      const content = this._parseMessageContent(message.content);

      if (!this.isAllowed(userId)) {
        console.warn(`Access denied for sender ${userId} on channel feishu`);
        return;
      }

      console.log(`👤 User ${userId} in chat ${chatId}: ${content}`);

      await this.bus.publishInbound(createInboundMessage(
        'feishu',
        userId,
        chatId,
        content
      ));
    } catch (error) {
      console.error('Error in _handleEvent:', error);
    }
  }

  private _parseMessageContent(content: string): string {
    try {
      const parsed = JSON.parse(content);
      if (parsed.text) {
        return parsed.text;
      }
      return content;
    } catch {
      return content;
    }
  }

  private async _sendMessage(chatId: string, content: string): Promise<void> {
    const res = await this.client.im.message.create({
      params: {
        receive_id_type: 'chat_id',
      },
      data: {
        receive_id: chatId,
        msg_type: 'text',
        content: JSON.stringify({ text: content }),
      },
    });

    if (res.code !== 0) {
      console.error(`Failed to send message: ${res.msg}`);
    } else {
      console.log(`✅ Sent response to ${chatId}`);
    }
  }

  get isRunning(): boolean {
    return this.running;
  }
}
