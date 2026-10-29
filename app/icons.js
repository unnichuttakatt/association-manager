const P = {
  held: <path d="M12 3l8 3v6c0 5-3.500 8-8 9-4.500-1-8-4-8-9V6l8-3z" />,
  users: <path d="M16 19v-1.500a3.500 3.500 0 00-3.500-3.500h-3A3.500 3.500 0 006 17.500V19M11 11a3 3 0 100-6 3 3 0 000 6M18 19v-1.200a3 3 0 00-2-2.800M15.500 5.200a3 3 0 010 5.600" />,
  orgs: <path d="M3 20h18M5 20V9l7-5 7 5v11M9 20v-6h6v6M12 9.500v.01" />,
  purchases: <path d="M6 7h13l-1.500 8H8L6 4H3M9 19.500a1 1 0 100-.01M17 19.500a1 1 0 100-.01" />,
  bank: <path d="M3 10l9-6 9 6M5 10v8m4-8v8m6-8v8m4-8v8M3 20h18" />,
  fcnr: <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15 9.5c-.5-1-1.600-1.500-3-1.500-1.700 0-3 .8-3 2s1.200 1.700 3 2 3 .8 3 2-1.300 2-3 2c-1.400 0-2.500-.5-3-1.500M12 6v2m0 8v2" />,
  stock: <path d="M3 17l5-5 4 3 8-9M15 6h5v5" />,
  mf: <path d="M4 20V10m5 10V4m5 16v-7m5 7V8" />,
  sgb: <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9 9h6M8 12h8M9 15h6" />,
  nps: <path d="M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM5 20c0-3.500 3-6 7-6s7 2.500 7 6M17 3l2 2 3-3" />,
  chitty: <path d="M4 12a8 8 0 0 1 14-5M20 12a8 8 0 0 1-14 5M18 3v4h-4M6 21v-4h4" />,
  pds: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM9 12l2 2 4-4" />,
  loan: <path d="M12 3v18M16 7.500c-.6-1-1.800-1.500-4-1.500-2.200 0-3.500.9-3.500 2.300 0 3.200 7.500 1.500 7.500 4.700 0 1.500-1.500 2.500-4 2.500-2.200 0-3.500-.6-4.200-1.800" />,
  insurance: <path d="M12 3l8 3v6c0 5-3.500 8-8 9-4.500-1-8-4-8-9V6l8-3zM12 9v6M9 12h6" />,
  property: <path d="M4 11l8-7 8 7v9H4v-9zM10 20v-6h4v6" />,
  dues: <path d="M4 8h13l-3-3M20 16H7l3 3" />,
  cashflow: <path d="M4 8h16M4 8v10h16V8M4 8l2-4h12l2 4M9 13h6" />,
};
export function Icon({ k }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{P[k] || P.property}</svg>
  );
}
