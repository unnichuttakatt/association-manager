'use client';
import { useState } from 'react';

// Picks a picture, shrinks it in the browser and keeps it as a small data URL in a hidden field.
// shape 'portrait' crops to 4:5 (member photo); 'logo' keeps the whole picture with transparency.
export default function PhotoPick({ name, value = '', shape = 'portrait', labels }) {
  const [img, setImg] = useState(value);
  const [busy, setBusy] = useState(false);
  const pick = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setBusy(true);
    try {
      const bmp = await createImageBitmap(f);
      const c = document.createElement('canvas'); const g = c.getContext('2d');
      let url;
      if (shape === 'logo') {
        const s = Math.min(1, 320 / Math.max(bmp.width, bmp.height));
        c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
        g.drawImage(bmp, 0, 0, c.width, c.height); url = c.toDataURL('image/png');
        if (url.length > 150000) { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0, c.width, c.height); url = c.toDataURL('image/jpeg', 0.8); }
      } else {
        const W = 240, H = 300; c.width = W; c.height = H;
        const s = Math.max(W / bmp.width, H / bmp.height); const w = bmp.width * s, h = bmp.height * s;
        g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.drawImage(bmp, (W - w) / 2, (H - h) * 0.3, w, h);
        url = c.toDataURL('image/jpeg', 0.8);
      }
      setImg(url);
    } catch { /* ignore unreadable file */ }
    setBusy(false);
  };
  return (
    <div className={`pp ${shape}`}>
      {img ? <img src={img} alt="" /> : <span className="pp-empty">{shape === 'logo' ? '🏛' : '👤'}</span>}
      <div className="pp-b">
        <label className="doc pp-pick">{busy ? '…' : (img ? labels.change : labels.choose)}
          <input type="file" accept="image/*" onChange={pick} hidden /></label>
        {img && <button type="button" className="doc" onClick={() => setImg('')}>{labels.remove}</button>}
      </div>
      <input type="hidden" name={name} value={img} />
      <input type="hidden" name={`${name}_set`} value="1" />
    </div>
  );
}
