import Link from 'next/link';
import { sql, ensureSchema } from '../../lib/db';
import { requireAdmin } from '../../lib/auth';
import { revalidatePath } from 'next/cache';
import { num, fmt } from '../../lib/num';
import { SECTION_COLORS } from '../../lib/colors';
import { T, getLang } from '../../lib/lang';
import { monthName } from '../../lib/dict';
import Supplier from './Supplier';
import Kind from './Kind';
import MemberImport from './MemberImport';
import ReportActions from './ReportActions';
import { renewMember, undoRenewal, setFee, setOpening } from './actions';
import { IN_CATS, OUT_CATS } from './cats';

export const dynamic = 'force-dynamic';

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dubai' });
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
const dt = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? `${+m[3]} ${monthName(getLang(), +m[2] - 1)} ${m[1]}` : s || ''; };
const money = (n, cur) => `${n < 0 ? '−' : ''}${cur === 'AED' ? 'AED ' : '₹'}${fmt(Math.abs(n))}`;
const cur2 = (r) => (r.currency === 'INR' ? 'INR' : 'AED');
const signed = (r) => (r.kind === 'in' ? 1 : -1) * num(r.amount);
const byCur = (rows, f) => { const t = {}; for (const r of rows) t[cur2(r)] = (t[cur2(r)] || 0) + f(r); return t; };
const txt = (t) => Object.entries(t).filter(([, v]) => v !== 0).map(([c, v]) => money(v, c)).join(' + ') || 'AED 0';

function clean(fd) {
  const d = String(fd.get('tx_date') || '');
  const kind = String(fd.get('kind')) === 'out' ? 'out' : 'in';
  const cats = kind === 'in' ? IN_CATS : OUT_CATS;
  const cat = String(fd.get('category') || '');
  return {
    tx_date: isDate(d) ? d : today(),
    org: String(fd.get('supplier_sel') === '__new__' ? fd.get('supplier_new') : fd.get('supplier_sel') || '').trim().slice(0, 120),
    kind, category: cats.includes(cat) ? cat : cats[cats.length - 1],
    amount: Math.round(Math.max(0, Number(String(fd.get('amount') || '').replace(/,/g, '')) || 0) * 100) / 100,
    currency: String(fd.get('currency')) === 'INR' ? 'INR' : 'AED',
    party: String(fd.get('party') || '').trim().slice(0, 120),
    ref: String(fd.get('ref') || '').trim().slice(0, 60),
    notes: String(fd.get('notes') || '').trim().slice(0, 500),
  };
}

function Fields({ r = {}, L, orgs }) {
  return (
    <>
      <label className="f"><span>{L.date}</span><input name="tx_date" type="date" defaultValue={r.tx_date ? String(r.tx_date).slice(0, 10) : today()} required /></label>
      <Supplier list={orgs} value={r.org || ''} labels={{ supplier: L.org, pick: L.pickOrg, addNew: L.addOrg, newName: L.newOrg }} />
      <Kind kind={r.kind || 'in'} category={r.category || ''} labels={L} />
      <label className="f"><span>{L.amount}</span><input name="amount" type="number" step="any" min="0" inputMode="decimal" defaultValue={r.amount != null ? String(num(r.amount)) : ''} required /></label>
      <label className="f"><span>{L.currency}</span>
        <select name="currency" defaultValue={r.currency === 'INR' ? 'INR' : 'AED'}><option>AED</option><option>INR</option></select></label>
      <label className="f"><span>{L.party}</span><input name="party" defaultValue={r.party || ''} maxLength={120} /></label>
      <label className="f"><span>{L.ref}</span><input name="ref" defaultValue={r.ref || ''} maxLength={60} /></label>
      <label className="f" style={{ flex: '1 1 100%' }}><span>{L.notes}</span><input name="notes" defaultValue={r.notes || ''} maxLength={500} style={{ width: '100%' }} /></label>
    </>
  );
}

export default async function Orgs({ searchParams }) {
  await requireAdmin();
  await ensureSchema();
  const c = SECTION_COLORS.orgs;

  async function add(fd) {
    'use server';
    await requireAdmin(); await ensureSchema();
    const v = clean(fd);
    if (!v.org || !(v.amount > 0)) return;
    await sql`INSERT INTO orgs (name) VALUES (${v.org}) ON CONFLICT (name) DO NOTHING`;
    await sql`INSERT INTO org_cash (tx_date, org, kind, category, amount, currency, party, ref, notes)
      VALUES (${v.tx_date}, ${v.org}, ${v.kind}, ${v.category}, ${v.amount}, ${v.currency}, ${v.party}, ${v.ref}, ${v.notes})`;
    revalidatePath('/orgs');
  }
  async function update(fd) {
    'use server';
    await requireAdmin(); await ensureSchema();
    const id = Number(fd.get('id')); const v = clean(fd);
    if (!id || !v.org || !(v.amount > 0)) return;
    await sql`INSERT INTO orgs (name) VALUES (${v.org}) ON CONFLICT (name) DO NOTHING`;
    await sql`UPDATE org_cash SET tx_date=${v.tx_date}, org=${v.org}, kind=${v.kind}, category=${v.category}, amount=${v.amount}, currency=${v.currency}, party=${v.party}, ref=${v.ref}, notes=${v.notes} WHERE id=${id}`;
    revalidatePath('/orgs');
  }
  async function del(fd) {
    'use server';
    await requireAdmin(); await ensureSchema();
    const id = Number(fd.get('id')); if (!id) return;
    await sql`DELETE FROM org_cash WHERE id = ${id}`;
    revalidatePath('/orgs');
  }

  async function addMember(fd) {
    'use server';
    await requireAdmin(); await ensureSchema();
    const org = String(fd.get('org') || '').trim(); const name = String(fd.get('name') || '').trim().slice(0, 120);
    if (!org || !name) return;
    const j = String(fd.get('joined') || '');
    await sql`INSERT INTO org_members (org, name, phone, member_no, place, joined, status) VALUES (${org}, ${name}, ${String(fd.get('phone') || '').trim().slice(0, 40)}, ${String(fd.get('member_no') || '').trim().slice(0, 40)}, ${String(fd.get('place') || '').trim().slice(0, 120)}, ${isDate(j) ? j : null}, ${String(fd.get('status') || '').trim().slice(0, 40)})`;
    revalidatePath('/orgs');
  }
  async function delMember(fd) {
    'use server';
    await requireAdmin(); await ensureSchema();
    const id = Number(fd.get('id')); if (!id) return;
    await sql`DELETE FROM org_members WHERE id = ${id}`;
    revalidatePath('/orgs');
  }

  const all = await sql`SELECT id, to_char(tx_date,'YYYY-MM-DD') AS tx_date, org, kind, category, amount, currency, party, ref, notes FROM org_cash ORDER BY org_cash.tx_date DESC, id DESC`;
  const orgs = [...new Set([...(await sql`SELECT name FROM orgs`).map((x) => x.name), ...all.map((r) => r.org)])].sort((a, b) => a.localeCompare(b));
  const sp = searchParams || {};
  const org = orgs.includes(sp.o) ? sp.o : '';
  const kd = ['in', 'out'].includes(sp.k) ? sp.k : '';
  const inOrg = all.filter((r) => !org || r.org === org);
  const months = [...new Set(inOrg.map((r) => r.tx_date.slice(0, 7)))];
  const mo = months.includes(sp.m) ? sp.m : '';
  const rows = inOrg.filter((r) => (!kd || r.kind === kd) && (!mo || r.tx_date.startsWith(mo)));
  const link = (o, k, m) => `/orgs?${new URLSearchParams({ ...(o ? { o } : {}), ...(k ? { k } : {}), ...(m ? { m } : {}) })}`;

  const scope = inOrg.filter((r) => !mo || r.tx_date.startsWith(mo));
  const opening = org ? inOrg.find((r) => r.category === 'Opening balance') : null;
  const tin = byCur(scope.filter((r) => r.kind === 'in' && r.category !== 'Opening balance'), (r) => num(r.amount));
  const tOpen = byCur(scope.filter((r) => r.category === 'Opening balance'), (r) => num(r.amount));
  const tout = byCur(scope.filter((r) => r.kind === 'out'), (r) => num(r.amount));
  const bal = byCur(scope, signed);
  const orgBal = orgs.map((n) => { const rs = all.filter((r) => r.org === n); return { n, b: byCur(rs, signed), in: byCur(rs.filter((r) => r.kind === 'in'), (r) => num(r.amount)), out: byCur(rs.filter((r) => r.kind === 'out'), (r) => num(r.amount)), cnt: rs.length }; });
  const cats = {};
  for (const r of scope) { const k = `${r.kind}|${r.category}|${cur2(r)}`; cats[k] = (cats[k] || 0) + num(r.amount); }
  const catList = Object.entries(cats).map(([k, v]) => { const [kind, category, cur] = k.split('|'); return { kind, category, cur, v }; }).sort((a, b) => (a.kind === b.kind ? b.v - a.v : a.kind === 'in' ? -1 : 1));

  const counts = Object.fromEntries((await sql`SELECT org, count(*)::int AS n FROM org_members GROUP BY org`).map((x) => [x.org, x.n]));
  const q = String(sp.q || '').trim().toLowerCase();
  const year = Number(sp.y) >= 2000 && Number(sp.y) <= 2100 ? Number(sp.y) : new Date().getFullYear();
  const tab = org && ['members', 'report'].includes(sp.t) ? sp.t : 'finance';
  const rf = ['yes', 'no'].includes(sp.r) ? sp.r : '';
  const fee = org ? Number((await sql`SELECT fee FROM orgs WHERE name = ${org}`)[0]?.fee ?? 50) : 50;
  const renewals = org ? Object.fromEntries((await sql`SELECT member_id, to_char(paid_on,'YYYY-MM-DD') AS paid_on, amount FROM org_renewals WHERE org = ${org} AND year = ${year}`).map((x) => [x.member_id, x])) : {};
  const members = org ? (await sql`SELECT id, name, phone, member_no, email, place, to_char(joined,'YYYY-MM-DD') AS joined, status, notes FROM org_members WHERE org = ${org} ORDER BY lower(name)`)
    : [];
  const shown = members.filter((m) => (!q || [m.name, m.phone, m.member_no, m.place].some((v) => String(v).toLowerCase().includes(q))) && (!rf || (rf === 'yes') === !!renewals[m.id]));
  const nRen = members.filter((m) => renewals[m.id]).length;
  const collected = Object.values(renewals).reduce((a, x) => a + num(x.amount), 0);
  const mlink = (o) => `/orgs?${new URLSearchParams({ o, y: String(year), ...(rf ? { r: rf } : {}), ...(sp.q ? { q: sp.q } : {}) })}`;
  const L = {
    date: T('Date'), org: T('Organisation'), pickOrg: T('Select organisation'), addOrg: T('Add new organisation'), newOrg: T('New organisation name'),
    kind: T('Cash in or out'), in: T('Cash in'), out: T('Cash out'), category: T('Category'), amount: T('Amount'), currency: T('Currency'),
    party: T('Received from / paid to'), ref: T('Receipt / voucher no. (optional)'), notes: T('Notes'),
  };
  for (const k of [...IN_CATS, ...OUT_CATS]) L[k] = T(k);

  return (
    <>
      <h1 className="pg-h">{org ? org : T('Organisation cash')}</h1>
      {org && <p><Link className="doc" href="/orgs">← {T('All organisations')}</Link></p>}
      {org && (
        <div className="pur-filter">
          {[['finance', T('Finance')], ['members', T('Members')], ['report', T('Renewal report')]].map(([k, l]) => <Link key={k} href={`/orgs?${new URLSearchParams({ o: org, ...(k !== 'finance' ? { t: k } : {}), ...(k !== 'finance' ? { y: String(year) } : {}) })}`} className={`chipf ${tab === k ? 'on' : ''}`}>{l}</Link>)}
        </div>
      )}
      {(!org || tab === 'finance') && <div className="pur-sum">
        {Object.keys(tOpen).length > 0 && <div className="ds"><span>{T('Opening balance')}</span><b>{txt(tOpen)}</b></div>}
        <div className="ds in"><span>{T('Cash in')}</span><b>{txt(tin)}</b></div>
        <div className="ds out"><span>{T('Cash out')}</span><b>{txt(tout)}</b></div>
        <div className={`ds ${Object.values(bal).every((v) => v >= 0) ? 'in' : 'out'}`}><span>{T('Cash in hand')}</span><b>{txt(bal)}</b></div>
      </div>}

      {org && tab === 'finance' && (
        <details className="card fold" style={{ '--c': c }}>
          <summary className="card-sum"><h2>{T('Opening balance')}</h2>{opening && <span className="count">{money(num(opening.amount), cur2(opening))}</span>}<span className="chev" aria-hidden="true" /></summary>
          <p className="sum">{T('Cash in hand on the date you choose. It is the starting point and is not counted as cash in. Saving again replaces it; save with an empty amount to remove it.')}</p>
          <form action={setOpening} className="row">
            <input type="hidden" name="org" value={org} />
            <label className="f"><span>{T('As on date')}</span><input name="tx_date" type="date" defaultValue={opening ? opening.tx_date : today()} required /></label>
            <label className="f"><span>{T('Opening balance')}</span><input name="amount" type="number" step="any" min="0" inputMode="decimal" defaultValue={opening ? String(num(opening.amount)) : ''} /></label>
            <label className="f"><span>{T('Currency')}</span><select name="currency" defaultValue={opening && opening.currency === 'INR' ? 'INR' : 'AED'}><option>AED</option><option>INR</option></select></label>
            <button className="p">{T('Save opening balance')}</button>
          </form>
        </details>
      )}

      {org && tab === 'members' && (
        <details className="card fold" style={{ '--c': c }} open>
          <summary className="card-sum"><h2>{T('Members')}</h2><span className="count">{counts[org] || 0}</span><span className="chev" aria-hidden="true" /></summary>
          <p className="sum">{T('Upload an Excel or CSV list. The first row should have column names such as Name, Phone, Member no., Place, Joined, Status. Members already in the list (same member no., or same name and phone) are updated, not added twice.')}</p>
          <MemberImport org={org} labels={{ year: T('Renewal year (for a Renewed column)'), ren: T('{n} marked renewed for {y}.'), file: T('Excel or CSV file (max 4 MB)'), btn: T('Upload members'), done: T('{a} members added, {u} updated.') }} />
          <form action={addMember} className="row" style={{ marginTop: 10 }}>
            <input type="hidden" name="org" value={org} />
            <label className="f"><span>{T('Name')}</span><input name="name" required maxLength={120} /></label>
            <label className="f"><span>{T('Phone')}</span><input name="phone" maxLength={40} inputMode="tel" /></label>
            <label className="f"><span>{T('Member no.')}</span><input name="member_no" maxLength={40} /></label>
            <label className="f"><span>{T('Place')}</span><input name="place" maxLength={120} /></label>
            <label className="f"><span>{T('Joined')}</span><input name="joined" type="date" /></label>
            <label className="f"><span>{T('Status')}</span><input name="status" maxLength={40} /></label>
            <button className="p">{T('Add member')}</button>
          </form>
          <div className="pur-sum" style={{ marginTop: 12 }}>
            <div className="ds in"><span>{T('Renewed {y}', { y: year })}</span><b>{nRen} / {members.length}</b></div>
            <div className={`ds ${members.length - nRen > 0 ? 'out' : 'in'}`}><span>{T('Not renewed')}</span><b>{members.length - nRen}</b></div>
            <div className="ds in"><span>{T('Renewal income {y}', { y: year })}</span><b>{money(collected, 'AED')}</b></div>
          </div>
          <div className="pur-filter">
            <Link href={`/orgs?${new URLSearchParams({ o: org, t: 'members', y: String(year - 1) })}`} className="chipf">‹ {year - 1}</Link>
            <span className="chipf on">{year}</span>
            <Link href={`/orgs?${new URLSearchParams({ o: org, t: 'members', y: String(year + 1) })}`} className="chipf">{year + 1} ›</Link>
            <span className="sep" aria-hidden="true" />
            {[['', T('All')], ['yes', T('Renewed')], ['no', T('Not renewed')]].map(([k, l]) => <Link key={k} href={`/orgs?${new URLSearchParams({ o: org, t: 'members', y: String(year), ...(k ? { r: k } : {}) })}`} className={`chipf ${rf === k ? 'on' : ''}`}>{l}</Link>)}
          </div>
          <form action={setFee} className="row">
            <input type="hidden" name="org" value={org} />
            <label className="f"><span>{T('Renewal fee per member (AED)')}</span><input name="fee" type="number" step="any" min="0" defaultValue={fee} /></label>
            <button className="p">{T('Save fee')}</button>
          </form>
          <form method="get" className="row" style={{ marginTop: 10 }}>
            <input type="hidden" name="o" value={org} /><input type="hidden" name="t" value="members" /><input type="hidden" name="y" value={year} />{rf && <input type="hidden" name="r" value={rf} />}
            <label className="f"><span>{T('Search members')}</span><input name="q" defaultValue={sp.q || ''} /></label>
            <button className="p">{T('Search')}</button>
          </form>
          {shown.length === 0 && <p className="empty">{(counts[org] || 0) ? T('Nothing matches this filter.') : T('No members yet.')}</p>}
          {shown.length > 0 && (
            <div className="scroll"><table>
              <thead><tr><th>{T('Name')}</th><th>{T('Phone')}</th><th>{T('Member no.')}</th><th>{T('Place')}</th><th>{T('Joined')}</th><th>{T('Status')}</th><th>{T('Renewal')} {year}</th><th></th></tr></thead>
              <tbody>{shown.map((m) => (
                <tr key={m.id}><td>{m.name}</td><td>{m.phone}</td><td>{m.member_no}</td><td>{m.place}</td><td>{m.joined ? dt(m.joined) : ''}</td><td>{m.status}</td>
                  <td>{renewals[m.id] ? <form action={undoRenewal} className="pay"><input type="hidden" name="id" value={m.id} /><input type="hidden" name="year" value={year} /><span className="pst paid">{T('Renewed')} {dt(renewals[m.id].paid_on)}</span> <button className="doc">{T('Undo')}</button></form> : <form action={renewMember}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="year" value={year} /><button className="p">{T('Renew')} · {money(fee, 'AED')}</button></form>}</td>
                  <td><form action={delMember}><input type="hidden" name="id" value={m.id} /><button className="doc danger">{T('Delete')}</button></form></td></tr>
              ))}</tbody>
            </table></div>
          )}
        </details>
      )}

      {(!org || tab === 'finance') && <details className="card fold" style={{ '--c': c }} open={all.length === 0 || undefined}>
        <summary className="card-sum"><h2>{T('New entry')}</h2><span className="chev" aria-hidden="true" /></summary>
        <form action={add} className="row" style={{ marginTop: 10 }}>
          <Fields L={L} orgs={orgs} r={org ? { org } : {}} />
          <button className="p">{T('Add entry')}</button>
        </form>
      </details>}

      {!org && (
        <div className="card" style={{ '--c': c }}>
          <h2>{T('Organisations')}</h2>
          {orgs.length === 0 && <p className="empty">{T('No organisations yet. Add the first entry above.')}</p>}
          <ul className="entries">
            {orgBal.map((x) => (
              <li className="entry" key={x.n}>
                <Link href={link(x.n, '', '')} className="org-head">
                  <div className="e-top"><span className="chip">{x.n}</span><b className={`e-amt ${Object.values(x.b).every((v) => v >= 0) ? 'mup' : 'mdown'}`}>{txt(x.b)}</b></div>
                  <div className="e-meta"><span>{T('Cash in')} {txt(x.in)}</span><span>{T('Cash out')} {txt(x.out)}</span>{counts[x.n] > 0 && <span>{counts[x.n]} {T('members')}</span>}<span>{x.cnt} {T('entries')} ›</span></div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {org && tab === 'report' && (() => {
        const done = members.filter((m) => renewals[m.id]).sort((a, b) => (renewals[a.id].paid_on > renewals[b.id].paid_on ? 1 : -1));
        const pend = members.filter((m) => !renewals[m.id]);
        const text = [`${org} - ${T('Membership renewal')} ${year}`, `${T('Renewed')}: ${done.length} / ${members.length}`,
          ...(rf !== 'no' ? ['', `✅ ${T('Renewed')} (${done.length})`, ...done.map((m, i) => `${i + 1}. ${m.name}`)] : []),
          ...(rf !== 'yes' ? ['', `⏳ ${T('Not renewed')} (${pend.length})`, ...pend.map((m, i) => `${i + 1}. ${m.name}`)] : [])].join('\n');
        return (
          <div className="card report" style={{ '--c': c }}>
            <h2>{T('Membership renewal')} {year}</h2>
            <div className="pur-filter noprint">
              <Link href={`/orgs?${new URLSearchParams({ o: org, t: 'report', y: String(year - 1) })}`} className="chipf">‹ {year - 1}</Link>
              <span className="chipf on">{year}</span>
              <Link href={`/orgs?${new URLSearchParams({ o: org, t: 'report', y: String(year + 1) })}`} className="chipf">{year + 1} ›</Link>
            </div>
            <div className="pur-sum">
              <div className="ds"><span>{T('Members')}</span><b>{members.length}</b></div>
              <div className="ds in"><span>{T('Renewed')}</span><b>{done.length}</b></div>
              <div className={`ds ${pend.length ? 'out' : 'in'}`}><span>{T('Not renewed')}</span><b>{pend.length}</b></div>
              <div className="ds in"><span>{T('Renewal income {y}', { y: year })}</span><b>{money(collected, 'AED')}</b></div>
            </div>
            <div className="pur-filter noprint">
              {[['', T('All')], ['yes', T('Renewed')], ['no', T('Not renewed')]].map(([k, l]) => <Link key={k} href={`/orgs?${new URLSearchParams({ o: org, t: 'report', y: String(year), ...(k ? { r: k } : {}) })}`} className={`chipf ${rf === k ? 'on' : ''}`}>{l}</Link>)}
            </div>
            <ReportActions text={text} labels={{ print: T('Print / save as PDF'), copy: T('Copy as text (WhatsApp)'), copied: T('Copied') }} />
            {rf !== 'no' && <h3>✅ {T('Renewed')} ({done.length})</h3>}
            {rf !== 'no' && (done.length === 0 ? <p className="empty">{T('Nobody has renewed yet.')}</p> : (
              <div className="scroll"><table><thead><tr><th>#</th><th>{T('Name')}</th><th>{T('Date')}</th><th>{T('Amount')}</th></tr></thead>
                <tbody>{done.map((m, i) => <tr key={m.id}><td>{i + 1}</td><td>{m.name}</td><td>{dt(renewals[m.id].paid_on)}</td><td>{money(num(renewals[m.id].amount), 'AED')}</td></tr>)}</tbody></table></div>
            ))}
            {rf !== 'yes' && <h3>⏳ {T('Not renewed')} ({pend.length})</h3>}
            {rf !== 'yes' && (pend.length === 0 ? <p className="empty">{T('Everyone has renewed.')}</p> : (
              <div className="scroll"><table><thead><tr><th>#</th><th>{T('Name')}</th><th>{T('Phone')}</th></tr></thead>
                <tbody>{pend.map((m, i) => <tr key={m.id}><td>{i + 1}</td><td>{m.name}</td><td>{m.phone}</td></tr>)}</tbody></table></div>
            ))}
          </div>
        );
      })()}

      {org && tab === 'finance' && catList.length > 0 && (
        <div className="card" style={{ '--c': c }}>
          <h2>{T('By category')}</h2>
          <ul className="entries">
            {catList.map((x, i) => <li className="entry" key={i}><div className="e-top">
              <span className={`pst ${x.kind === 'in' ? 'paid' : 'unpaid'}`}>{x.kind === 'in' ? T('Cash in') : T('Cash out')}</span>
              <span className="chip">{T(x.category)}</span><b className="e-amt">{money(x.v, x.cur)}</b></div></li>)}
          </ul>
        </div>
      )}

      {org && tab === 'finance' && <>
      <div className="pur-filter">
        {[['', T('All')], ['in', T('Cash in')], ['out', T('Cash out')]].map(([k, l]) => <Link key={k} href={link(org, k, mo)} className={`chipf ${kd === k ? 'on' : ''}`}>{l}</Link>)}
        {months.length > 1 && <span className="sep" aria-hidden="true" />}
        {months.length > 1 && <Link href={link(org, kd, '')} className={`chipf ${!mo ? 'on' : ''}`}>{T('All months')}</Link>}
        {months.length > 1 && months.map((m) => <Link key={m} href={link(org, kd, m)} className={`chipf ${mo === m ? 'on' : ''}`}>{monthName(getLang(), +m.slice(5) - 1)} {m.slice(0, 4)}</Link>)}
      </div>

      <div className="panel pad" style={{ '--c': c }}>
        {rows.length === 0 && <p className="empty">{all.length === 0 ? T('No entries yet. Add the first one above.') : T('Nothing matches this filter.')}</p>}
        <ul className="entries">
          {rows.map((r) => (
            <li className="entry pur" key={r.id}>
              <div className="e-top">
                <span className="chip">{r.org}</span>
                <span className="chip line">{T(r.category)}</span>
                {r.party && <span className="chip who">{r.kind === 'in' ? '👤' : '➡'} {r.party}</span>}
                <span className={`pst ${r.kind === 'in' ? 'paid' : 'unpaid'}`}>{r.kind === 'in' ? T('Cash in') : T('Cash out')}</span>
                <b className={`e-amt ${r.kind === 'in' ? 'mup' : 'mdown'}`}>{r.kind === 'in' ? '+' : '−'}{money(num(r.amount), cur2(r))}</b>
              </div>
              <div className="e-meta">
                <span>{dt(r.tx_date)}</span>
                {r.ref && <span>#{r.ref}</span>}
              </div>
              {r.notes && <div className="e-meta soft"><span>{r.notes}</span></div>}
              <details className="pur-edit">
                <summary className="doc">{T('Edit')}</summary>
                <form action={update} className="row"><input type="hidden" name="id" value={r.id} /><Fields r={r} L={L} orgs={orgs} /><button className="p">{T('Save changes')}</button></form>
                <form action={del}><input type="hidden" name="id" value={r.id} /><button className="doc danger">{T('Delete this entry')}</button></form>
              </details>
            </li>
          ))}
        </ul>
      </div>
      </>}
    </>
  );
}
