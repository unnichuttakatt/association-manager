import { redirect } from 'next/navigation';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';
import { sql, ensureSchema } from '../../lib/db';
import { requireUser } from '../../lib/auth';
import { T, getLang } from '../../lib/lang';
import { InstallCard } from '../PwaBits';
import { PasskeyAdd } from '../Passkey';
import { newSecret, verifyTotp, otpauthUrl, seal, unseal } from '../../lib/totp';

export default async function Account({ searchParams }) {
  const me = await requireUser();
  await ensureSchema();

  async function start() {
    'use server';
    const u = await requireUser();
    if (u.totp_enabled) return;
    await sql`UPDATE users SET totp_secret = ${seal(newSecret())}, totp_enabled = false, totp_last = 0 WHERE id = ${u.id}`;
    redirect('/account');
  }
  async function confirm(formData) {
    'use server';
    const u = await requireUser();
    const r = (await sql`SELECT totp_secret, totp_enabled FROM users WHERE id = ${u.id}`)[0];
    if (!r.totp_secret || r.totp_enabled) redirect('/account');
    const step = verifyTotp(unseal(r.totp_secret), formData.get('code'), 0);
    if (step === null) redirect('/account?msg=bad');
    await sql`UPDATE users SET totp_enabled = true, totp_last = ${step}, mfa_fails = 0 WHERE id = ${u.id}`;
    redirect('/account?msg=on');
  }
  async function disable(formData) {
    'use server';
    const u = await requireUser();
    const r = (await sql`SELECT password_hash, totp_secret, totp_last FROM users WHERE id = ${u.id}`)[0];
    const okPw = await bcrypt.compare(String(formData.get('password') || ''), r.password_hash);
    const step = r.totp_secret ? verifyTotp(unseal(r.totp_secret), formData.get('code'), r.totp_last) : null;
    if (!okPw || step === null) redirect('/account?msg=nodisable');
    await sql`UPDATE users SET totp_enabled = false, totp_secret = NULL, totp_last = 0 WHERE id = ${u.id}`;
    redirect('/account?msg=off');
  }

  async function changePw(formData) {
    'use server';
    const u = await requireUser();
    const r = (await sql`SELECT password_hash FROM users WHERE id = ${u.id}`)[0];
    const cur = String(formData.get('current') || ''), n1 = String(formData.get('next') || ''), n2 = String(formData.get('again') || '');
    if (!(await bcrypt.compare(cur, r.password_hash))) redirect('/account?msg=pwwrong');
    if (n1.length < 8 || n1.length > 200) redirect('/account?msg=pwshort');
    if (n1 !== n2) redirect('/account?msg=pwmatch');
    await sql`UPDATE users SET password_hash = ${await bcrypt.hash(n1, 10)} WHERE id = ${u.id}`;
    redirect('/account?msg=pwok');
  }
  async function delKey(formData) {
    'use server';
    const u = await requireUser();
    await sql`DELETE FROM passkeys WHERE id = ${Number(formData.get('id'))} AND user_id = ${u.id}`;
    redirect('/account');
  }
  const keys = await sql`SELECT id, name, to_char(created_at, 'YYYY-MM-DD') AS d FROM passkeys WHERE user_id = ${me.id} ORDER BY id`;
  const r = (await sql`SELECT totp_secret, totp_enabled FROM users WHERE id = ${me.id}`)[0];
  const msg = searchParams?.msg;
  let qr = null, secret = null;
  if (r.totp_secret && !r.totp_enabled) {
    secret = unseal(r.totp_secret);
    qr = await QRCode.toDataURL(otpauthUrl(me.email, secret), { margin: 1, width: 220 });
  }
  return (
    <>
    <div className="card" style={{maxWidth:480}}>
      <h2>{T('Change password')}</h2>
      {msg === 'pwok' && <p className="sum">{T('Password changed.')}</p>}
      {msg === 'pwwrong' && <p className="err">{T('Current password is wrong.')}</p>}
      {msg === 'pwshort' && <p className="err">{T('New password must be at least 8 characters.')}</p>}
      {msg === 'pwmatch' && <p className="err">{T('The two new passwords do not match.')}</p>}
      <form action={changePw}>
        <input name="current" type="password" autoComplete="current-password" placeholder={T('Current password')} required style={{width:'100%'}} />
        <input name="next" type="password" autoComplete="new-password" minLength={8} placeholder={T('New password (8+ characters)')} required style={{width:'100%'}} />
        <input name="again" type="password" autoComplete="new-password" minLength={8} placeholder={T('Repeat new password')} required style={{width:'100%'}} />
        <button className="p" style={{marginTop:8}}>{T('Change password')}</button>
      </form>
    </div>
    <div className="card" style={{maxWidth:480}}>
      <h2>{T('Sign-in security')}</h2>
      {msg === 'on' && <p className="sum">{T('Authenticator is on. You will need a code each time you sign in.')}</p>}
      {msg === 'off' && <p className="sum">{T('Authenticator is off.')}</p>}
      {msg === 'bad' && <p className="err">{T('That code is not right. Try the current code.')}</p>}
      {msg === 'nodisable' && <p className="err">{T('Password or code was wrong, so the authenticator stays on.')}</p>}

      {r.totp_enabled ? (
        <>
          <p className="sum">Google Authenticator is on for {me.email}.</p>
          <form action={disable}>
            <p className="sum">To turn it off, enter your password and a current code.</p>
            <input name="password" type="password" placeholder={T('Password')} required style={{width:'100%'}} />
            <input name="code" inputMode="numeric" placeholder="6-digit code" required style={{width:'100%'}} />
            <button className="d" style={{marginTop:8}}>{T('Turn off authenticator')}</button>
          </form>
        </>
      ) : qr ? (
        <>
          <p className="sum">1. In Google Authenticator tap + then Scan a QR code, and scan this.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR code for Google Authenticator" width={220} height={220} />
          <p className="sum">Can't scan? Choose Enter a setup key and type: <b style={{wordBreak:'break-all'}}>{secret}</b></p>
          <form action={confirm}>
            <p className="sum">2. Enter the 6-digit code the app shows to finish.</p>
            <input name="code" inputMode="numeric" autoComplete="one-time-code" placeholder="123456" required style={{width:'100%'}} />
            <button className="p" style={{marginTop:8}}>{T('Turn on authenticator')}</button>
          </form>
        </>
      ) : (
        <>
          <p className="sum">{T('Add a second step to sign-in using the Google Authenticator app on your phone.')}</p>
          <form action={start}><button className="p">{T('Set up authenticator')}</button></form>
        </>
      )}
    </div>
    <div className="card" style={{maxWidth:480}}>
      <h2>{T('Face / fingerprint sign-in')}</h2>
      <p className="sum">{T('Sign in with Face ID or fingerprint on this phone or laptop instead of typing your password. It is tied to this website address and this device.')}</p>
      {keys.length > 0 && (
        <ul className="pk-l">{keys.map((k) => (
          <li key={k.id}><span>🔐 <b>{k.name || T('This device')}</b> <small>{k.d}</small></span>
            <form action={delKey}><input type="hidden" name="id" value={k.id} /><button className="d">{T('Remove')}</button></form></li>
        ))}</ul>
      )}
      <PasskeyAdd label={T('Add Face / fingerprint on this device')} nameLabel={T('Name for this device (e.g. My iPhone)')} doneText={T('Added.')} failText={T('Could not add it. Your device may not support it, or it was cancelled.')} />
    </div>
    <InstallCard lang={getLang()} />
    </>
  );
}
