import { startFromEnv } from './runtime';

startFromEnv().catch((error) => {
  console.error(error);
  process.exit(1);
});
