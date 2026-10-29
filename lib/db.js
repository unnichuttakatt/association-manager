import { neon } from '@neondatabase/serverless';
let ready;
export function sql(...args) {
  return neon(process.env.DATABASE_URL)(...args);
}
export async function ensureSchema() {
  if (!ready) {
    ready = (async () => {
      const q = neon(process.env.DATABASE_URL);
      await q`CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
        password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'viewer',
        sections TEXT[] NOT NULL DEFAULT '{}')`;
      await q`CREATE TABLE IF NOT EXISTS passkeys (
        id SERIAL PRIMARY KEY, user_id INT NOT NULL, cred_id TEXT NOT NULL UNIQUE, public_key TEXT NOT NULL,
        counter BIGINT NOT NULL DEFAULT 0, transports TEXT NOT NULL DEFAULT '', name TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT now(), last_used TIMESTAMPTZ)`;
      await q`CREATE TABLE IF NOT EXISTS orgs (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, created_at TIMESTAMPTZ DEFAULT now())`;
      await q`CREATE TABLE IF NOT EXISTS org_cash (
        id SERIAL PRIMARY KEY, tx_date DATE NOT NULL DEFAULT CURRENT_DATE, org TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'in',
        category TEXT NOT NULL DEFAULT '', amount NUMERIC(14,2) NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'AED',
        party TEXT NOT NULL DEFAULT '', ref TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ DEFAULT now())`;
      await q`CREATE TABLE IF NOT EXISTS org_members (
        id SERIAL PRIMARY KEY, org TEXT NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '', member_no TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '', place TEXT NOT NULL DEFAULT '', joined DATE, status TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT now())`;
      await q`ALTER TABLE orgs ADD COLUMN IF NOT EXISTS fee NUMERIC(14,2) NOT NULL DEFAULT 50`;
      await q`CREATE TABLE IF NOT EXISTS org_renewals (
        id SERIAL PRIMARY KEY, member_id INT NOT NULL, org TEXT NOT NULL, year INT NOT NULL, amount NUMERIC(14,2) NOT NULL DEFAULT 0,
        paid_on DATE NOT NULL DEFAULT CURRENT_DATE, cash_id INT, created_at TIMESTAMPTZ DEFAULT now(), UNIQUE (member_id, year))`;
      await q`ALTER TABLE users ADD COLUMN IF NOT EXISTS relation TEXT NOT NULL DEFAULT ''`;
      await q`ALTER TABLE users ADD COLUMN IF NOT EXISTS login_fails INT NOT NULL DEFAULT 0`;
      await q`ALTER TABLE users ADD COLUMN IF NOT EXISTS login_locked TIMESTAMPTZ`;
      await q`ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret TEXT`;
      await q`ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT false`;
      await q`ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_last BIGINT NOT NULL DEFAULT 0`;
      await q`ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_fails INT NOT NULL DEFAULT 0`;
      await q`ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_locked TIMESTAMPTZ`;
    })();
  }
  await ready;
}
