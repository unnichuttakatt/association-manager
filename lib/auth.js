import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { sql, ensureSchema } from './db';

const key = () => new TextEncoder().encode(process.env.SESSION_SECRET);

export async function createSession(userId) {
  const token = await new SignJWT({ uid: userId }).setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d').sign(key());
  cookies().set('session', token, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 604800 });
}
// Step between password and authenticator code: a 5 minute cookie that is not a login.
export async function createPending(userId) {
  const token = await new SignJWT({ uid: userId, p: 'mfa' }).setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('5m').sign(key());
  cookies().set('mfa_pending', token, { httpOnly: true, secure: true, sameSite: 'lax', path: '/login', maxAge: 300 });
}
export async function readPending() {
  const t = cookies().get('mfa_pending')?.value;
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, key());
    return payload.p === 'mfa' ? Number(payload.uid) : null;
  } catch { return null; }
}
export function clearPending() { cookies().set('mfa_pending', '', { path: '/login', maxAge: 0 }); }
export function destroySession() { cookies().delete('session'); }

export async function currentUser() {
  const t = cookies().get('session')?.value;
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, key());
    await ensureSchema();
    const rows = await sql`SELECT id, email, name, role, totp_enabled FROM users WHERE id = ${payload.uid}`;
    return rows[0] || null;
  } catch { return null; }
}
export async function requireUser() {
  const u = await currentUser();
  if (!u) redirect('/login');
  return u;
}
export async function requireAdmin() {
  const u = await requireUser();
  if (u.role !== 'admin') redirect('/');
  return u;
}
