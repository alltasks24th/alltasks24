/* seo-boost.js
 * Add JSON-LD (WebSite, LocalBusiness, ItemList, Service/Product Detail)
 * + set canonical for ?svc / ?prod + support async-rendered content
 */
(function(){
  var ORIGIN = (location && location.origin) ? location.origin : 'https://alltasks24.online';

  function injectJSONLD(id, data){
    try{
      var json = JSON.stringify(data);
      var s = document.getElementById(id);
      if(!s){
        s = document.createElement('script');
        s.type = 'application/ld+json';
        s.id = id;
        document.head.appendChild(s);
      }
      s.textContent = json;
    }catch(_){}
  }

  function upsertCanonical(url){
    try{
      var link = document.querySelector('link[rel="canonical"]');
      if(!link){
        link = document.createElement('link');
        link.rel = 'canonical';
        document.head.appendChild(link);
      }
      link.href = url;
    }catch(_){}
  }

  function txt(root, sel){
    var el = root && root.querySelector ? root.querySelector(sel) : null;
    return el ? (el.textContent || '').trim() : '';
  }
  function img(root){
    var el = root && root.querySelector ? root.querySelector('img') : null;
    if(!el) return '';
    return el.src || el.getAttribute('data-src') || '';
  }

  function upsertWebSiteSchema(){
    injectJSONLD('ld-website', {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "AllTasks24",
      "url": ORIGIN + "/",
      "potentialAction": {
        "@type": "SearchAction",
        "target": ORIGIN + "/services.html?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    });
  }

  function upsertOrgSchema(){
    var sameAs = [];
    if (window.SITE_FB_URL) sameAs.push(window.SITE_FB_URL);
    if (window.SITE_LINE_URL) sameAs.push(window.SITE_LINE_URL);
    injectJSONLD('ld-org', {
      "@context":"https://schema.org",
      "@type":"LocalBusiness",
      "name":"AllTasks24",
      "url": ORIGIN + "/",
      "telephone": (window.SITE_PHONE || ""),
      "sameAs": sameAs
    });
  }

  function listSchema(items){
    return {
      "@context":"https://schema.org",
      "@type":"ItemList",
      "itemListElement": items.map(function(it, i){ return {
        "@type":"ListItem",
        "position": i+1,
        "url": it.url,
        "name": it.name,
        "image": it.image || undefined,
        "description": it.description || undefined
      };})
    };
  }

  function buildServicesList(){
    var cards = Array.prototype.slice.call(document.querySelectorAll('.service-card, [data-kind="service"]'));
    if(cards.length===0) return;
    var items = cards.map(function(card){
      var id = (card.id || '').replace(/^service-/,'') || card.getAttribute('data-id') || '';
      var name = txt(card, '.card-title, .title, h3, h4, h5') || document.title;
      var description = txt(card, '.card-text, .desc, p');
      var image = img(card);
      var url = ORIGIN + location.pathname + (id ? ('?svc=' + encodeURIComponent(id)) : '');
      return {name: name, description: description, image: image, url: url};
    });
    injectJSONLD('ld-services-list', listSchema(items));
  }

  function buildProductsList(){
    var cards = Array.prototype.slice.call(document.querySelectorAll('.product-card, .shop-card, [data-kind="product"]'));
    if(cards.length===0) return;
    var items = cards.map(function(card){
      var id = (card.id || '').replace(/^product-/,'') || card.getAttribute('data-id') || '';
      var name = txt(card, '.card-title, .title, h3, h4, h5') || document.title;
      var description = txt(card, '.card-text, .desc, p');
      var image = img(card);
      var url = ORIGIN + location.pathname + (id ? ('?prod=' + encodeURIComponent(id)) : '');
      return {name: name, description: description, image: image, url: url};
    });
    injectJSONLD('ld-products-list', listSchema(items));
  }

  function buildServiceDetailFromParam(id){
    var url = ORIGIN + location.pathname + ('?svc=' + encodeURIComponent(id));
    upsertCanonical(url);

    var card = document.getElementById('service-'+id)
      || document.querySelector('.service-card[data-id="'+CSS.escape(id)+'"]');
    var name = card ? (txt(card,'.card-title, .title, h3, h4, h5') || document.title) : document.title;
    var description = card ? txt(card,'.card-text, .desc, p') : '';
    var image = card ? img(card) : '';

    injectJSONLD('ld-service-detail', {
      "@context":"https://schema.org",
      "@type":"Service",
      "name": name,
      "description": description,
      "serviceType": name,
      "provider": { "@type":"LocalBusiness", "name":"AllTasks24", "telephone": (window.SITE_PHONE||"") },
      "areaServed": { "@type":"AdministrativeArea", "name":"Nakhon Sawan" },
      "url": url,
      "image": image || undefined
    });
  }

  function buildProductDetailFromParam(id){
    var url = ORIGIN + location.pathname + ('?prod=' + encodeURIComponent(id));
    upsertCanonical(url);

    var sel = '.product-card[data-id="'+CSS.escape(id)+'"], .shop-card[data-id="'+CSS.escape(id)+'"]';
    var card = document.getElementById('product-'+id) || document.querySelector(sel);
    var name = card ? (txt(card,'.card-title, .title, h3, h4, h5') || document.title) : document.title;
    var description = card ? txt(card,'.card-text, .desc, p') : '';
    var image = card ? img(card) : '';
    var price = card ? (card.getAttribute('data-price') || '') : '';
    if(!price && card){
      var m = (txt(card,'.price, .product-price') || '').match(/([\d,.]+)/);
      price = m ? m[1].replace(/,/g,'') : '';
    }

    var data = {
      "@context":"https://schema.org",
      "@type":"Product",
      "name": name,
      "description": description,
      "image": image || undefined,
      "brand": { "@type":"Brand", "name":"AllTasks24" },
      "url": url
    };
    if(price){
      data.offers = { "@type":"Offer", "priceCurrency":"THB", "price": price, "availability":"https://schema.org/InStock" };
    }
    injectJSONLD('ld-product-detail', data);
  }

  function detectPage(){
    var p = (location.pathname || '').toLowerCase();
    if(p.indexOf('services')>=0) return 'services';
    if(p.indexOf('shop')>=0) return 'shop';
    return 'other';
  }

  function init(){
    var page = detectPage();
    upsertWebSiteSchema();
    upsertOrgSchema();

    if(page==='services') buildServicesList();
    if(page==='shop') buildProductsList();

    var obs = new MutationObserver(function(){
      if(page==='services') buildServicesList();
      if(page==='shop') buildProductsList();
    });
    obs.observe(document.body, {childList:true, subtree:true});

    var q = new URLSearchParams(location.search);
    if(q.get('svc')) buildServiceDetailFromParam(q.get('svc'));
    if(q.get('prod')) buildProductDetailFromParam(q.get('prod'));
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  }else{
    init();
  }
})();
