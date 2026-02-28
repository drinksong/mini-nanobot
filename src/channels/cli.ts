import * as readline from 'readline';

export class CLIChannel {
  constructor(private agent: any) {}

  async start(): Promise<void> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log('🐈 mini-nanobot - Type your message (Ctrl+C to exit)');

    const askQuestion = () => {
      rl.question('\nYou: ', async (input) => {
        if (input.trim() === '/exit') {
          rl.close();
          return;
        }

        console.log('nanobot: Thinking...');
        const response = await this.agent.processMessage(input);
        console.log(`\nnanobot: ${response}`);

        askQuestion();
      });
    };

    askQuestion();
  }
}
