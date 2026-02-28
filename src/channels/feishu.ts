import * as lark from '@larksuiteoapi/node-sdk';

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

export type EventHandler = (event: FeishuEvent) => void;

export class FeishuProvider {
  private client: lark.Client;
  private wsClient: lark.WSClient | null = null;
  private eventHandlers: EventHandler[] = [];

  constructor(
    private appId: string,
    private appSecret: string
  ) {
    // 创建 API 客户端
    this.client = new lark.Client({
      appId: this.appId,
      appSecret: this.appSecret,
    });
  }

  /**
   * 解析飞书消息内容
   */
  parseMessageContent(content: string): string {
    try {
      const parsed = JSON.parse(content);
      // 文本消息格式: {"text":"内容"}
      if (parsed.text) {
        return parsed.text;
      }
      return content;
    } catch {
      return content;
    }
  }

  /**
   * 发送文本消息
   */
  async sendMessage(chatId: string, content: string): Promise<FeishuMessageResponse> {
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

    return {
      code: res.code ?? 0,
      msg: res.msg ?? '',
      data: res.data?.message_id ? { message_id: res.data.message_id } : undefined,
    };
  }

  /**
   * 发送富文本消息（支持 Markdown）
   */
  async sendMarkdownMessage(chatId: string, content: string): Promise<FeishuMessageResponse> {
    const res = await this.client.im.message.create({
      params: {
        receive_id_type: 'chat_id',
      },
      data: {
        receive_id: chatId,
        msg_type: 'post',
        content: JSON.stringify({
          post: {
            zh_cn: {
              title: 'mini-nanobot 回复',
              content: [
                [
                  {
                    tag: 'text',
                    text: content,
                  },
                ],
              ],
            },
          },
        }),
      },
    });

    return {
      code: res.code ?? 0,
      msg: res.msg ?? '',
      data: res.data?.message_id ? { message_id: res.data.message_id } : undefined,
    };
  }

  /**
   * 注册事件处理器
   */
  onEvent(handler: EventHandler): void {
    this.eventHandlers.push(handler);
  }

  /**
   * 启动长连接
   * 使用官方 SDK 的 WSClient
   */
  async startLongConnection(): Promise<void> {
    console.log('🚀 Starting Feishu WebSocket long connection...');

    // 创建 WebSocket 客户端
    this.wsClient = new lark.WSClient({
      appId: this.appId,
      appSecret: this.appSecret,
      loggerLevel: lark.LoggerLevel.info,
    });

    // 创建事件分发器
    const eventDispatcher = new lark.EventDispatcher({}).register({
      'im.message.receive_v1': async (data: any) => {
        console.log('📨 Received message event');
        console.log('📨 Event data:', JSON.stringify(data, null, 2).substring(0, 500));
        
        // SDK 返回的数据结构可能不同，直接使用原始数据
        // 触发所有事件处理器
        for (const handler of this.eventHandlers) {
          handler(data);
        }
      },
    });

    // 启动长连接
    this.wsClient.start({
      eventDispatcher,
    });

    console.log('✅ Feishu WebSocket client started');
  }

  /**
   * 停止长连接
   */
  stopLongConnection(): void {
    if (this.wsClient) {
      // WSClient 可能没有 stop 方法，直接置空
      this.wsClient = null;
      console.log('🛑 Feishu WebSocket client stopped');
    }
  }
}

/**
 * 飞书交互渠道
 */
export class FeishuChannel {
  private agent: any;
  private feishu: FeishuProvider;

  constructor(agent: any, feishu: FeishuProvider) {
    this.agent = agent;
    this.feishu = feishu;
  }

  /**
   * 启动飞书渠道
   */
  async start(): Promise<void> {
    console.log('🚀 Starting Feishu channel...');

    // 注册事件处理器
    this.feishu.onEvent(async (event: any) => {
      await this._handleEvent(event);
    });

    // 启动长连接
    await this.feishu.startLongConnection();
  }

  /**
   * 处理飞事件
   */
  private async _handleEvent(event: any): Promise<void> {
    try {
      console.log('📨 Full event structure:', JSON.stringify(event, null, 2).substring(0, 1000));
      
      // SDK 返回的数据结构是扁平的：
      // {
      //   schema: "2.0",
      //   event_id: "...",
      //   event_type: "im.message.receive_v1",
      //   sender: { sender_id: {...}, ... },
      //   message: { chat_id, message_type, content, ... }
      // }
      
      // 只处理接收消息事件
      if (event.event_type !== 'im.message.receive_v1') {
        console.log(`⏭️  Skipping event: ${event.event_type}`);
        return;
      }

      const { sender, message } = event;
      
      // 只处理文本消息（注意：SDK 返回的是 message_type，不是 msg_type）
      if (message.message_type !== 'text') {
        console.log(`⏭️  Skipping non-text message: ${message.message_type}`);
        return;
      }

      const userId = sender.sender_id.open_id;
      const chatId = message.chat_id;
      const content = this.feishu.parseMessageContent(message.content);

      console.log(`👤 User ${userId} in chat ${chatId}: ${content}`);

      // 异步处理消息
      this._handleMessage(userId, chatId, content).catch((error) => {
        console.error('Error handling message:', error);
      });
    } catch (error) {
      console.error('Error in _handleEvent:', error);
    }
  }

  /**
   * 处理用户消息
   */
  private async _handleMessage(userId: string, chatId: string, content: string): Promise<void> {
    console.log(`Processing message from ${userId} in chat ${chatId}: ${content}`);

    try {
      // 调用 Agent 处理消息
      const response = await this.agent.processMessage(content, {
        userId,
        chatId,
        channel: 'feishu',
      });

      // 发送回复
      await this.feishu.sendMessage(chatId, response);
      console.log(`✅ Sent response to ${chatId}`);
    } catch (error) {
      console.error('Error processing message:', error);
      await this.feishu.sendMessage(chatId, `❌ 处理消息时出错: ${error}`);
    }
  }
}
