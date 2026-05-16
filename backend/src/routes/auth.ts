import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { Keypair } from '@stellar/stellar-sdk';

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret';

// POST /api/auth/challenge — get a nonce to sign
const challenges = new Map<string, { nonce: string; expires: number }>();

authRouter.post(
  '/challenge',
  body('address').isString().notEmpty(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { address } = req.body;
    const nonce = `cercle-auth:${address}:${Date.now()}`;
    challenges.set(address, { nonce, expires: Date.now() + 60_000 });
    res.json({ nonce });
  }
);

// POST /api/auth/verify — verify signed nonce, return JWT
authRouter.post(
  '/verify',
  body('address').isString().notEmpty(),
  body('signature').isString().notEmpty(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { address, signature } = req.body;
    const challenge = challenges.get(address);
    if (!challenge || Date.now() > challenge.expires) {
      return res.status(401).json({ error: 'challenge expired or not found' });
    }

    try {
      const kp = Keypair.fromPublicKey(address);
      const valid = kp.verify(
        Buffer.from(challenge.nonce),
        Buffer.from(signature, 'base64')
      );
      if (!valid) return res.status(401).json({ error: 'invalid signature' });

      challenges.delete(address);
      const token = jwt.sign({ address }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token });
    } catch {
      res.status(401).json({ error: 'verification failed' });
    }
  }
);
