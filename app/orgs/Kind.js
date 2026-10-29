'use client';
import { useState } from 'react';

import { IN_CATS, OUT_CATS } from './cats';

// Big Cash in / Cash out toggle (easy to tap on a phone) and the categories that belong to it.
export default function Kind({ kind = 'in', category = '', labels, party = '', members = [] }) {
  const [k, setK] = useState(kind);
  const [cat, setCat] = useState(category);
  const [q, setQ] = useState(party);
  const [open, setOpen] = useState(false);
  const isFee = k === 'in' && cat === 'Membership fee';
  const hits = isFee && q.trim().length >= 2 ? members.filter((n) => n.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8) : [];
  const list = k === 'in' ? IN_CATS : OUT_CATS;
  return (
    <>
      <div className="seg2" role="radiogroup" aria-label={labels.kind}>
        {['in', 'out'].map((v) => (
          <label key={v} className={`${v} ${k === v ? 'on' : ''}`}>
            <input type="radio" name="kind" value={v} checked={k === v} onChange={() => setK(v)} />
            <span>{v === 'in' ? '＋' : '−'} {labels[v]}</span>
          </label>
        ))}
      </div>
      <label className="f"><span>{labels.category}</span>
        <select name="category" key={k} defaultValue={list.includes(category) ? category : list[list.length - 1]} onChange={(e) => setCat(e.target.value)} ref={(el) => { if (el && el.value !== cat) setTimeout(() => setCat(el.value), 0); }}>
          {list.map((c) => <option key={c} value={c}>{labels[c] || c}</option>)}</select></label>
      <label className="f party-f"><span>{isFee ? labels.member : labels.party}</span>
        <input name="party" value={q} maxLength={120} autoComplete="off" placeholder={isFee ? labels.typeName : ''}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} />
        {open && hits.length > 0 && !(hits.length === 1 && hits[0] === q) && (
          <ul className="sugg" role="listbox">{hits.map((n) => <li key={n}><button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setQ(n); setOpen(false); }}>{n}</button></li>)}</ul>
        )}
      </label>
    </>
  );
}
