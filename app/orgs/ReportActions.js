'use client';
import { useState } from 'react';

export default function ReportActions({ text, labels }) {
  const [ok, setOk] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 2000); } catch {}
  };
  return (
    <div className="pur-filter noprint">
      <button type="button" className="p" onClick={() => window.print()}>🖨 {labels.print}</button>
      <button type="button" className="doc" onClick={copy}>{ok ? `✔ ${labels.copied}` : `📋 ${labels.copy}`}</button>
    </div>
  );
}
