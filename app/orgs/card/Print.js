'use client';
export default function Print({ label, hint }) {
  return (
    <div className="noprint card" style={{ maxWidth: 560 }}>
      <button type="button" className="p" onClick={() => window.print()}>🖨 {label}</button>
      <p className="sum">{hint}</p>
    </div>
  );
}
