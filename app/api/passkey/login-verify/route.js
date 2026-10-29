import { NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { sql, ensureSchema } from '../../../../lib/db';
import { createSession } from '../../../../lib/auth';
import { rp, takeChallenge } from '../../../../lib/passkey';

export const dynamic = 'force-dynamic';
export async function POST(req) {
  await ensureSchema();
  const body = await req.json().catch(() => null);
  const ch = await takeChallenge('auth');
  if (!body?.response?.id || !ch) return NextResponse.json({ error: 'expired' }, { status: 400 });
  const pk = (await sql`SELECT id, user_id, cred_id, public_key, counter, transports FROM passkeys WHERE cred_id = ${String(body.response.id)}`)[0];
  if (!pk) return NextResponse.json({ error: 'unknown' }, { status: 401 });
  const { rpID, origin } = rp();
  try {
    const v = await verifyAuthenticationResponse({
      response: body.response, expectedChallenge: ch.challenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true,
      authenticator: { credentialID: isoBase64URL.toBuffer(pk.cred_id), credentialPublicKey: isoBase64URL.toBuffer(pk.public_key), counter: Number(pk.counter), transports: pk.transports ? pk.transports.split(',') : undefined },
    });
    if (!v.verified) return NextResponse.json({ error: 'failed' }, { status: 401 });
    await sql`UPDATE passkeys SET counter = ${v.authenticationInfo.newCounter}, last_used = now() WHERE id = ${pk.id}`;
    await createSession(pk.user_id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 401 });
  }
}
