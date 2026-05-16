import { Request, Response, NextFunction } from 'express';
import logger from '../logger';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  logger.error(err);
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
}
