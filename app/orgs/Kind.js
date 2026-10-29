'use client';
import { useState } from 'react';

import { IN_CATS, OUT_CATS } from './cats';

// Big Cash in / Cash out toggle (easy to tap on a phone) and the categories that belong to it.
export default function Kind({ kind = 'in', category = '', labels, party = '', members = [], fee = 0, years = [] }) {
  const [k, setK] = useState(kind);
  const [cat, setCat] = useState(category);
  const [q, setQ] = useState(party);
  const [open, setOpen] = useState(false);
  const isFee = k === 'in' && cat === 'Membership fee';
  const [picked, setPicked] = useState(null);
  const [ticks, setTicks] = useState([]);
  const nm = (x) => (typeof x === 'string' ? x : x.name);
  const hits = isFee && q.trim().length >= 2 ? members.filter((x) => nm(x).toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8) : [];
  const m = isFee ? (members.find((x) => typeof x !== 'string' && x.name.toLowerCase() === q.trim().toLowerCase()) || null) : null;
  const dues = m ? years.filter((y) => !(m.paid || []).includes(y)) : [];
  const setAmt = (el, n) => { const f = el?.form; if (f && f.elements.amount) f.elements.amount.value = n ? String(n * fee) : ''; };
  const tick = (e, y) => { const t = e.target.checked ? [...ticks, y] : ticks.filter((z) => z !== y); setTicks(t); setAmt(e.target, t.length); };
  const choose = (x) => { setQ(nm(x)); setPicked(typeof x === 'string' ? null : x); setTicks([]); setOpen(false); };
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
          onChange={(e) => { setQ(e.target.value); setOpen(true); setTicks([]); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} />
        {open && hits.length > 0 && !(hits.length === 1 && nm(hits[0]) === q) && (
          <ul className="sugg" role="listbox">{hits.map((x) => <li key={nm(x) + (x.id || '')}><button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => choose(x)}>{nm(x)}</button></li>)}</ul>
        )}
      </label>
      {m && (
        <div className="dues">
          <input type="hidden" name="member_id" value={m.id} />
          <b>{labels.dues}</b>
          {dues.length === 0 && <p className="sum">{labels.nodues}</p>}
          {dues.map((y) => (
            <label key={y} className={`due-row ${ticks.includes(y) ? 'on' : ''}`}>
              <input type="checkbox" name="pay_year" value={y} checked={ticks.includes(y)} onChange={(e) => tick(e, y)} />
              <span><b>AED {fee}</b> · {y}</span><em>{ticks.includes(y) ? '✔' : labels.due}</em>
            </label>
          ))}
          {(m.paid || []).length > 0 && <p className="sum">{labels.paidYears}: {[...m.paid].sort().join(', ')}</p>}
        </div>
      )}
    </>
  );
}
