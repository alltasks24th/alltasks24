(function(){
  const FDL_DOMAIN = window.FDL_DOMAIN || 'https://alltasks24.page.link';
  const API_KEY = (window.firebaseConfig && window.firebaseConfig.apiKey) || 'YOUR_FIREBASE_API_KEY';
  const trim = (s,n)=> (s||'').replace(/\s+/g,' ').trim().slice(0,n||999);

  async function createFDL({link, title, desc, image}){
    const body = { dynamicLinkInfo:{ domainUriPrefix: FDL_DOMAIN, link,
      socialMetaTagInfo:{ socialTitle: trim(title,70), socialDescription: trim(desc,180), socialImageLink: image || (location.origin + '/icons/android-chrome-512x512.png') } },
      suffix:{ option:'SHORT' } };
    const r = await fetch(`https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=${API_KEY}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const j = await r.json(); if(!j.shortLink) throw new Error(j.error?.message || 'FDL failed'); return j.shortLink;
  }
  async function shareNow({url, title, desc}){
    const text = `${title}\n${desc?desc+'\n':''}${url}`;
    if (navigator.share) return navigator.share({title, text, url});
    await navigator.clipboard.writeText(text); alert('คัดลอกข้อความ+ลิงก์แล้ว');
  }
  async function shareItem(el, type){
    const id = el.dataset.id, title = el.dataset.title || (type==='service'?'บริการ':'สินค้า'), desc = el.dataset.desc || '', image = el.dataset.img || '';
    const link = `${location.origin}/${type==='service'?'services':'shop'}.html#${encodeURIComponent(id)}`;
    const cacheKey = `fdl_${type}_${id}`;
    try{ const cache = JSON.parse(localStorage.getItem(cacheKey)||'{}'); if (cache.url && (Date.now()-cache.ts < 7*24*3600e3)) return shareNow({url:cache.url,title,desc}); }catch{}
    const url = await createFDL({link, title, desc, image}); localStorage.setItem(cacheKey, JSON.stringify({url, ts:Date.now()})); return shareNow({url, title, desc});
  }
  document.addEventListener('click', (e)=>{
    const svc = e.target.closest('[data-share-service]'); if (svc) { e.preventDefault(); shareItem(svc,'service').catch(console.error); return; }
    const prod = e.target.closest('[data-share-product]'); if (prod) { e.preventDefault(); shareItem(prod,'product').catch(console.error); return; }
  });
  window.shareItemFDL = (item)=>{
    const link = `${location.origin}/${item.type==='product'?'shop':'services'}.html#${encodeURIComponent(item.id)}`;
    return createFDL({link, title:item.title, desc:item.desc, image:item.image}).then(url=>shareNow({url, title:item.title, desc:item.desc}));
  };
})();