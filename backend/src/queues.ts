import { Queue, Worker } from 'bullmq';
import { db } from './db';
import { stellarService } from './stellar';
import logger from './logger';

const connection = { host: 'localhost', port: 6379, ...(process.env.REDIS_URL ? parseRedisUrl(process.env.REDIS_URL) : {}) };

export const contributionQueue = new Queue('contributions', { connection });

new Worker('contributions', async (job) => {
  const { circle_id, member_id, address, contract_id, cycle_number, amount } = job.data;
  logger.info({ job: job.id }, 'Processing contribution');

  const txHash = await stellarService.submitContribution(contract_id, address);

  await db.query(
    `INSERT INTO contributions (circle_id, member_id, cycle_number, amount, on_time, tx_hash)
     VALUES ($1,$2,$3,$4,true,$5)
     ON CONFLICT (circle_id, member_id, cycle_number) DO NOTHING`,
    [circle_id, member_id, cycle_number, amount, txHash]
  );

  logger.info({ circle_id, member_id, cycle_number }, 'Contribution recorded');
}, { connection });

function parseRedisUrl(url: string) {
  const u = new URL(url);
  return { host: u.hostname, port: parseInt(u.port || '6379') };
}
