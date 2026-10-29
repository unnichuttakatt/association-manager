import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { rp, saveChallenge } from '../../../../lib/passkey';

export const dynamic = 'force-dynamic';
export async function POST() {
  const { rpID } = rp();
  const opts = await generateAuthenticationOptions({ rpID, userVerification: 'required', timeout: 120000 });
  await saveChallenge(opts.challenge, 'auth', 0);
  return NextResponse.json(opts);
}
