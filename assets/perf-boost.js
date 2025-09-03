// Perf boost: lazy-load non-critical images; set LCP priority
(function(){
  function onReady(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  onReady(function(){
    var imgs = Array.prototype.slice.call(document.images||[]);
    if (imgs.length){
      // heuristics: first large image as LCP
      var lcp = imgs[0];
      if (lcp){
        if (!lcp.hasAttribute('fetchpriority')) lcp.setAttribute('fetchpriority','high');
        if (!lcp.hasAttribute('loading')) lcp.setAttribute('loading','eager');
        if (!lcp.hasAttribute('decoding')) lcp.setAttribute('decoding','async');
      }
    }
    imgs.forEach(function(img, idx){
      if (idx===0) return; // skip the first (likely hero)
      if (!img.hasAttribute('loading')) img.setAttribute('loading','lazy');
      if (!img.hasAttribute('decoding')) img.setAttribute('decoding','async');
    });
  });
})();