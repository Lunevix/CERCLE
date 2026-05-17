import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { db } from '../db';
import { stellarService } from '../stellar';
import { requireAuth } from '../middleware/auth';

interface AuthenticatedRequest extends Request {
  user: { address: string };
}

export const memberRouter = Router();

// POST /api/members/join — join a circle
memberRouter.post(
  '/join',
  requireAuth,
  body('circle_id').isInt({ min: 1 }),
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const { circle_id } = req.body;
      const authenticatedReq = req as AuthenticatedRequest;
      const address = authenticatedReq.user.address;

      const { rows: [circle] } = await db.query(
        'SELECT * FROM circles WHERE id=$1 AND status!=\'closed\'', [circle_id]
      );
      if (!circle) return res.status(404).json({ error: 'circle not found or closed' });

      const { rows: existing } = await db.query(
        'SELECT id FROM members WHERE circle_id=$1 AND address=$2', [circle_id, address]
      );
      if (existing.length) return res.status(409).json({ error: 'already a member' });

      const { rows: [{ count }] } = await db.query<{ count: string }>(
        'SELECT COUNT(*) FROM members WHERE circle_id=$1', [circle_id]
      );
      if (parseInt(count) >= circle.max_members) {
        return res.status(400).json({ error: 'circle full' });
      }

      await stellarService.joinCircle(circle.contract_id, address);

      const { rows } = await db.query(
        `INSERT INTO members (circle_id, address, join_order)
         VALUES ($1,$2,(SELECT COALESCE(MAX(join_order),0)+1 FROM members WHERE circle_id=$1))
         RETURNING *`,
        [circle_id, address]
      );
      res.status(201).json(rows[0]);
    } catch (err) { next(err); }
  }
);

// GET /api/members/:address/reputation
memberRouter.get('/:address/reputation', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const score = await stellarService.getReputation(req.params.address);
    const { rows } = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE on_time) AS on_time_count,
         COUNT(*) AS total_contributions
       FROM contributions c
       JOIN members m ON m.id=c.member_id
       WHERE m.address=$1`,
      [req.params.address]
    );
    res.json({ address: req.params.address, score, ...rows[0] });
  } catch (err) { next(err); }
});
