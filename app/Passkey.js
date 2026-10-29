'use client';
import { useEffect, useState } from 'react';
import { startRegistration, startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';

async function post(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'failed');
  return j;
}

export function PasskeyLogin({ label, failText }) {
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setOk(browserSupportsWebAuthn()); }, []);
  if (!ok) return null;
  const go = async () => {
    setErr(''); setBusy(true);
    try {
      const opts = await post('/api/passkey/login-options');
      const response = await startAuthentication(opts);
      await post('/api/passkey/login-verify', { response });
      window.location.href = '/';
    } catch { setErr(failText); setBusy(false); }
  };
  return (
    <div style={{ marginTop: 14 }}>
      <button type="button" className="p pk" onClick={go} disabled={busy}>🔐 {label}</button>
      {err && <p className="err">{err}</p>}
    </div>
  );
}

export function PasskeyAdd({ label, nameLabel, doneText, failText }) {
  const [ok, setOk] = useState(false);
  const [msg, setMsg] = useState('');
  const [name, setName] = useState('');
  useEffect(() => { setOk(browserSupportsWebAuthn()); }, []);
  if (!ok) return null;
  const go = async () => {
    setMsg('');
    try {
      const opts = await post('/api/passkey/reg-options');
      const response = await startRegistration(opts);
      await post('/api/passkey/reg-verify', { response, name });
      setMsg(doneText);
      setTimeout(() => window.location.reload(), 800);
    } catch { setMsg(failText); }
  };
  return (
    <div>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder={nameLabel} maxLength={40} style={{ width: '100%' }} />
      <button type="button" className="p pk" onClick={go} style={{ marginTop: 8 }}>🔐 {label}</button>
      {msg && <p className="sum">{msg}</p>}
    </div>
  );
}
