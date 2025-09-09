// copylink.js — ultra-short clean links + URL-only copy (no extra text)
(function(){
  // --- helpers ---
  function canonicalBase(){
    const c = document.querySelector('link[rel="canonical"]');
    const base = (c && c.href) ? c.href : (location.origin + location.pathname);
    try{ const u=new URL(base); u.search=""; u.hash=""; return u.toString(); }
    catch(_){ return base.split('#')[0].split('?')[0]; }
  }
  function pageType(){
    const p = location.pathname;
    if (p.includes('services')) return 'service';
    if (p.includes('shop')) return 'product';
    return 'page';
  }
  function slugify(str){
    return (str||'').toString()
      .normalize('NFKC').trim()
      .replace(/\s+/g,'-')
      .replace(/[^\p{L}\p{N}\u0E00-\u0E7F\-]+/gu,'')
      .replace(/-+/g,'-').replace(/^-|-$/g,'');
  }
  // 32-bit FNV-1a hash -> base62 (short)
  function hash32(str){
    let h = 0x811c9dc5>>>0;
    for(let i=0;i<str.length;i++){
      h ^= str.charCodeAt(i);
      h = (h + ((h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24)))>>>0; // *16777619
    }
    return h>>>0;
  }
  const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  function toBase62(num){
    if (num===0) return "0";
    let s=""; while(num>0){ s = BASE62[num%62] + s; num = Math.floor(num/62); }
    return s;
  }
  function shortCode(title){
    const s = slugify(title);
    return toBase62(hash32(s)).slice(0,6); // 6 chars is enough
  }
  function extractTitleFromContext(btn){
    const modal = btn.closest('.modal, [role="dialog"]');
    if (btn.dataset.title) return btn.dataset.title;
    if (modal){
      const t = modal.querySelector('.modal-title, .h5, h5, h4, h3');
      if (t) return (t.getAttribute('data-title')||t.textContent||'').trim();
    }
    const card = btn.closest('.card, .list-group-item, .item, .row, section');
    const head = card && (card.querySelector('[data-title], h1,h2,h3,h4,h5,h6'));
    return (head && (head.getAttribute('data-title')||head.textContent)||document.title||'').trim();
  }
  async function copyURL(url){
    try{ await navigator.clipboard.writeText(url); alert('คัดลอกลิงก์แล้ว'); }
    catch{ prompt('คัดลอกลิงก์นี้ด้วยตนเอง', url); }
  }

  // --- main click handler ---
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-copy-link], [data-copy-page], [data-copy-item]') ||
                (e.target.closest('button,a') && /คัดลอกลิงก์|คัดลอกลิงค์|Copy\s*Link/i.test(e.target.closest('button,a').textContent||'' ) ? e.target.closest('button,a') : null);
    if(!btn) return;
    e.preventDefault(); e.stopImmediatePropagation();

    const base = canonicalBase();
    const typ = pageType();
    if (typ === 'page') return copyURL(base);

    const title = extractTitleFromContext(btn);
    const code  = shortCode(title||'item');
    const key   = (typ==='service') ? 's' : 'p';
    const url   = `${base}?${key}=${code}`;
    return copyURL(url);
  }, true);

  // --- deep-link (optional): scroll when ?s= or ?p= present ---
  document.addEventListener('DOMContentLoaded', ()=>{
    const qs = new URLSearchParams(location.search);
    const code = qs.get('s') || qs.get('p');
    if (!code) return;
    const heads = Array.from(document.querySelectorAll('[data-title], h1,h2,h3,h4,h5,h6'));
    const hit = heads.find(el => shortCode(el.getAttribute('data-title') || el.textContent) === code);
    if (hit) { hit.scrollIntoView({behavior:'smooth', block:'center'}); }
  });
})();