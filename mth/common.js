// 무브투헤븐 공통 모듈 — Supabase 연결, 사진 업로드, 화면 도우미
const MTH = (() => {
  const URL_ = 'https://gpxmlgmxfxiaffhnxbjb.supabase.co';
  const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdweG1sZ214ZnhpYWZmaG54YmpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwNzA3MTAsImV4cCI6MjEwODY0NjcxMH0.pNZhFxAYAgovtAbOHiF6A9mz-MXSBn_bvHursPbZ-B4';
  const H = { apikey: ANON, Authorization: 'Bearer ' + ANON };

  async function rpc(fn, args = {}) {
    const res = await fetch(`${URL_}/rest/v1/rpc/${fn}`, {
      method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify(args)
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
    if (!res.ok) throw new Error((data && data.message) || '요청을 처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.');
    return data;
  }

  function uid() {
    return (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  }

  // 사진을 줄이고(최대 1600px) 필요하면 워터마크를 찍은 뒤 올림
  async function prepImage(file, stamp) {
    try {
      const bmp = await createImageBitmap(file);
      const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
      const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const cx = cv.getContext('2d');
      cx.drawImage(bmp, 0, 0, w, h);
      if (stamp) {
        const fs = Math.max(16, Math.round(w / 40));
        cx.font = `bold ${fs}px sans-serif`;
        const lines = stamp.split('\n');
        const pad = fs * 0.6, lh = fs * 1.3;
        const bw = Math.max(...lines.map(l => cx.measureText(l).width)) + pad * 2;
        const bh = lh * lines.length + pad;
        cx.fillStyle = 'rgba(0,0,0,0.55)';
        cx.fillRect(w - bw - pad, h - bh - pad, bw, bh);
        cx.fillStyle = '#fff';
        lines.forEach((l, i) => cx.fillText(l, w - bw, h - bh - pad + pad / 2 + lh * (i + 0.8)));
      }
      const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.85));
      if (blob) return { blob, type: 'image/jpeg', ext: 'jpg' };
    } catch (e) { /* 줄이기 실패 시 원본 사용 */ }
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    return { blob: file, type: file.type || 'image/jpeg', ext };
  }

  async function upload(folder, file, stamp) {
    const p = await prepImage(file, stamp);
    const path = `${folder}/${uid()}.${p.ext}`;
    const res = await fetch(`${URL_}/storage/v1/object/photos/${path}`, {
      method: 'POST', headers: { ...H, 'Content-Type': p.type, 'x-upsert': 'false' }, body: p.blob
    });
    if (!res.ok) throw new Error('사진을 올리지 못했습니다. 10MB 이하 사진인지 확인해 주세요.');
    return path;
  }

  const photoUrl = (path) => path ? (path.startsWith('http') ? path : `${URL_}/storage/v1/object/public/photos/${path}`) : '';
  const won = (n) => (n == null ? '-' : Number(n).toLocaleString('ko-KR') + '원');
  const man = (n) => (n == null ? '-' : (Math.round(n / 1000) / 10).toLocaleString('ko-KR') + '만 원');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dt = (s) => { if (!s) return ''; const d = new Date(s); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const stampNow = () => { const d = new Date(); return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

  function toast(msg) {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.className = 'show';
    clearTimeout(t._h); t._h = setTimeout(() => t.className = '', 2600);
  }

  async function busy(btn, fn) {
    if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = '처리 중…'; }
    try { return await fn(); }
    catch (e) { toast(e.message); throw e; }
    finally { if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label; } }
  }

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  };

  return { rpc, upload, photoUrl, won, man, esc, dt, stampNow, toast, busy, store, uid };
})();
