import { cookies } from 'next/headers';
import { tx } from './dict';

export function getLang() {
  try { return cookies().get('lang')?.value === 'ml' ? 'ml' : 'en'; } catch { return 'en'; }
}
// Server-side translate: T('Hello, {name}', { name }) -> text in the chosen language.
export const T = (s, vars) => tx(getLang(), s, vars);

// The notes of an entry in the current language (falls back to the English notes).
export const noteOf = (r) => (getLang() === 'ml' && r.notesMl) || r.notes;
