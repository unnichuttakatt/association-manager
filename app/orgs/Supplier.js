'use client';
import { useState } from 'react';

// Pick a supplier from the list, or choose "Add new supplier" and type the name.
export default function Supplier({ list, value = '', labels }) {
  const known = list.includes(value);
  const [sel, setSel] = useState(value && known ? value : value && !known ? '__new__' : '');
  return (
    <>
      <label className="f"><span>{labels.supplier}</span>
        <select name="supplier_sel" value={sel} onChange={(e) => setSel(e.target.value)} required>
          <option value="" disabled>{labels.pick}</option>
          {list.map((s) => <option key={s} value={s}>{s}</option>)}
          <option value="__new__">＋ {labels.addNew}</option>
        </select></label>
      {sel === '__new__' && (
        <label className="f"><span>{labels.newName}</span>
          <input name="supplier_new" defaultValue={known ? '' : value} required maxLength={120} autoFocus /></label>
      )}
    </>
  );
}
