'use client';
import { useEffect, useState } from 'react';
import { tx } from '../lib/dict';

export function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  return null;
}

// Shows an install button where the browser allows it, plus short steps for iPhone.
export function InstallCard({ lang }) {
  const [evt, setEvt] = useState(null);
  const [standalone, setStandalone] = useState(false);
  useEffect(() => {
    const on = (e) => { e.preventDefault(); setEvt(e); };
    window.addEventListener('beforeinstallprompt', on);
    setStandalone(window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true);
    return () => window.removeEventListener('beforeinstallprompt', on);
  }, []);
  if (standalone) return null;
  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <h2>{tx(lang, 'Install on your phone')}</h2>
      <p className="sum">{tx(lang, 'Add this site to your home screen to open it like an app.')}</p>
      {evt && <button className="p" onClick={async () => { evt.prompt(); await evt.userChoice; setEvt(null); }}>{tx(lang, 'Install app')}</button>}
      <p className="sum" style={{ marginTop: 10 }}>{tx(lang, 'On iPhone: tap Share, then Add to Home Screen.')}</p>
      <p className="sum">{tx(lang, 'On Android: tap Install app, or the browser menu then Install app / Add to Home screen.')}</p>
    </div>
  );
}
