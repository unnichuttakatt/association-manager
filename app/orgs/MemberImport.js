'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { importMembers } from './actions';

function Btn({ children }) {
  const { pending } = useFormStatus();
  return <button className="p" disabled={pending}>{pending ? '…' : children}</button>;
}

export default function MemberImport({ org, labels }) {
  const [res, action] = useFormState(importMembers, null);
  return (
    <form action={action} className="row">
      <input type="hidden" name="org" value={org} />
      <label className="f"><span>{labels.year}</span><input type="number" name="year" defaultValue={new Date().getFullYear()} min="2000" max="2100" /></label>
      <label className="f"><span>{labels.file}</span><input type="file" name="sheet" accept=".xlsx,.csv,.tsv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required /></label>
      <Btn>{labels.btn}</Btn>
      {res?.error && <p className="err" style={{ flex: '1 1 100%' }}>{res.error}</p>}
      {res?.added != null && <p className="sum" style={{ flex: '1 1 100%' }}>{labels.done.replace('{a}', res.added).replace('{u}', res.updated)}{res.renewed > 0 && ` ${labels.ren.replace('{n}', res.renewed).replace('{y}', res.year)}`}</p>}
    </form>
  );
}
