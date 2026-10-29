'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '../../lib/auth';
import { sql, ensureSchema } from '../../lib/db';
import { parseCsv, readMembers } from '../../lib/stockxl';

const MAX = 4 * 1024 * 1024;
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dubai' });

// Records one year's renewal and the matching Cash in entry (Membership fee). Does nothing if that year is already renewed.
async function doRenew(org, memberId, name, year, amount, date) {
  const done = (await sql`SELECT id FROM org_renewals WHERE member_id = ${memberId} AND year = ${year}`)[0];
  if (done) return false;
  const cash = (await sql`INSERT INTO org_cash (tx_date, org, kind, category, amount, currency, party, ref)
    VALUES (${date || today()}, ${org}, 'in', 'Membership fee', ${amount}, 'AED', ${name}, ${'Renewal ' + year}) RETURNING id`)[0];
  await sql`INSERT INTO org_renewals (member_id, org, year, amount, paid_on, cash_id) VALUES (${memberId}, ${org}, ${year}, ${amount}, ${date || today()}, ${cash.id})`;
  return true;
}
const feeOf = async (org) => Number((await sql`SELECT fee FROM orgs WHERE name = ${org}`)[0]?.fee ?? 50);
const yr = (v) => { const y = Number(v); return y >= 2000 && y <= 2100 ? y : new Date().getFullYear(); };

// Finance: receive a member's renewal fee on a chosen date. Records the renewal and a Cash in (Membership fee) entry.
export async function receiveFee(fd) {
  await requireAdmin(); await ensureSchema();
  const id = Number(fd.get('member')); const year = yr(fd.get('year'));
  const m = (await sql`SELECT id, org, name FROM org_members WHERE id = ${id}`)[0];
  if (!m) return;
  const d = String(fd.get('tx_date') || '');
  const amt = Math.round(Math.max(0, Number(fd.get('amount')) || 0) * 100) / 100 || await feeOf(m.org);
  await doRenew(m.org, m.id, m.name, year, amt, isDate(d) ? d : today());
  revalidatePath('/orgs');
}
const img = (v, max) => { v = String(v || ''); return /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v) && v.length <= max ? v : ''; };
export async function setLogo(fd) {
  await requireAdmin(); await ensureSchema();
  const org = String(fd.get('org') || '');
  await sql`UPDATE orgs SET logo = ${img(fd.get('logo'), 200000)} WHERE name = ${org}`;
  revalidatePath('/orgs');
}
export async function updateMember(fd) {
  await requireAdmin(); await ensureSchema();
  const id = Number(fd.get('id')); const name = String(fd.get('name') || '').trim().slice(0, 120);
  if (!id || !name) return;
  const j = String(fd.get('joined') || '');
  const t = (k, n) => String(fd.get(k) || '').trim().slice(0, n);
  await sql`UPDATE org_members SET name=${name}, phone=${t('phone', 40)}, member_no=${t('member_no', 40)}, place=${t('place', 120)}, joined=${isDate(j) ? j : null}, status=${t('status', 40)}, blood_group=${t('blood_group', 6).toUpperCase()} WHERE id=${id}`;
  if (fd.get('photo_set')) { const ph = img(fd.get('photo'), 60000); await sql`UPDATE org_members SET photo=${ph} WHERE id=${id}`; }
  revalidatePath('/orgs');
}
export async function undoRenewal(fd) {
  await requireAdmin(); await ensureSchema();
  const id = Number(fd.get('id')); const year = yr(fd.get('year'));
  const r = (await sql`SELECT id, cash_id FROM org_renewals WHERE member_id = ${id} AND year = ${year}`)[0];
  if (!r) return;
  if (r.cash_id) await sql`DELETE FROM org_cash WHERE id = ${r.cash_id}`;
  await sql`DELETE FROM org_renewals WHERE id = ${r.id}`;
  revalidatePath('/orgs');
}
export async function setFee(fd) {
  await requireAdmin(); await ensureSchema();
  const org = String(fd.get('org') || '').trim(); const fee = Math.max(0, Number(fd.get('fee')) || 0);
  if (!org) return;
  await sql`INSERT INTO orgs (name, fee) VALUES (${org}, ${fee}) ON CONFLICT (name) DO UPDATE SET fee = ${fee}`;
  revalidatePath('/orgs');
}

const digits = (s) => String(s || '').replace(/\D/g, '');

// Adds every member from an Excel / CSV file. Someone already in the organisation (same name and phone, or same member no.) is updated, not duplicated.
export async function importMembers(_prev, fd) {
  await requireAdmin(); await ensureSchema();
  const org = String(fd.get('org') || '').trim();
  const f = fd.get('sheet');
  if (!org) return { error: 'Organisation missing.' };
  if (!f || typeof f.arrayBuffer !== 'function' || !f.size) return { error: 'Choose an Excel (.xlsx) or CSV file first.' };
  if (f.size > MAX) return { error: 'File is too large. Maximum 4 MB.' };
  const buf = Buffer.from(await f.arrayBuffer());
  let table;
  try {
    if (buf.slice(0, 2).toString() === 'PK') {
      const readXlsxFile = (await import('read-excel-file/node')).default;
      table = (await readXlsxFile(buf)).map((r) => r.map((c) => (c instanceof Date ? c.toISOString().slice(0, 10) : c ?? '')));
    } else if (/\.xls$/i.test(f.name || '') || buf.slice(0, 4).toString('hex') === 'd0cf11e0') {
      return { error: 'Old .xls files are not supported. Open it in Excel and use Save As → .xlsx (or CSV).' };
    } else table = parseCsv(buf.toString('utf8').replace(/^﻿/, ''));
  } catch { return { error: 'Could not read this file. Save it as .xlsx or CSV and try again.' }; }
  const res = readMembers(table);
  if (res.error) return { error: res.error };
  await sql`INSERT INTO orgs (name) VALUES (${org}) ON CONFLICT (name) DO NOTHING`;
  const have = await sql`SELECT id, name, phone, member_no FROM org_members WHERE org = ${org}`;
  const year = yr(fd.get('year')); const fee = await feeOf(org);
  let added = 0, updated = 0, renewed = 0;
  for (const m of res.rows.slice(0, 3000)) {
    const hit = have.find((x) => (m.member_no && x.member_no === m.member_no) || (x.name.toLowerCase() === m.name.toLowerCase() && digits(x.phone) === digits(m.phone)));
    const j = isDate(m.joined) ? m.joined : null;
    if (hit) {
      await sql`UPDATE org_members SET name=${m.name}, phone=${m.phone || hit.phone}, member_no=${m.member_no || hit.member_no}, email=${m.email}, place=${m.place}, joined=${j}, status=${m.status}, notes=${m.notes} WHERE id=${hit.id}`;
      updated++;
      if (m.renewed && await doRenew(org, hit.id, m.name, year, fee)) renewed++;
    } else {
      const r = (await sql`INSERT INTO org_members (org, name, phone, member_no, email, place, joined, status, notes)
        VALUES (${org}, ${m.name}, ${m.phone}, ${m.member_no}, ${m.email}, ${m.place}, ${j}, ${m.status}, ${m.notes}) RETURNING id`)[0];
      have.push({ id: r.id, name: m.name, phone: m.phone, member_no: m.member_no });
      added++;
      if (m.renewed && await doRenew(org, r.id, m.name, year, fee)) renewed++;
    }
  }
  revalidatePath('/orgs');
  return { added, updated, renewed, year, nonce: Date.now() };
}

// One opening balance per organisation: the cash in hand on a chosen date. Saving again replaces it; an empty amount removes it.
export async function setOpening(fd) {
  await requireAdmin(); await ensureSchema();
  const org = String(fd.get('org') || '').trim(); if (!org) return;
  const d = String(fd.get('tx_date') || '');
  const amount = Math.round(Math.max(0, Number(String(fd.get('amount') || '').replace(/,/g, '')) || 0) * 100) / 100;
  await sql`DELETE FROM org_cash WHERE org = ${org} AND category = 'Opening balance'`;
  if (amount > 0) {
    await sql`INSERT INTO orgs (name) VALUES (${org}) ON CONFLICT (name) DO NOTHING`;
    await sql`INSERT INTO org_cash (tx_date, org, kind, category, amount, currency, party, ref)
      VALUES (${isDate(d) ? d : today()}, ${org}, 'in', 'Opening balance', ${amount}, ${String(fd.get('currency')) === 'INR' ? 'INR' : 'AED'}, '', 'Opening balance')`;
  }
  revalidatePath('/orgs');
}
