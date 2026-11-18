'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './icons';

export default function TabBar({ tabs, label = 'Main' }) {
  const p = usePathname() || '/';
  if (tabs.length < 2 || p.startsWith('/login')) return null;
  const on = (h) => (h === '/' ? p === '/' : p.startsWith(h));
  return (
    <nav className="tabbar" aria-label={label}>
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} className={on(t.href) ? 'on' : ''} aria-current={on(t.href) ? 'page' : undefined}>
          <Icon k={t.icon} /><span>{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}
