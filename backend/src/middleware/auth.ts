import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'missing token' });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    (req as any).user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'invalid token' });
  }
}
