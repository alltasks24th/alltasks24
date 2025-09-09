// share.js — robust sharing with graceful fallback if Firebase Dynamic Links is unavailable/deprecated
(function(){
  const FDL_DOMAIN = window.FDL_DOMAIN || 'https://alltasks24.page.link'; // set your FDL domain if still active
  const API_KEY = (window.firebaseConfig && window.firebaseConfig.apiKey) || 'YOUR_FIREBASE_API_KEY';

  const trim = (s,n)=> (s||'').replace(/\s+/g,' ').trim().slice(0,n||999);
  const safeAbs = (src)=> src && /^https?:\/\//i.test(src) ? src : (location.origin + (src?.startsWith('/')?src:('/'+(src||''))));

  async function createFDL({link, title, desc, image}){
    // Short-circuit if no API key or FDL domain looks disabled
    if (!API_KEY || /YOUR_FIREBASE_API_KEY/.test(API_KEY)) throw new Error('FDL API key not configured');
    if (!FDL_DOMAIN || /deprecated|shutdown/i.test(String(FDL_DOMAIN))) throw new Error('FDL disabled');
    const body = {
      dynamicLinkInfo:{
        domainUriPrefix: FDL_DOMAIN,
        link,
        socialMetaTagInfo:{
          socialTitle: trim(title,70),
          socialDescription: trim(desc,180),
          socialImageLink: safeAbs(image) || safeAbs('/icons/android-chrome-512x512.png')
        }
      },
      suffix:{ option:'SHORT' }
    };
    const res = await fetch(`https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=${API_KEY}`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`FDL HTTP ${res.status}`);
    const j = await res.json();
    if(!j.shortLink) throw new Error(j.error?.message || 'FDL failed');
    return j.shortLink;
  }

  async function shareNativeOrCopy(url, title, desc, notifyFallback){
    const text = `${title}\n${desc?trim(desc,180)+'\n':''}${url}`;
    if (navigator.share) {
      try { await navigator.share({title, text, url}); return; } catch(e){ /* ignore */ }
    }
    try {
      await navigator.clipboard.writeText(text);
      alert(notifyFallback || 'คัดลอกข้อความ+ลิงก์แล้ว');
    } catch {
      prompt('คัดลอกลิงก์นี้ด้วยตนเอง', text);
    }
  }

  async function shareItem(el, type){
    const id = el.dataset.id || '';
    const title = el.dataset.title || (type==='service'?'บริการ':'สินค้า');
    const desc  = el.dataset.desc  || '';
    const image = el.dataset.img   || '/icons/android-chrome-512x512.png';
    const link  = `${location.origin}/${type==='service'?'services':'shop'}.html#${encodeURIComponent(id)}`;
    const cacheKey = `fdl_${type}_${id}`;

    // Try cache
    try {
      const cache = JSON.parse(localStorage.getItem(cacheKey)||'{}');
      if (cache.url && (Date.now()-cache.ts < 7*24*3600e3)) {
        return shareNativeOrCopy(cache.url, title, desc);
      }
    } catch {}

    // Try FDL else fallback
    try {
      const url = await createFDL({link, title, desc, image});
      localStorage.setItem(cacheKey, JSON.stringify({url, ts: Date.now()}));
      return shareNativeOrCopy(url, title, desc);
    } catch (e){
      // Fallback gracefully to original link
      console.warn('FDL unavailable → fallback to normal link:', e?.message || e);
      return shareNativeOrCopy(link, title, desc, 'คัดลอกข้อความ+ลิงก์แล้ว (ใช้ลิงก์ปกติแทน)');
    }
  }

  document.addEventListener('click', (e)=>{
    const svc = e.target.closest('[data-share-service]');
    if (svc) { e.preventDefault(); shareItem(svc,'service'); return; }
    const prod = e.target.closest('[data-share-product]');
    if (prod) { e.preventDefault(); shareItem(prod,'product'); return; }
  });

  // Export for manual calls
  window.shareItemFDL = (item)=>{
    const link = `${location.origin}/${item.type==='product'?'shop':'services'}.html#${encodeURIComponent(item.id)}`;
    return createFDL({link, title:item.title, desc:item.desc, image:item.image})
      .then(url=>shareNativeOrCopy(url, item.title, item.desc))
      .catch(()=>shareNativeOrCopy(link, item.title, item.desc, 'คัดลอกลิงก์ปกติแล้ว'));
  };
})();