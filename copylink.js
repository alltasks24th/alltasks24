// copylink.js — canonical-friendly copy/share for SEO
(function(){
  function getCanonicalURL(){
    const c = document.querySelector('link[rel="canonical"]');
    const base = (c && c.href) ? c.href : (location.origin + location.pathname);
    try{
      const u = new URL(base);
      u.search = ""; u.hash = "";
      return u.toString();
    }catch(_){ return base.split('#')[0].split('?')[0]; }
  }

  function getItemIdFromModal(el){
    // walk up to modal element
    const modal = el.closest('.modal, [role="dialog"]');
    if(!modal) return null;
    // prefer data-id
    const did = modal.getAttribute('data-id') || modal.dataset?.id;
    if (did) return did;
    // else fallback to element id without prefixes
    const mid = modal.getAttribute('id') || '';
    return mid ? mid.replace(/^(svc-|prod-|modal-)/,'') : null;
  }

  async function copy(text, notify){
    try{
      await navigator.clipboard.writeText(text);
      if (notify) alert(notify);
    }catch{
      prompt('คัดลอกลิงก์นี้ด้วยตนเอง', text);
    }
  }

  async function handleCopyClick(target){
    const base = getCanonicalURL();
    // item link only if we can find an id; otherwise page link
    const id = target.dataset.id || getItemIdFromModal(target);
    const url = id ? `${base}#${encodeURIComponent(id)}` : base;
    const title = (target.dataset.title || document.title || '').trim();
    const desc  = (target.dataset.desc || document.querySelector('meta[name=description]')?.content || '').trim();

    if (navigator.share){
      try{ await navigator.share({title, text: (desc?desc+'\n':'' ) + url, url}); return; }catch{ /* fallback below */ }
    }
    await copy(url, 'คัดลอกลิงก์แล้ว');
  }

  // Capture early and override any old handlers
  document.addEventListener('click', function(e){
    const btn = e.target.closest('[data-copy-link], [data-copy-page], [data-copy-item]');
    // heuristic: also handle button with text 'คัดลอกลิงก์'
    const labelBtn = e.target.closest('button, a');
    const looksLikeCopy = labelBtn && /คัดลอกลิงก์|คัดลอกลิงค์|Copy\s*Link/i.test(labelBtn.textContent||'');
    if (btn || looksLikeCopy){
      e.preventDefault(); e.stopImmediatePropagation();
      handleCopyClick(btn || labelBtn);
    }
  }, true);
})();