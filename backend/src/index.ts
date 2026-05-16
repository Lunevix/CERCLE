import 'dotenv/config';
import { createApp } from './app';
import { db } from './db';
import { startScheduler } from './scheduler';
import logger from './logger';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

async function main() {
  await db.migrate();
  const app = createApp();
  app.listen(PORT, () => logger.info({ port: PORT }, 'CERCLE backend started'));
  startScheduler();
}

main().catch((err) => {
  logger.error(err, 'Fatal startup error');
  process.exit(1);
});
