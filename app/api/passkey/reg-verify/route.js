import { NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { sql, ensureSchema } from '../../../../lib/db';
import { currentUser } from '../../../../lib/auth';
import { rp, takeChallenge } from '../../../../lib/passkey';

export const dynamic = 'force-dynamic';
export async function POST(req) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: 'login' }, { status: 401 });
  await ensureSchema();
  const body = await req.json().catch(() => null);
  const ch = await takeChallenge('reg');
  if (!body || !ch || ch.uid !== u.id) return NextResponse.json({ error: 'expired' }, { status: 400 });
  const { rpID, origin } = rp();
  try {
    const v = await verifyRegistrationResponse({ response: body.response, expectedChallenge: ch.challenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true });
    if (!v.verified || !v.registrationInfo) return NextResponse.json({ error: 'failed' }, { status: 400 });
    const { credentialID, credentialPublicKey, counter } = v.registrationInfo;
    const name = String(body.name || 'This device').trim().slice(0, 40) || 'This device';
    await sql`INSERT INTO passkeys (user_id, cred_id, public_key, counter, transports, name)
              VALUES (${u.id}, ${credentialID}, ${isoBase64URL.fromBuffer(credentialPublicKey)}, ${counter},
                      ${(body.response?.response?.transports || []).join(',')}, ${name})`;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 400 });
  }
}
