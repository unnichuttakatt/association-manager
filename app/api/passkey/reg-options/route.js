import { NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { sql, ensureSchema } from '../../../../lib/db';
import { currentUser } from '../../../../lib/auth';
import { rp, saveChallenge, RP_NAME } from '../../../../lib/passkey';

export const dynamic = 'force-dynamic';
export async function POST() {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: 'login' }, { status: 401 });
  await ensureSchema();
  const have = await sql`SELECT cred_id, transports FROM passkeys WHERE user_id = ${u.id}`;
  const { rpID } = rp();
  const opts = await generateRegistrationOptions({
    rpName: RP_NAME, rpID, userID: new TextEncoder().encode(String(u.id)), userName: u.email, userDisplayName: u.name,
    attestationType: 'none', timeout: 120000,
    excludeCredentials: have.map((c) => ({ id: c.cred_id, transports: c.transports ? c.transports.split(',') : undefined })),
    authenticatorSelection: { residentKey: 'required', userVerification: 'required', authenticatorAttachment: 'platform' },
  });
  await saveChallenge(opts.challenge, 'reg', u.id);
  return NextResponse.json(opts);
}
