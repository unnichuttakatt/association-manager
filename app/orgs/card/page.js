import { sql, ensureSchema } from '../../../lib/db';
import { requireAdmin } from '../../../lib/auth';
import { T } from '../../../lib/lang';
import Print from './Print';

export const dynamic = 'force-dynamic';

export default async function Cards({ searchParams }) {
  await requireAdmin(); await ensureSchema();
  const id = Number(searchParams?.id) || 0; const o = String(searchParams?.o || '');
  const list = id
    ? await sql`SELECT * FROM org_members WHERE id = ${id}`
    : await sql`SELECT * FROM org_members WHERE org = ${o} ORDER BY lower(name)`;
  if (!list.length) return <div className="card"><p className="empty">{T('No members yet.')}</p></div>;
  const year = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dubai' }).slice(0, 4);
  const orgs = {};
  for (const n of [...new Set(list.map((m) => m.org))]) orgs[n] = (await sql`SELECT logo FROM orgs WHERE name = ${n}`)[0]?.logo || '';
  const paid = new Set((await sql`SELECT member_id FROM org_renewals WHERE year = ${Number(year)} AND member_id = ANY(${list.map((m) => m.id)})`).map((r) => r.member_id));
  return (
    <>
      <Print label={T('Print')} hint={T('Print on A4 at 100% (no scaling). Cut along the border; front and back sit side by side, fold or paste back to back.')} />
      <div className="idsheet">
        {list.map((m) => (
          <div className="idpair" key={m.id}>
            <div className="idc front">
              <div className="id-head">
                {orgs[m.org] ? <img className="id-logo" src={orgs[m.org]} alt="" /> : <span className="id-logo none">🏛</span>}
                <div><b>{m.org}</b><small>{T('Membership identity card')}</small></div>
              </div>
              <div className="id-body">
                {m.photo ? <img className="id-photo" src={m.photo} alt="" /> : <span className="id-photo none">👤</span>}
                <dl>
                  <dt className="nm">{m.name}</dt>
                  <dd><i>{T('Member no.')}</i> <b>{m.member_no || '—'}</b></dd>
                  <dd><i>{T('Blood group')}</i> <b className="bg">{m.blood_group || '—'}</b></dd>
                  <dd><i>{T('Phone')}</i> <b>{m.phone || '—'}</b></dd>
                  {m.place && <dd><i>{T('Place')}</i> <b>{m.place}</b></dd>}
                </dl>
              </div>
              <div className="id-foot">{paid.has(m.id) ? `${T('Valid')} ${year}` : ''}</div>
            </div>
            <div className="idc back">
              {orgs[m.org] && <img className="id-water" src={orgs[m.org]} alt="" />}
              <p>{T('This card is the property of')} <b>{m.org}</b>. {T('It must be shown on request and is not transferable.')}</p>
              <p>{T('If found, please return it to the association.')}</p>
              <div className="id-sign"><span>{T('Member signature')}</span><span>{T('Authorised signatory')}</span></div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
