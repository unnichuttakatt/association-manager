import './globals.css';
import { currentUser, destroySession } from '../lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { PwaRegister } from './PwaBits';
import TabBar from './TabBar';
import { getLang, T } from '../lib/lang';

export const metadata = {
  title: 'Association Manager', robots: { index: false, follow: false },
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icons/favicon-32.png?v=2', apple: '/icons/apple-touch-icon.png?v=2' },
  appleWebApp: { capable: true, title: 'Association Manager', statusBarStyle: 'black-translucent' },
};
export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#0B2F36', viewportFit: 'cover' };
export const dynamic = 'force-dynamic';

export default async function Layout({ children }) {
  const user = await currentUser();
  async function logout() { 'use server'; destroySession(); redirect('/login'); }
  async function setLang(formData) {
    'use server';
    cookies().set('lang', formData.get('lang') === 'ml' ? 'ml' : 'en', { path: '/', maxAge: 31536000, sameSite: 'lax' });
  }
  const lang = getLang();
  return (
    <html lang={lang}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Figtree:wght@400;500;600;700&family=Noto+Sans+Malayalam:wght@400;500;600;700&display=swap" />
      </head>
      <body>
        <header className="top">
          <Link href="/orgs" className="brand"><img className="logo" src="/icons/icon-192.png?v=2" alt="" width="30" height="30" />{T('Association Manager')}</Link>
          <form action={setLang} className="lang">
            <button name="lang" value="en" aria-pressed={lang === 'en'} className={lang === 'en' ? 'on' : ''}>EN</button>
            <button name="lang" value="ml" aria-pressed={lang === 'ml'} className={lang === 'ml' ? 'on' : ''}>മല</button>
          </form>
          {user && (
            <nav className="nav">
              {user.role === 'admin' && <Link href="/orgs">{T('Organisations')}</Link>}
              {user.role === 'admin' && <Link href="/users">{T('Users')}</Link>}
              <Link href="/account">{T('Security')}</Link>
              <span className="who">{user.name}</span>
              <form action={logout}><button>{T('Log out')}</button></form>
            </nav>
          )}
        </header>
        <main>{children}</main>
        {user && user.role === 'admin' && <TabBar tabs={[{ href: '/orgs', icon: 'orgs', label: T('Organisations') }, { href: '/users', icon: 'users', label: T('Users') }]} />}
        <PwaRegister />
      </body>
    </html>
  );
}
