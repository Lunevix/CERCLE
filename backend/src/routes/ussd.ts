import { Router } from 'express';
import { db } from '../db';
import { ussdSessionStore } from '../ussd/sessionStore';

export const ussdRouter = Router();

/**
 * Africa's Talking USSD callback.
 * POST /ussd  (application/x-www-form-urlencoded)
 */
ussdRouter.post('/', async (req, res) => {
  const { sessionId, serviceCode, phoneNumber, text } = req.body as Record<string, string>;
  const parts = (text ?? '').split('*').filter(Boolean);
  const session = await ussdSessionStore.get(sessionId) ?? { step: 'MAIN', data: {} };

  let response = '';

  try {
    response = await handleUssd(session, parts, phoneNumber, sessionId);
  } catch {
    response = 'END An error occurred. Please try again.';
    await ussdSessionStore.del(sessionId);
  }

  res.set('Content-Type', 'text/plain');
  res.send(response);
});

async function handleUssd(
  session: { step: string; data: Record<string, unknown> },
  parts: string[],
  phone: string,
  sessionId: string,
): Promise<string> {
  const input = parts[parts.length - 1] ?? '';

  if (session.step === 'MAIN' || parts.length === 0) {
    await ussdSessionStore.set(sessionId, { step: 'MAIN', data: {} });
    return `CON Welcome to CERCLE
1. View my circles
2. Check balance
3. Contribute
4. Check reputation
0. Exit`;
  }

  if (parts[0] === '1') {
    const { rows } = await db.query(
      `SELECT c.id, c.name, c.current_cycle FROM circles c
       JOIN members m ON m.circle_id=c.id
       WHERE m.phone=$1 LIMIT 5`,
      [phone]
    );
    if (!rows.length) return 'END You are not in any circles yet.';
    const list = rows.map((r: any) => `${r.id}. ${r.name} (Cycle ${r.current_cycle})`).join('\n');
    return `END Your circles:\n${list}`;
  }

  if (parts[0] === '4') {
    const { rows } = await db.query(
      `SELECT COUNT(*) FILTER (WHERE on_time) AS on_time,
              COUNT(*) AS total
       FROM contributions c JOIN members m ON m.id=c.member_id
       WHERE m.phone=$1`,
      [phone]
    );
    const r = rows[0];
    return `END Your reputation:\nOn-time: ${r.on_time}/${r.total} contributions`;
  }

  if (parts[0] === '0') return 'END Goodbye!';

  return 'END Invalid option.';
}
