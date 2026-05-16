import cron from 'node-cron';
import { db } from './db';
import { stellarService } from './stellar';
import logger from './logger';

export function startScheduler() {
  // Every hour: detect defaults (members who missed contribution deadline)
  cron.schedule('0 * * * *', detectDefaults);

  // Every 5 minutes: sync on-chain events to DB
  cron.schedule('*/5 * * * *', syncChainEvents);

  logger.info('Scheduler started');
}

async function detectDefaults() {
  logger.info('Running default detection');
  try {
    // Find active circles past their cycle deadline with missing contributions
    const { rows: circles } = await db.query(`
      SELECT c.* FROM circles c
      WHERE c.status = 'active'
        AND NOW() > c.created_at + (c.current_cycle * c.cycle_length_days || ' days')::interval
    `);

    for (const circle of circles) {
      const { rows: members } = await db.query(
        'SELECT * FROM members WHERE circle_id=$1 AND status=\'active\'', [circle.id]
      );
      for (const member of members) {
        const { rows } = await db.query(
          'SELECT id FROM contributions WHERE circle_id=$1 AND member_id=$2 AND cycle_number=$3',
          [circle.id, member.id, circle.current_cycle]
        );
        if (!rows.length) {
          logger.warn({ circle_id: circle.id, member_id: member.id }, 'Default detected');
          await db.query(
            `INSERT INTO defaults (circle_id, member_id, cycle_number)
             VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
            [circle.id, member.id, circle.current_cycle]
          );
          // Notify on-chain
          if (circle.contract_id) {
            await stellarService.submitContribution(circle.contract_id, member.address)
              .catch(err => logger.error(err, 'Failed to mark default on-chain'));
          }
        }
      }
    }
  } catch (err) {
    logger.error(err, 'Default detection failed');
  }
}

async function syncChainEvents() {
  // Placeholder: in production, poll Horizon event stream for contract events
  // and reconcile with DB state
  logger.debug('Chain sync tick');
}
