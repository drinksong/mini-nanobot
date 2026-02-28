import { AgentLoop } from '../agent/loop';
import { FeishuProvider } from '../providers/feishu';

export class FeishuChannel {
  constructor(
    private agent: AgentLoop,
    private feishu: FeishuProvider
  ) {
    // 注册事件处理器
    this.feishu.onEvent((event) => this._handleEvent(event));
  }

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

  private async _handleMessage(userId: string, chatId: string, content: string): Promise<void> {
    try {
      console.log(`🤖 Processing message from ${userId}...`);
      
      // 调用 Agent 处理消息
      const response = await this.agent.processMessage(content);
      
      console.log(`✅ Agent response: ${response.substring(0, 100)}...`);
      
      // 发送回复
      const result = await this.feishu.sendMessage(chatId, response);
      
      if (result.code === 0) {
        console.log(`✅ Message sent to ${chatId}`);
      } else {
        console.error(`❌ Failed to send message: ${result.msg}`);
      }
    } catch (error) {
      console.error('Error in _handleMessage:', error);
      
      // 发送错误提示
      await this.feishu.sendMessage(chatId, '抱歉，处理消息时出错了 😢');
    }
  }

  async start(): Promise<void> {
    console.log(`\n🚀 mini-nanobot Feishu bot is starting...`);
    console.log(`📡 Using long connection mode (WebSocket)`);
    console.log(`\n⚙️  Make sure you have enabled long connection in Feishu developer console:\n`);
    console.log(`   - App Settings -> Event Subscriptions -> Enable Long Connection\n`);
    
    await this.feishu.startLongConnection();
  }

  stop(): void {
    console.log('🛑 Stopping Feishu bot...');
    this.feishu.stopLongConnection();
  }
}
