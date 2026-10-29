'use client';
import { useState } from 'react';

import { IN_CATS, OUT_CATS } from './cats';

// Big Cash in / Cash out toggle (easy to tap on a phone) and the categories that belong to it.
export default function Kind({ kind = 'in', category = '', labels }) {
  const [k, setK] = useState(kind);
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
        <select name="category" key={k} defaultValue={list.includes(category) ? category : list[list.length - 1]}>
          {list.map((c) => <option key={c} value={c}>{labels[c] || c}</option>)}</select></label>
    </>
  );
}
