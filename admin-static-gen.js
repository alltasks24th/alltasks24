// admin-static-gen.js (assistant v36 - HOTFIX)
// Fix: bind UI immediately; defer Firebase init until user clicks; use dynamic imports

const $ = (sel) => document.querySelector(sel);
const log = (msg) => { const el = $("#sg-log"); if (el){ el.textContent += (msg + "\n"); el.scrollTop = el.scrollHeight; } };

// --- Modal controls (bind immediately) ---
const openBtn = document.getElementById('openStaticGen');
const closeBtn = document.getElementById('closeStaticGen');
const backdrop = document.getElementById('staticGenBackdrop');
openBtn?.addEventListener('click',()=>{ if(backdrop){backdrop.style.display='flex'; log('พร้อมใช้งาน Static Generator');} });
closeBtn?.addEventListener('click',()=>{ if(backdrop){backdrop.style.display='none';} });

// --- Helpers ---
function slugify(input) {
  return (String(input||"").toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ก-๙\s-]/g, ' ')
    .replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'item');
}
function pickVal(obj, keys = []) { for (const k of keys){ if (obj && obj[k] != null && String(obj[k]).trim() !== "") return obj[k]; } return null; }

async function ensureDb() {
  // dynamic imports to avoid early errors
  const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js');
  const { getFirestore } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
  let app = null;
  if (typeof firebase !== 'undefined' && firebase?.apps?.length) {
    app = firebase.apps[0];
  } else if (getApps().length) {
    app = getApps()[0];
  } else {
    if (typeof firebaseConfig === 'undefined') {
      throw new Error('ไม่พบตัวแปร firebaseConfig — ให้แน่ใจว่าโหลด firebase-init.js ก่อนสคริปต์นี้');
    }
    app = initializeApp(firebaseConfig);
  }
  return getFirestore(app);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines=3) {
  const words = String(text||'').split(/\s+/);
  let line = '', lines = 0;
  for (let n=0; n<words.length; n++) {
    const testLine = line + (line? ' ' : '') + words[n];
    const w = ctx.measureText(testLine).width;
    if (w > maxWidth && n>0) {
      ctx.fillText(line, x, y); y += lineHeight; lines += 1; line = words[n];
      if (lines >= maxLines-1) {
        let tail = '';
        for (let k=n; k<words.length; k++){
          const t = (tail? ' ' : '') + words[k];
          if (ctx.measureText(tail + t + '…').width > maxWidth) break;
          tail += t;
        }
        ctx.fillText(tail + '…', x, y); return;
      }
    } else { line = testLine; }
  }
  ctx.fillText(line, x, y);
}
function roundRect(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}
function loadImage(url) {
  return new Promise((resolve, reject)=>{
    const img = new Image(); img.crossOrigin = "anonymous";
    img.onload = () => resolve(img); img.onerror = reject; img.src = url;
  });
}

async function drawOgImage({title, subtitle, price, baseColor="#0EA5E9", accent="#F59E0B", bgImageUrl=null}) {
  const W=1200, H=630;
  const canvas = document.createElement('canvas'); canvas.width=W; canvas.height=H;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0,0,W,H); grad.addColorStop(0, baseColor); grad.addColorStop(1, "#1b263b");
  ctx.fillStyle = grad; ctx.fillRect(0,0,W,H);
  if (bgImageUrl) {
    try { const img = await loadImage(bgImageUrl); const s = Math.max(W/img.width, H/img.height);
      ctx.globalAlpha = 0.18; ctx.drawImage(img, (W-img.width*s)/2, (H-img.height*s)/2, img.width*s, img.height*s); ctx.globalAlpha = 1;
    } catch(e){ log('ภาพพื้นหลังโหลดไม่ได้: ' + e.message); }
  }
  ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fillRect(0,0,W,72);
  ctx.fillStyle = "#fff"; ctx.font = "700 38px system-ui, 'Noto Sans Thai', sans-serif"; ctx.fillText("AllTasks24", 40, 48);
  ctx.font = "800 72px system-ui, 'Noto Sans Thai', sans-serif"; wrapText(ctx, title||"บริการ/สินค้า", 40, 200, W-80, 80, 2);
  ctx.font = "500 36px system-ui, 'Noto Sans Thai', sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.92)"; wrapText(ctx, subtitle||"", 40, 300, W-80, 48, 3);
  if (price) { const pill = `เริ่ม ${price} บาท`; ctx.font = "700 40px system-ui, 'Noto Sans Thai', sans-serif";
    const tw = ctx.measureText(pill).width + 40; ctx.fillStyle = "#F59E0B"; roundRect(ctx, W - tw - 40, H - 100, tw, 56, 16); ctx.fill();
    ctx.fillStyle = "#0b1220"; ctx.fillText(pill, W - tw - 20, H - 62);
  }
  ctx.fillStyle = "rgba(255,255,255,0.14)"; ctx.fillRect(0, H-64, W, 64);
  ctx.fillStyle = "#fff"; ctx.font = "600 28px system-ui, 'Noto Sans Thai', sans-serif"; ctx.fillText("alltasks24.online", 40, H-24);
  return await new Promise(res => canvas.toBlob(b => res(b), "image/jpeg", 0.92));
}

// --- Builders ---
function buildServiceHTML(item, baseDomain, ogDir) {
  const name = pickVal(item, ['name','title']) || 'บริการ';
  const desc = pickVal(item, ['description','desc','detail']) || 'บริการจาก AllTasks24 ในพื้นที่ของคุณ';
  const price = pickVal(item, ['price','basePrice','startingPrice']);
  const area = pickVal(item, ['area','areaServed','province']) || 'นครสวรรค์';
  const img = pickVal(item, ['image','cover','thumbnail']) || null;
  const slug = item.slug || slugify(name);
  const og = (img && String(img).startsWith('http')) ? img : `${baseDomain}${ogDir}/${slug}-1200x630.jpg`;
  const url = `${baseDomain}/service/${slug}.html`;
  const metaDesc = `${desc}`.slice(0, 160);
  const offer = price ? `,"offers":{"@type":"Offer","price":"${price}","priceCurrency":"THB","availability":"https://schema.org/InStock"}` : "";
  const priceLine = price ? `<p><strong>ราคาเริ่มต้น:</strong> ${price} บาท</p>` : "";
  return `<!doctype html><html lang="th"><head><link rel="manifest" href="/icons/site.webmanifest">
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${name} | AllTasks24</title>
<meta name="description" content="${metaDesc}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:title" content="${name} | AllTasks24">
<meta property="og:description" content="${metaDesc}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${og}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${name} | AllTasks24">
<meta name="twitter:description" content="${metaDesc}">
<meta name="twitter:image" content="${og}">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Service","name":"${name}","areaServed":"${area}","provider":{"@type":"Organization","name":"AllTasks24","url":"${baseDomain}/"}${offer},"url":"${url}","description":"${metaDesc}"}</script>
</head><body>
<main style="max-width:860px;margin:24px auto;padding:0 16px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,'Noto Sans Thai',sans-serif">
  <h1 style="margin:.2em 0">${name}</h1>
  <p>${desc}</p>
  ${priceLine}
  <p><strong>พื้นที่ให้บริการ:</strong> ${area}</p>
  <p><a href="${baseDomain}/services.html">← กลับไปหน้าบริการทั้งหมด</a></p>
</main>
<script>if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(()=>{});}</script></body></html>`;
}
function buildProductHTML(item, baseDomain, ogDir) {
  const name = pickVal(item, ['name','title']) || 'สินค้า';
  const desc = pickVal(item, ['description','desc','detail']) || 'สินค้าแนะนำจาก AllTasks24';
  const price = pickVal(item, ['price','salePrice','regularPrice']);
  const img = pickVal(item, ['image','cover','thumbnail']) || null;
  const slug = item.slug || slugify(name);
  const og = (img && String(img).startsWith('http')) ? img : `${baseDomain}${ogDir}/${slug}-1200x630.jpg`;
  const url = `${baseDomain}/product/${slug}.html`;
  const metaDesc = `${desc}`.slice(0, 160);
  const offer = price ? `,"offers":{"@type":"Offer","price":"${price}","priceCurrency":"THB","availability":"https://schema.org/InStock"}` : "";
  const priceLine = price ? `<p><strong>ราคา:</strong> ${price} บาท</p>` : "";
  return `<!doctype html><html lang="th"><head><link rel="manifest" href="/icons/site.webmanifest">
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${name} | AllTasks24</title>
<meta name="description" content="${metaDesc}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="product">
<meta property="og:title" content="${name} | AllTasks24">
<meta property="og:description" content="${metaDesc}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${og}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${name} | AllTasks24">
<meta name="twitter:description" content="${metaDesc}">
<meta name="twitter:image" content="${og}">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"${name}"${offer},"url":"${url}","description":"${metaDesc}"}</script>
</head><body>
<main style="max-width:860px;margin:24px auto;padding:0 16px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,'Noto Sans Thai',sans-serif">
  <h1 style="margin:.2em 0">${name}</h1>
  <p>${desc}</p>
  ${priceLine}
  <p><a href="${baseDomain}/shop.html">← กลับไปหน้าสินค้าทั้งหมด</a></p>
</main>
<script>if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(()=>{});}</script></body></html>`;
}
function buildSitemap(baseDomain, pages=[]) {
  const urls = pages.map(u => `  <url><loc>${u}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

// --- Generators ---
async function fetchDocsOrWarn(colName) {
  try { return await (await import('https://cdn.skypack.dev/idb-keyval?min')).get(colName) || await (async ()=>{ const arr = await (await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js')).getDocs((await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js')).collection(await ensureDb(), colName)); const items = []; arr.forEach ? arr.forEach(d=>items.push({id:d.id,...d.data()})) : arr.forEach(d=>items.push(d)); return items; })(); }
  catch(e){ log(`✗ ต้องใช้ Firestore: ${colName} (${e.message})`); throw e; }
}

async function generate({ pages=true, og=false, sm=true }) {
  const base = ($("#sg-domain")?.value || "").replace(/\/+$/,'') || "https://alltasks24.online";
  const ogDir = $("#sg-ogdir")?.value || "/assets/og";
  const servicesCol = $("#sg-services-col")?.value || "services";
  const productsCol = $("#sg-products-col")?.value || "products";
  const wantOG = og || $("#sg-generate-og")?.checked;

  log("เริ่มสร้างไฟล์...");
  const zip = new JSZip();
  const serviceFolder = zip.folder("service");
  const productFolder = zip.folder("product");

  let services = [], products = [];
  try {
    services = await fetchDocsOrWarn(servicesCol);
    products = await fetchDocsOrWarn(productsCol);
  } catch(e) {
    log("⚠️ Firestore ยังไม่พร้อมหรือไม่ได้โหลด firebase-init.js");
    log("คุณยังสามารถกด Only sitemap ได้ก่อน");
  }

  const serviceUrls = []; const productUrls = [];

  if (pages && services.length + products.length > 0) {
    for (const item of services) {
      const name = pickVal(item, ['name','title']) || item.id;
      const slug = item.slug || slugify(name);
      serviceFolder.file(`${slug}.html`, buildServiceHTML(item, base, ogDir));
      serviceUrls.push(`${base}/service/${slug}.html`);
      log(`✓ Page: service/${slug}.html`);
    }
    for (const item of products) {
      const name = pickVal(item, ['name','title']) || item.id;
      const slug = item.slug || slugify(name);
      productFolder.file(`${slug}.html`, buildProductHTML(item, base, ogDir));
      productUrls.push(`${base}/product/${slug}.html`);
      log(`✓ Page: product/${slug}.html`);
    }
  }

  if (wantOG && services.length + products.length > 0) {
    // Generate OG images into assets/og/
    const folder = zip.folder(ogDir.replace(/^\//,''));
    const useItemImage = $("#sg-use-item-image")?.checked;
    for (const item of [...services, ...products]) {
      const name = pickVal(item, ['name','title']) || item.id;
      const desc = pickVal(item, ['description','desc','detail']) || '';
      const price = pickVal(item, ['price','basePrice','startingPrice','salePrice','regularPrice']);
      const slug = item.slug || slugify(name);
      const bgUrl = useItemImage ? (pickVal(item, ['image','cover','thumbnail']) || null) : null;
      const blob = await drawOgImage({ title:name, subtitle:desc, price, bgImageUrl:bgUrl });
      const buff = await blob.arrayBuffer();
      folder.file(`${slug}-1200x630.jpg`, buff);
      log(`✓ OG: ${slug}`);
    }
  }

  if (sm) {
    const core = [`${base}/`, `${base}/index.html`, `${base}/services.html`, `${base}/shop.html`, `${base}/promotions.html`, `${base}/reviews.html`];
    const smContent = buildSitemap(base, [...core, ...serviceUrls, ...productUrls]);
    zip.file("sitemap.xml", smContent);
    log("✓ sitemap.xml");
  }

  const blob = await zip.generateAsync({type:"blob"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "alltasks24-generated.zip"; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
  log("✓ เสร็จสิ้น");
}


async function generateOne(ridOrSlug) {
  const base = ($("#sg-domain")?.value || "").replace(/\/+$/,'') || "https://alltasks24.online";
  const ogDir = $("#sg-ogdir")?.value || "/assets/og";
  const servicesCol = $("#sg-services-col")?.value || "services";
  const productsCol = $("#sg-products-col")?.value || "products";
  const wantOG = $("#sg-generate-og")?.checked ?? true;
  const useItemImage = $("#sg-use-item-image")?.checked;

  if (!ridOrSlug) { log("กรุณากรอก ID หรือ slug"); return; }
  log("เริ่มสร้างเฉพาะรายการ: " + ridOrSlug);

  let services=[], products=[];
  try {
    services = await fetchDocsOrWarn(servicesCol);
    products = await fetchDocsOrWarn(productsCol);
  } catch(e) {
    log("✗ ต้องใช้ Firestore สำหรับ Generate This Item"); throw e;
  }

  const findBy = (arr) => arr.find(d => d.id === ridOrSlug || ((d.slug || slugify(pickVal(d,['name','title']) || d.id)) === ridOrSlug));

  let item = findBy(services); let type = 'service';
  if (!item) { item = findBy(products); type = item ? 'product' : null; }
  if (!item) { log("✗ ไม่พบรายการ: " + ridOrSlug); return; }

  const name = pickVal(item, ['name','title']) || item.id;
  const slug = item.slug || slugify(name);
  const zip = new JSZip();

  if (type === 'service') {
    zip.folder("service").file(`${slug}.html`, buildServiceHTML(item, base, ogDir));
    log(`✓ Page: service/${slug}.html`);
  } else {
    zip.folder("product").file(`${slug}.html`, buildProductHTML(item, base, ogDir));
    log(`✓ Page: product/${slug}.html`);
  }

  if (wantOG) {
    const folder = zip.folder(ogDir.replace(/^\//,''));
    const desc = pickVal(item, ['description','desc','detail']) || '';
    const price = pickVal(item, ['price','basePrice','startingPrice','salePrice','regularPrice']);
    const bgUrl = useItemImage ? (pickVal(item, ['image','cover','thumbnail']) || null) : null;
    const blob = await drawOgImage({ title:name, subtitle:desc, price, bgImageUrl:bgUrl });
    const buff = await blob.arrayBuffer();
    folder.file(`${slug}-1200x630.jpg`, buff);
    log(`✓ OG: ${slug}`);
  }

  const blob = await zip.generateAsync({type:"blob"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = `alltasks24-${type}-${slug}.zip`; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
  log("✓ เสร็จสิ้น (เฉพาะรายการ)");
}
// Bind action buttons
document.getElementById('sg-gen-all')?.addEventListener('click', ()=> generate({pages:true, og:true, sm:true}));
document.getElementById('sg-gen-pages')?.addEventListener('click', ()=> generate({pages:true, og:false, sm:false}));
document.getElementById('sg-gen-og')?.addEventListener('click', ()=> generate({pages:false, og:true, sm:false}));
document.getElementById('sg-gen-sitemap')?.addEventListener('click', ()=> generate({pages:false, og:false, sm:true}));
document.getElementById('sg-gen-one')?.addEventListener('click', ()=> {
  const v = document.getElementById('sg-one-id')?.value?.trim();
  if(!v){ log('กรุณากรอก ID หรือ slug'); return; }
  generateOne(v);
});

console.log('[Static Generator HOTFIX] ready');