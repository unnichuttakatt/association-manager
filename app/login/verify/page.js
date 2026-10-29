import { redirect } from 'next/navigation';
import { sql, ensureSchema } from '../../../lib/db';
import { createSession, readPending, clearPending } from '../../../lib/auth';
import { verifyTotp, unseal } from '../../../lib/totp';
import { T } from '../../../lib/lang';

export default async function Verify({ searchParams }) {
  const uid = await readPending();
  if (!uid) redirect('/login');

  async function verify(formData) {
    'use server';
    const id = await readPending();
    if (!id) redirect('/login');
    await ensureSchema();
    const u = (await sql`SELECT id, totp_secret, totp_enabled, totp_last, mfa_locked FROM users WHERE id = ${id}`)[0];
    if (!u || !u.totp_enabled) redirect('/login');
    if (u.mfa_locked && new Date(u.mfa_locked) > new Date()) redirect('/login/verify?error=locked');
    const step = verifyTotp(unseal(u.totp_secret), formData.get('code'), u.totp_last);
    if (step === null) {
      const r = (await sql`UPDATE users SET mfa_fails = mfa_fails + 1 WHERE id = ${id} RETURNING mfa_fails`)[0];
      if (r.mfa_fails >= 5) {
        await sql`UPDATE users SET mfa_fails = 0, mfa_locked = now() + interval '10 minutes' WHERE id = ${id}`;
        redirect('/login/verify?error=locked');
      }
      redirect('/login/verify?error=1');
    }
    await sql`UPDATE users SET totp_last = ${step}, mfa_fails = 0, mfa_locked = NULL WHERE id = ${id}`;
    clearPending();
    await createSession(id);
    redirect('/');
  }

  return (
    <div className="card" style={{maxWidth:380,margin:'40px auto'}}>
      <h2>{T('Enter your code')}</h2>
      <p className="sum">{T('Open Google Authenticator and type the 6-digit code for Association Manager.')}</p>
      {searchParams?.error === 'locked' && <p className="err">{T('Too many wrong codes. Try again in 10 minutes.')}</p>}
      {searchParams?.error === '1' && <p className="err">{T('That code is not right. Wait for a fresh code and try again.')}</p>}
      <form action={verify}>
        <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7}
          placeholder="123456" required autoFocus style={{width:'100%',fontSize:22,letterSpacing:4}} />
        <button className="p" style={{marginTop:8}}>{T('Verify and sign in')}</button>
      </form>
      <p className="sum" style={{marginTop:12}}>{T('Lost your phone? Ask the admin to reset your authenticator.')}</p>
    </div>
  );
}
