import { Pool } from 'pg';
import logger from './logger';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const SCHEMA = `
CREATE TABLE IF NOT EXISTS circles (
  id            BIGSERIAL PRIMARY KEY,
  contract_id   TEXT UNIQUE,
  admin_address TEXT NOT NULL,
  name          TEXT NOT NULL,
  contribution_amount BIGINT NOT NULL,
  cycle_length_days   INT NOT NULL,
  max_members         INT NOT NULL,
  insurance_bps       INT NOT NULL DEFAULT 200,
  status        TEXT NOT NULL DEFAULT 'pending',
  current_cycle INT NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS members (
  id            BIGSERIAL PRIMARY KEY,
  circle_id     BIGINT NOT NULL REFERENCES circles(id),
  address       TEXT NOT NULL,
  phone         TEXT,
  join_order    INT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active',
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(circle_id, address)
);

CREATE TABLE IF NOT EXISTS contributions (
  id            BIGSERIAL PRIMARY KEY,
  circle_id     BIGINT NOT NULL REFERENCES circles(id),
  member_id     BIGINT NOT NULL REFERENCES members(id),
  cycle_number  INT NOT NULL,
  amount        BIGINT NOT NULL,
  on_time       BOOLEAN NOT NULL DEFAULT TRUE,
  tx_hash       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(circle_id, member_id, cycle_number)
);

CREATE TABLE IF NOT EXISTS payouts (
  id            BIGSERIAL PRIMARY KEY,
  circle_id     BIGINT NOT NULL REFERENCES circles(id),
  member_id     BIGINT NOT NULL REFERENCES members(id),
  cycle_number  INT NOT NULL,
  amount        BIGINT NOT NULL,
  tx_hash       TEXT,
  executed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS defaults (
  id            BIGSERIAL PRIMARY KEY,
  circle_id     BIGINT NOT NULL REFERENCES circles(id),
  member_id     BIGINT NOT NULL REFERENCES members(id),
  cycle_number  INT NOT NULL,
  insurance_paid BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contributions_circle_cycle ON contributions(circle_id, cycle_number);
CREATE INDEX IF NOT EXISTS idx_members_circle ON members(circle_id);
`;

export const db = {
  query: pool.query.bind(pool),

  async migrate() {
    logger.info('Running DB migrations...');
    await pool.query(SCHEMA);
    logger.info('DB migrations complete');
  },
};
