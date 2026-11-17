'use client';
import { useState } from 'react';

// Pick an association from the list. Only the account owner can type a new name.
export default function Supplier({ list, value = '', labels, canAdd = false }) {
  const known = list.includes(value);
  const [sel, setSel] = useState(value && known ? value : canAdd && value && !known ? '__new__' : (known ? value : ''));
  return (
    <>
    <label className="f"><span>{labels.supplier}</span>
        <select name="supplier_sel" value={sel} onChange={(e) => setSel(e.target.value)} required>
          <option value="" disabled>{labels.pick}</option>
          {list.map((s) => <option key={s} value={s}>{s}</option>)}
          {canAdd && <option value="__new__">＋ {labels.addNew}</option>}
        </select></label>
      {canAdd && sel === '__new__' && (
        <label className="f"><span>{labels.newName}</span>
          <input name="supplier_new" defaultValue={known ? '' : value} required maxLength={120} autoFocus /></label>
      )}
    </>
  );
}
