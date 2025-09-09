// copylink.js — canonical-friendly copy/share; use pretty slug query (?s=... / ?p=...)
(function(){
  function canonicalBase(){
    const c = document.querySelector('link[rel="canonical"]');
    const base = (c && c.href) ? c.href : (location.origin + location.pathname);
    try{ const u=new URL(base); u.search=""; u.hash=""; return u.toString(); }
    catch(_){ return base.split('#')[0].split('?')[0]; }
  }

  function slugify(str){
    return (str||'').toString()
      .normalize('NFKC')
      .trim()
      .replace(/\s+/g,'-')
      .replace(/[^\p{L}\p{N}\u0E00-\u0E7F\-]+/gu,'') // keep letters, numbers, Thai, hyphen
      .replace(/-+/g,'-')
      .replace(/^-|-$/g,'');
  }

  function pageType(){
    const p = location.pathname;
    if (p.includes('services')) return 'service';
    if (p.includes('shop')) return 'product';
    return 'page';
  }

  async function copy(text, notify){
    try{
      await navigator.clipboard.writeText(text);
      if (notify) alert(notify);
    }catch{
      prompt('คัดลอกลิงก์นี้ด้วยตนเอง', text);
    }
  }

  async function doShare(url, title, desc){
    const text = (title?title+'\n':'') + (desc?desc+'\n':'') + url;
    if (navigator.share){ try{ await navigator.share({title, text, url}); return; }catch{} }
    await copy(url, 'คัดลอกลิงก์แล้ว');
  }

  function extractTitleFromContext(btn){
    const modal = btn.closest('.modal, [role="dialog"]');
    if (btn.dataset.title) return btn.dataset.title;
    if (modal){ const t = modal.querySelector('.modal-title'); if (t) return t.textContent.trim(); }
    // fallback: card/list item heading
    const box = btn.closest('.card, .list-group-item, .item, .row, section');
    const head = box && (box.querySelector('h1,h2,h3,h4,h5,h6') || box.querySelector('[data-title]'));
    if (head) return (head.getAttribute('data-title')||head.textContent||'').trim();
    return document.title || '';
  }

  document.addEventListener('click', function(e){
    const btn = e.target.closest('[data-copy-link], [data-copy-page], [data-copy-item]') ||
                (e.target.closest('button,a') && /คัดลอกลิงก์|คัดลอกลิงค์|Copy\s*Link/i.test(e.target.closest('button,a').textContent||'' ) ? e.target.closest('button,a') : null);
    if(!btn) return;
    e.preventDefault(); e.stopImmediatePropagation();

    const base = canonicalBase();
    const typ  = pageType();

    if (typ === 'page'){
      return doShare(base, document.title || '', document.querySelector('meta[name=description]')?.content || '');
    }

    // service/product: use pretty slug query
    const title = extractTitleFromContext(btn);
    const slug  = slugify(title || 'item');
    const key   = (typ === 'service') ? 's' : 'p';
    const url   = `${base}?${key}=${encodeURIComponent(slug)}`;
    const desc  = btn.dataset.desc || document.querySelector('meta[name=description]')?.content || '';
    return doShare(url, title, desc);
  }, true);

  // Optional: deep-link helper (non-blocking). On load, if ?s= or ?p= is present, scroll to the card/title.
  document.addEventListener('DOMContentLoaded', () => {
    const q = new URLSearchParams(location.search);
    const slug = q.get('s') || q.get('p');
    if (!slug) return;
    const targets = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6,[data-title]'));
    const hit = targets.find(el => slugify(el.getAttribute('data-title') || el.textContent) === slug);
    if (hit) { hit.scrollIntoView({behavior:'smooth', block:'center'}); }
  });
})();