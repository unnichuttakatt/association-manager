import { sql, ensureSchema } from './db';
import { allows } from './scope';

export { allows };

// Owner sees every association. Any other signed-in person sees only the associations named in user_orgs.
export async function loadScope(user) {
  await ensureSchema();
  if (user?.role === 'owner') return { all: true, orgs: [] };
  const rows = await sql`SELECT org FROM user_orgs WHERE user_id = ${user.id} ORDER BY lower(org)`;
  return { all: false, orgs: rows.map((r) => r.org) };
}

export async function cashInScope(scope, id) {
  const n = Number(id);
  if (!n) return null;
  const row = (await sql`SELECT id, org FROM org_cash WHERE id = ${n}`)[0];
  if (!row || !allows(scope, row.org)) return null;
  return row;
}

export async function memberInScope(scope, id) {
  const n = Number(id);
  if (!n) return null;
  const row = (await sql`SELECT id, org, name FROM org_members WHERE id = ${n}`)[0];
  if (!row || !allows(scope, row.org)) return null;
  return row;
}
