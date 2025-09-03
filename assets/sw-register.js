// Auto SW register (safe, idempotent)
(function(){
  if (!('serviceWorker' in navigator)) return;
  var already = document.documentElement.getAttribute('data-sw-reg');
  if (already) return;
  document.documentElement.setAttribute('data-sw-reg', '1');
  window.addEventListener('load', function(){
    var swUrl = '/sw.js';
    navigator.serviceWorker.register(swUrl).catch(function(err){
      console.warn('SW register failed:', err);
    });
  });
})();