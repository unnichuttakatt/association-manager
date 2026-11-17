import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { sql, ensureSchema } from '../../lib/db';
import { requireOwner } from '../../lib/auth';
import { T } from '../../lib/lang';

export const dynamic = 'force-dynamic';

export default async function Users() {
  const me = await requireOwner();
  await ensureSchema();

  async function add(fd) {
    'use server';
    await requireOwner(); await ensureSchema();
    const email = String(fd.get('email') || '').trim().toLowerCase().slice(0, 200);
    const name = String(fd.get('name') || '').trim().slice(0, 100);
    const password = String(fd.get('password') || '');
    const org = String(fd.get('org') || '').trim().slice(0, 120);
    if (!/^\S+@\S+\.\S+$/.test(email) || !name || password.length < 8 || !org) return;
    const known = (await sql`SELECT name FROM orgs WHERE name = ${org}
      UNION SELECT org AS name FROM org_cash WHERE org = ${org}
      UNION SELECT org AS name FROM org_members WHERE org = ${org}`)[0];
    if (!known) return;
    const existing = (await sql`SELECT id, role FROM users WHERE email = ${email}`)[0];
    if (existing?.role === 'owner') return;
    const hash = await bcrypt.hash(password, 10);
    const row = existing
      ? (await sql`UPDATE users SET name = ${name}, password_hash = ${hash}, role = 'admin', login_fails = 0, login_locked = NULL WHERE id = ${existing.id} AND role <> 'owner' RETURNING id`)[0]
      : (await sql`INSERT INTO users (email, name, password_hash, role, sections) VALUES (${email}, ${name}, ${hash}, 'admin', ${[]}) RETURNING id`)[0];
    if (!row) return;
    await sql`DELETE FROM user_orgs WHERE user_id = ${row.id}`;
    await sql`INSERT INTO user_orgs (user_id, org) VALUES (${row.id}, ${known.name})`;
    revalidatePath('/users');
  }
  async function resetMfa(fd) {
    'use server';
    await requireOwner(); await ensureSchema();
    const id = Number(fd.get('id'));
    if (!id) return;
    await sql`UPDATE users SET totp_enabled = false, totp_secret = NULL, totp_last = 0, mfa_fails = 0, mfa_locked = NULL WHERE id = ${id}`;
    revalidatePath('/users');
  }
  async function remove(fd) {
    'use server';
    const u = await requireOwner(); await ensureSchema();
    const id = Number(fd.get('id'));
    if (!id || id === u.id) return;
    const target = (await sql`SELECT role FROM users WHERE id = ${id}`)[0];
    if (!target || target.role === 'owner') return;
    await sql`DELETE FROM user_orgs WHERE user_id = ${id}`;
    await sql`DELETE FROM passkeys WHERE user_id = ${id}`;
    await sql`DELETE FROM users WHERE id = ${id} AND role <> 'owner'`;
    revalidatePath('/users');
  }

  const users = await sql`SELECT u.id, u.email, u.name, u.role, u.totp_enabled,
    (SELECT org FROM user_orgs WHERE user_id = u.id ORDER BY lower(org) LIMIT 1) AS org
    FROM users u ORDER BY u.id`;
  const orgs = (await sql`SELECT name FROM (
      SELECT name FROM orgs
      UNION SELECT org AS name FROM org_cash
      UNION SELECT org AS name FROM org_members
    ) s WHERE name <> '' ORDER BY lower(name)`).map((r) => r.name);
  return (
    <>
      <h1 className="pg-h">{T('Users')}</h1>
      <div className="card">
        <h2>{T('Who can sign in')}</h2>
        <p className="sum">{T('Each person is assigned to one association and can see and change only that association. One association cannot see the members, cash, renewals or ID cards of another. Only the account owner can open every association and add users. Adding an email that already exists resets its password and sets that one association.')}</p>
        <ul className="entries">
          {users.map((u) => (
            <li className="entry" key={u.id}>
              <div className="e-top"><span className="chip">{u.name}</span><b>{u.email}</b>
                <span className={`pst ${u.role === 'owner' || u.org ? 'paid' : 'unpaid'}`}>{u.role === 'owner' ? T('Account owner') : (u.org || T('Not assigned'))}</span>
                <span className={`pst ${u.totp_enabled ? 'paid' : 'unpaid'}`}>{u.totp_enabled ? T('Authenticator on') : T('Authenticator off')}</span></div>
              <div className="pur-act">
                {u.totp_enabled && <form action={resetMfa}><input type="hidden" name="id" value={u.id} /><button className="doc">{T('Reset authenticator')}</button></form>}
                {u.role !== 'owner' && u.id !== me.id && <form action={remove}><input type="hidden" name="id" value={u.id} /><button className="doc danger">{T('Remove user')}</button></form>}
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
          <label className="f"><span>{T('Organisation')}</span>
            <select name="org" required defaultValue="">
              <option value="" disabled>{T('Select organisation')}</option>
              {orgs.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
          <button className="p">{T('Add user')}</button>
        </form>
      </details>
    </>
  );
}
