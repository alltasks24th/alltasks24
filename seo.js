(function(){
  function upsert(selector, create){
    let el = document.head.querySelector(selector);
    if(!el){ el = create(); document.head.appendChild(el); }
    return el;
  }
  function setSEO(opts){
    opts = opts || {};
    const title = opts.title || document.title || 'AllTasks24';
    const desc  = opts.desc  || (document.querySelector('meta[name=description]')?.content) || 'รับจ้างสารพัด 24 ชั่วโมง — รวดเร็ว ปลอดภัย นัดเวลาได้ ติดต่อผ่าน LINE หรือโทรศัพท์';
    const image = opts.image || (location.origin + '/icons/android-chrome-512x512.png');
    const url   = opts.url   || location.href.split('#')[0];
    const type  = opts.type  || 'website';

    document.title = title;
    upsert('meta[name=description]', ()=>{ const m = document.createElement('meta'); m.setAttribute('name','description'); return m; }).setAttribute('content', desc);
    upsert('link[rel=canonical]', ()=>{ const l=document.createElement('link'); l.setAttribute('rel','canonical'); return l; }).setAttribute('href', url);

    function setProp(p,v){ upsert(`meta[property="${p}"]`, ()=>{ const m=document.createElement('meta'); m.setAttribute('property', p); return m; }).setAttribute('content', v); }
    function setName(n,v){ upsert(`meta[name="${n}"]`, ()=>{ const m=document.createElement('meta'); m.setAttribute('name', n); return m; }).setAttribute('content', v); }

    setProp('og:title', title); setProp('og:description', desc); setProp('og:image', image);
    setProp('og:url', url); setProp('og:type', type); setProp('og:site_name', 'AllTasks24');
    setName('twitter:card', 'summary_large_image'); setName('twitter:title', title);
    setName('twitter:description', desc); setName('twitter:image', image);
  }
  window.setSEO = setSEO;
})();