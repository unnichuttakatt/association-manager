import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { sql, ensureSchema } from '../../lib/db';
import { createSession, createPending } from '../../lib/auth';
import { T } from '../../lib/lang';
import { PasskeyLogin } from '../Passkey';

export default function Login({ searchParams }) {
  async function login(formData) {
    'use server';
    const email = String(formData.get('email') || '').trim().toLowerCase();
    const password = String(formData.get('password') || '');
    await ensureSchema();
    const count = (await sql`SELECT count(*)::int AS c FROM users`)[0].c;
    if (count === 0 && email === (process.env.ADMIN_EMAIL || '').toLowerCase()
        && password === process.env.ADMIN_PASSWORD && password) {
      const hash = await bcrypt.hash(password, 10);
      await sql`INSERT INTO users (email, name, password_hash, role, sections)
                VALUES (${email}, 'Admin', ${hash}, 'admin', ${[]})`;
    }
    const u = (await sql`SELECT id, password_hash, login_locked FROM users WHERE email = ${email}`)[0];
    if (u?.login_locked && new Date(u.login_locked) > new Date()) redirect('/login?error=locked');
    // Always run one password check, so a wrong email takes as long as a wrong password.
    const ok = await bcrypt.compare(password, u ? u.password_hash : '$2a$10$s0BzLkC/CxU.h3ahenPLxe9b9lP/GRm8pT2gjwJuAbIRvP1AqFZZu');
    if (!u || !ok) {
      if (u) {
        const r = (await sql`UPDATE users SET login_fails = login_fails + 1 WHERE id = ${u.id} RETURNING login_fails`)[0];
        if (r.login_fails >= 5) {
          await sql`UPDATE users SET login_fails = 0, login_locked = now() + interval '15 minutes' WHERE id = ${u.id}`;
          redirect('/login?error=locked');
        }
      }
      redirect('/login?error=1');
    }
    await sql`UPDATE users SET login_fails = 0, login_locked = NULL WHERE id = ${u.id}`;
    const m = (await sql`SELECT totp_enabled FROM users WHERE id = ${u.id}`)[0];
    if (m.totp_enabled) { await createPending(u.id); redirect('/login/verify'); }
    await createSession(u.id);
    redirect('/');
  }
  return (
    <div className="card" style={{maxWidth:380,margin:'40px auto'}}>
      <h2>{T('Sign in')}</h2>
      {searchParams?.error === 'locked' && <p className="err">{T('Too many wrong attempts. Try again in 15 minutes.')}</p>}
      {searchParams?.error === '1' && <p className="err">{T('Wrong email or password.')}</p>}
      <form action={login}>
        <input name="email" type="email" placeholder={T('Email')} required style={{width:'100%'}} />
        <input name="password" type="password" placeholder={T('Password')} required style={{width:'100%'}} />
        <button className="p" style={{marginTop:8}}>{T('Sign in')}</button>
      </form>
      <PasskeyLogin label={T('Sign in with Face / fingerprint')} failText={T('Face / fingerprint sign-in did not work. Use your password.')} />
      <p className="sum" style={{ marginTop: 10 }}>{T('First time? Sign in with your password, then add Face / fingerprint from the home screen or Security.')}</p>
    </div>
  );
}
