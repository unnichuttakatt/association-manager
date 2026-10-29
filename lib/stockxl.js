// Reads a broker holdings sheet (.xlsx or .csv) and works out, for each row, which stock entry it updates.
const num = (x) => { const n = parseFloat(String(x ?? '').replace(/[,₹\s]/g, '').replace(/^\((.*)\)$/, '-$1')); return Number.isFinite(n) ? n : null; };
const key = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const COLS = {
  name: /^(instrument|stock|stockname|scrip|scripname|security|securityname|company|companyname|name|symbol|ticker|isin|fund)$/,
  ticker: /^(symbol|ticker|tradingsymbol|scripcode)$/,
  qty: /^(qty|quantity|shares|holding|holdings|units|netqty|currentqty|balance)$/,
  price: /^(ltp|price|cmp|close|lastprice|currentprice|marketprice|closeprice|ltpprice)$/,
  invested: /^(invested|investedvalue|investedamount|buyvalue|costvalue|totalcost|cost|purchasevalue|investment|investedamt)$/,
  current: /^(curval|currentvalue|marketvalue|presentvalue|value|currentval|mktvalue|marketval|totalvalue|currentamt)$/,
};

export function parseCsv(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',' || c === '\t' || c === ';') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

// rows: array of arrays. Finds the header row (the first one naming a stock and a quantity or value).
export function readHoldings(rows) {
  let h = -1, map = {};
  for (let i = 0; i < Math.min(rows.length, 30) && h < 0; i++) {
    const m = {};
    rows[i].forEach((c, j) => {
      const k = key(c);
      for (const f of ['ticker', 'name', 'qty', 'price', 'invested', 'current']) if (m[f] == null && COLS[f].test(k)) { m[f] = j; break; }
    });
    if (m.name != null && (m.qty != null || m.current != null || m.price != null)) { h = i; map = m; }
  }
  if (h < 0) return { error: 'Could not find the column names. The first row should have e.g. Stock, Quantity, Invested, Current value.' };
  const out = [];
  for (const r of rows.slice(h + 1)) {
    const name = String(r[map.name] ?? '').trim();
    if (!name || /^(total|grand total|sum)/i.test(name)) continue;
    const g = (f) => (map[f] == null ? null : num(r[map[f]]));
    const o = { name, ticker: map.ticker != null && map.ticker !== map.name ? String(r[map.ticker] ?? '').trim() : '', qty: g('qty'), price: g('price'), invested: g('invested'), current: g('current') };
    if (o.current == null && o.qty != null && o.price != null) o.current = +(o.qty * o.price).toFixed(2);
    if (o.price == null && o.qty && o.current != null) o.price = +(o.current / o.qty).toFixed(4);
    if (o.qty == null && o.invested == null && o.current == null) continue;
    out.push(o);
  }
  if (!out.length) return { error: 'No stock rows found in this file.' };
  return { rows: out };
}

const base = (t) => key(String(t).replace(/\.(ns|bo|bse|nse)$/i, '').replace(/-(eq|be|sm)$/i, ''));
// existing: [{id, name, ticker}]. Matches by ticker / symbol first, then by name.
export function matchStock(row, existing) {
  const rk = [base(row.name), row.ticker && base(row.ticker)].filter(Boolean);
  for (const e of existing) {
    const ek = [base(e.name), e.ticker && base(e.ticker)].filter(Boolean);
    if (rk.some((a) => ek.includes(a))) return e.id;
  }
  for (const e of existing) {
    const n = key(e.name);
    if (n.length >= 4 && rk.some((a) => a.length >= 4 && (n.includes(a) || a.includes(n)))) return e.id;
  }
  for (const e of existing) {
    const words = String(e.name).toLowerCase().split(/[^a-z0-9]+/);
    if (rk.some((a) => a.length >= 3 && words.includes(a))) return e.id;
  }
  return null;
}

// ---- members list (name, phone, membership no. ...) ----
const MCOLS = {
  name: /^(name|membername|fullname|member|memberfullname|nameofmember)$/,
  phone: /^(phone|mobile|mobileno|mobilenumber|phoneno|contact|contactno|contactnumber|whatsapp|tel|telephone)$/,
  memberNo: /^(memberno|membernumber|membershipno|membershipnumber|memberid|membershipid)$/,
  email: /^(email|emailid|emailaddress|mail)$/,
  place: /^(place|address|location|city|area|district|native|nativeplace|homeplace)$/,
  joined: /^(joined|joinedon|joindate|dateofjoining|doj|membershipdate|since|memberssince|date)$/,
  status: /^(status|membershipstatus|type|membertype|category)$/,
  notes: /^(notes|remarks|remark|comments|comment)$/,
  renewed: /^(renewed|renewal|renewals|renewalstatus|paid|feepaid|feestatus|renewed20\d\d|renewal20\d\d|20\d\d)$/,
};
export function readMembers(rows) {
  let h = -1, map = {};
  for (let i = 0; i < Math.min(rows.length, 30) && h < 0; i++) {
    const m = {};
    rows[i].forEach((c, j) => { const k = key(c); for (const f of Object.keys(MCOLS)) if (m[f] == null && MCOLS[f].test(k)) { m[f] = j; break; } });
    if (m.name != null) { h = i; map = m; }
  }
  if (h < 0) return { error: 'Could not find a "Name" column. The first row should have column names such as Name, Phone, Member no., Place.' };
  const iso = (v) => {
    if (v == null || v === '') return '';
    const t = String(v).trim();
    let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = /^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})$/.exec(t); if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return '';
  };
  const out = [];
  for (const r of rows.slice(h + 1)) {
    const g = (f) => (map[f] == null ? '' : String(r[map[f]] ?? '').trim());
    const name = g('name');
    if (!name || !/[A-Za-zഀ-ൿ]{2}/.test(name)) continue;
    out.push({ name: name.slice(0, 120), phone: g('phone').replace(/\.0$/, '').slice(0, 40), member_no: g('memberNo').replace(/\.0$/, '').slice(0, 40), email: g('email').slice(0, 120), place: g('place').slice(0, 120), joined: iso(map.joined != null ? r[map.joined] : ''), status: g('status').slice(0, 40), notes: g('notes').slice(0, 300), renewed: /^(y|yes|paid|renewed|done|true|1|x|✓|✔|renewal)$/i.test(g('renewed')) || num(g('renewed')) > 0 });
  }
  if (!out.length) return { error: 'No members found in this file.' };
  return { rows: out };
}
