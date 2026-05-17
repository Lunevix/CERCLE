import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

// Mock DB and stellar service
vi.mock('../db', () => ({
  db: {
    query: vi.fn(),
    migrate: vi.fn(),
  },
}));
vi.mock('../stellar', () => ({
  stellarService: {
    createCircle: vi.fn().mockResolvedValue('CTEST123'),
    joinCircle: vi.fn().mockResolvedValue(undefined),
    getReputation: vi.fn().mockResolvedValue(500),
  },
}));
vi.mock('../queues', () => ({
  contributionQueue: {
    add: vi.fn().mockResolvedValue({ id: 'job-1' }),
  },
}));

const app = createApp();

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('POST /api/auth/challenge', () => {
  it('returns a nonce for valid address', async () => {
    const res = await request(app)
      .post('/api/auth/challenge')
      .send({ address: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN' });
    expect(res.status).toBe(200);
    expect(res.body.nonce).toContain('cercle-auth:');
  });

  it('rejects missing address', async () => {
    const res = await request(app).post('/api/auth/challenge').send({});
    expect(res.status).toBe(400);
  });
});
