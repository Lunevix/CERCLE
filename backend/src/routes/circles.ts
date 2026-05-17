import { Router, Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { db } from '../db';
import { stellarService } from '../stellar';
import { requireAuth } from '../middleware/auth';

interface AuthenticatedRequest extends Request {
  user: { address: string };
}

export const circleRouter = Router();

// GET /api/circles
circleRouter.get('/', async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM circles ORDER BY created_at DESC LIMIT 50'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/circles/:id
circleRouter.get('/:id', param('id').isInt(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const { rows } = await db.query('SELECT * FROM circles WHERE id=$1', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// POST /api/circles — create circle (deploys RotationalPool contract)
circleRouter.post(
  '/',
  requireAuth,
  body('name').isString().trim().notEmpty(),
  body('contribution_amount').isInt({ min: 1 }),
  body('cycle_length_days').isInt({ min: 1 }),
  body('max_members').isInt({ min: 2, max: 100 }),
  body('insurance_bps').optional().isInt({ min: 0, max: 1000 }),
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const {
        name, contribution_amount, cycle_length_days,
        max_members, insurance_bps = 200,
      } = req.body;
      const authenticatedReq = req as AuthenticatedRequest;
      const admin = authenticatedReq.user.address;

      // Create circle on-chain via factory
      const contractId = await stellarService.createCircle({
        admin, contribution_amount, cycle_length_days, max_members, insurance_bps,
      });

      const { rows } = await db.query(
        `INSERT INTO circles
           (contract_id, admin_address, name, contribution_amount, cycle_length_days, max_members, insurance_bps)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [contractId, admin, name, contribution_amount, cycle_length_days, max_members, insurance_bps]
      );
      res.status(201).json(rows[0]);
    } catch (err) { next(err); }
  }
);

// GET /api/circles/:id/members
circleRouter.get('/:id/members', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const { rows } = await db.query(
      'SELECT * FROM members WHERE circle_id=$1 ORDER BY join_order',
      [id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/circles/:id/payouts
circleRouter.get('/:id/payouts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const { rows } = await db.query(
      `SELECT p.*, m.address FROM payouts p
       JOIN members m ON m.id=p.member_id
       WHERE p.circle_id=$1 ORDER BY p.cycle_number`,
      [id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});
