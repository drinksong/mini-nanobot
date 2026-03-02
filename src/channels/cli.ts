import * as readline from 'readline';
import { MessageBus, createInboundMessage, OutboundMessage } from '../bus';

export class CLIChannel {
  private running = false;

  constructor(private bus: MessageBus) {}

  async start(): Promise<void> {
    this.running = true;
    console.log('🐙 octobot - Type your message (Ctrl+C to exit)');

    this._startOutboundConsumer();

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const askQuestion = () => {
      if (!this.running) {
        rl.close();
        return;
      }

      rl.question('\nYou: ', async (input) => {
        const trimmed = input.trim();
        
        if (trimmed === '/exit') {
          this.stop();
          rl.close();
          return;
        }

        if (!trimmed) {
          askQuestion();
          return;
        }

        console.log('octobot: Thinking...');

        await this.bus.publishInbound(createInboundMessage(
          'cli',
          'user',
          'default',
          trimmed
        ));

        askQuestion();
      });
    };

    askQuestion();
  }

  private async _startOutboundConsumer(): Promise<void> {
    while (this.running) {
      try {
        const msg = await this.bus.consumeOutbound();
        if (msg && msg.channel === 'cli') {
          console.log(`\noctobot: ${msg.content}`);
        }
      } catch (error) {
        console.error('Error consuming outbound message:', error);
      }
    }
  }

  stop(): void {
    this.running = false;
    console.log('\n👋 Goodbye!');
  }

  get isRunning(): boolean {
    return this.running;
  }
}
