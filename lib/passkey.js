import { SignJWT, jwtVerify } from 'jose';
import { cookies, headers } from 'next/headers';

const key = () => new TextEncoder().encode(process.env.SESSION_SECRET);
export const RP_NAME = 'Association Manager';

// The passkey belongs to the site address it was made on (the browser enforces this).
export function rp() {
  const h = headers();
  const host = (h.get('x-forwarded-host') || h.get('host') || '').split(',')[0].trim();
  return { rpID: host.split(':')[0], origin: `https://${host}` };
}
export async function saveChallenge(challenge, kind, uid) {
  const token = await new SignJWT({ ch: challenge, k: kind, uid: uid || 0 }).setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('5m').sign(key());
  cookies().set('pk_ch', token, { httpOnly: true, secure: true, sameSite: 'strict', path: '/api/passkey', maxAge: 300 });
}
export async function takeChallenge(kind) {
  const t = cookies().get('pk_ch')?.value;
  cookies().set('pk_ch', '', { path: '/api/passkey', maxAge: 0 });
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, key());
    return payload.k === kind ? { challenge: payload.ch, uid: Number(payload.uid) } : null;
  } catch { return null; }
}
