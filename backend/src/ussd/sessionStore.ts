import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
const TTL = 120; // seconds

export const ussdSessionStore = {
  async get(sessionId: string) {
    const raw = await redis.get(`ussd:${sessionId}`);
    return raw ? JSON.parse(raw) : null;
  },
  async set(sessionId: string, data: unknown) {
    await redis.setex(`ussd:${sessionId}`, TTL, JSON.stringify(data));
  },
  async del(sessionId: string) {
    await redis.del(`ussd:${sessionId}`);
  },
};
