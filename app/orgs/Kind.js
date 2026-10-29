'use client';
import { useState } from 'react';

import { IN_CATS, OUT_CATS } from './cats';

// Cash in / cash out, and the categories that belong to it.
export default function Kind({ kind = 'in', category = '', labels }) {
  const [k, setK] = useState(kind);
  const list = k === 'in' ? IN_CATS : OUT_CATS;
  return (
    <>
      <label className="f"><span>{labels.kind}</span>
        <select name="kind" value={k} onChange={(e) => setK(e.target.value)}>
          <option value="in">{labels.in}</option><option value="out">{labels.out}</option></select></label>
      <label className="f"><span>{labels.category}</span>
        <select name="category" key={k} defaultValue={list.includes(category) ? category : list[list.length - 1]}>
          {list.map((c) => <option key={c} value={c}>{labels[c] || c}</option>)}</select></label>
    </>
  );
}
