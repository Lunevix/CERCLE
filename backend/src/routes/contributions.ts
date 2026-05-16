import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { db } from '../db';
import { stellarService } from '../stellar';
import { requireAuth } from '../middleware/auth';
import { contributionQueue } from '../queues';

export const contributionRouter = Router();

// POST /api/contributions — submit contribution
contributionRouter.post(
  '/',
  requireAuth,
  body('circle_id').isInt({ min: 1 }),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const { circle_id } = req.body;
      const address = (req as any).user.address;

      const { rows: [circle] } = await db.query(
        'SELECT * FROM circles WHERE id=$1 AND status=\'active\'', [circle_id]
      );
      if (!circle) return res.status(404).json({ error: 'circle not active' });

      const { rows: [member] } = await db.query(
        'SELECT * FROM members WHERE circle_id=$1 AND address=$2', [circle_id, address]
      );
      if (!member) return res.status(403).json({ error: 'not a member' });

      // Check not already contributed this cycle
      const { rows: existing } = await db.query(
        'SELECT id FROM contributions WHERE circle_id=$1 AND member_id=$2 AND cycle_number=$3',
        [circle_id, member.id, circle.current_cycle]
      );
      if (existing.length) return res.status(409).json({ error: 'already contributed this cycle' });

      // Enqueue on-chain contribution (async)
      const job = await contributionQueue.add('contribute', {
        circle_id, member_id: member.id, address,
        contract_id: circle.contract_id,
        cycle_number: circle.current_cycle,
        amount: circle.contribution_amount,
      });

      res.status(202).json({ job_id: job.id, status: 'queued' });
    } catch (err) { next(err); }
  }
);

// GET /api/contributions/:circle_id/cycle/:cycle
contributionRouter.get('/:circle_id/cycle/:cycle', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT c.*, m.address FROM contributions c
       JOIN members m ON m.id=c.member_id
       WHERE c.circle_id=$1 AND c.cycle_number=$2`,
      [req.params.circle_id, req.params.cycle]
    );
    res.json(rows);
  } catch (err) { next(err); }
});
