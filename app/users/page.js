import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { sql, ensureSchema } from '../../lib/db';
import { requireAdmin } from '../../lib/auth';
import { T } from '../../lib/lang';

export const dynamic = 'force-dynamic';

export default async function Users() {
  const me = await requireAdmin();
  await ensureSchema();

  async function add(fd) {
    'use server';
    await requireAdmin(); await ensureSchema();
    const email = String(fd.get('email') || '').trim().toLowerCase().slice(0, 200);
    const name = String(fd.get('name') || '').trim().slice(0, 100);
    const password = String(fd.get('password') || '');
    if (!/^\S+@\S+\.\S+$/.test(email) || !name || password.length < 8) return;
    const hash = await bcrypt.hash(password, 10);
    await sql`INSERT INTO users (email, name, password_hash, role, sections) VALUES (${email}, ${name}, ${hash}, 'admin', ${[]})
              ON CONFLICT (email) DO UPDATE SET name = ${name}, password_hash = ${hash}, login_fails = 0, login_locked = NULL`;
    revalidatePath('/users');
  }
  async function resetMfa(fd) {
    'use server';
    await requireAdmin(); await ensureSchema();
    await sql`UPDATE users SET totp_enabled = false, totp_secret = NULL, totp_last = 0, mfa_fails = 0, mfa_locked = NULL WHERE id = ${Number(fd.get('id'))}`;
    revalidatePath('/users');
  }
  async function remove(fd) {
    'use server';
    const u = await requireAdmin(); await ensureSchema();
    const id = Number(fd.get('id'));
    if (!id || id === u.id) return;
    await sql`DELETE FROM passkeys WHERE user_id = ${id}`;
    await sql`DELETE FROM users WHERE id = ${id}`;
    revalidatePath('/users');
  }

  const users = await sql`SELECT id, email, name, totp_enabled FROM users ORDER BY id`;
  return (
    <>
      <h1 className="pg-h">{T('Users')}</h1>
      <div className="card">
        <h2>{T('Who can sign in')}</h2>
        <p className="sum">{T('Everyone listed here can see and change all organisation records. Add only the office bearers you trust. Adding an email that already exists resets its password.')}</p>
        <ul className="entries">
          {users.map((u) => (
            <li className="entry" key={u.id}>
              <div className="e-top"><span className="chip">{u.name}</span><b>{u.email}</b>
                <span className={`pst ${u.totp_enabled ? 'paid' : 'unpaid'}`}>{u.totp_enabled ? T('Authenticator on') : T('Authenticator off')}</span></div>
              <div className="pur-act">
                {u.totp_enabled && <form action={resetMfa}><input type="hidden" name="id" value={u.id} /><button className="doc">{T('Reset authenticator')}</button></form>}
                {u.id !== me.id && <form action={remove}><input type="hidden" name="id" value={u.id} /><button className="doc danger">{T('Remove user')}</button></form>}
              </div>
            </li>
          ))}
        </ul>
      </div>
      <details className="card fold" open>
        <summary className="card-sum"><h2>{T('Add user')}</h2><span className="chev" aria-hidden="true" /></summary>
        <form action={add} className="row" style={{ marginTop: 10 }}>
          <label className="f"><span>{T('Name')}</span><input name="name" required maxLength={100} /></label>
          <label className="f"><span>{T('Email')}</span><input name="email" type="email" required maxLength={200} /></label>
          <label className="f"><span>{T('Password (8+ characters)')}</span><input name="password" type="password" minLength={8} required autoComplete="new-password" /></label>
          <button className="p">{T('Add user')}</button>
        </form>
      </details>
    </>
  );
}
