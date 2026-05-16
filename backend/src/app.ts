import express from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import logger from './logger';
import { circleRouter } from './routes/circles';
import { memberRouter } from './routes/members';
import { contributionRouter } from './routes/contributions';
import { ussdRouter } from './routes/ussd';
import { authRouter } from './routes/auth';
import { errorHandler } from './middleware/errorHandler';

export function createApp() {
  const app = express();

  app.use(pinoHttp({ logger }));
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true })); // USSD posts form data

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api/auth', authRouter);
  app.use('/api/circles', circleRouter);
  app.use('/api/members', memberRouter);
  app.use('/api/contributions', contributionRouter);
  app.use('/ussd', ussdRouter);

  app.use(errorHandler);
  return app;
}
