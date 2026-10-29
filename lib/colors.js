// Section accents (also used as the segments of the allocation bar on the overview).
export const SECTION_COLORS = {
  bank: '#0E7C86',
  fcnr: '#1D6FB8',
  stock: '#4C4FD6',
  mf: '#0F766E',
  sgb: '#A16207',
  nps: '#7C3AED',
  chitty: '#B45309',
  pds: '#9333A8',
  loan: '#B91C1C',
  insurance: '#1D4ED8',
  held: '#475569',
  purchases: '#C2410C',
  orgs: '#0F766E',
  property: '#15803D',
  cashflow: '#15803D',
  dues: '#0E7490',
};

// Every bank gets its own colour. All are dark enough for white text (4.5:1 or better).
const PALETTE = [
  '#0E7C86', '#4C4FD6', '#C2410C', '#15803D', '#BE185D', '#1D6FB8',
  '#9333A8', '#B45309', '#B91C1C', '#587207', '#475569', '#1E3A8A',
];

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0);
}

// Same bank name -> same colour; two different banks on screen never share a colour (up to 12 banks).
export function bankColors(names) {
  const out = {};
  const used = new Set();
  [...new Set(names.map((n) => n.trim().toLowerCase()))].sort().forEach((n) => {
    let i = hash(n) % PALETTE.length;
    for (let tries = 0; used.has(i) && tries < PALETTE.length; tries++) i = (i + 1) % PALETTE.length;
    used.add(i);
    out[n] = PALETTE[i];
  });
  return out;
}
