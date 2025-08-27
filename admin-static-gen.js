// admin-static-gen.js (assistant v36 - advanced)
// Generates static detail pages + OG images + sitemap.xml from Firestore collections

import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";

function ensureApp() {
  if (typeof firebase !== 'undefined' && firebase?.apps?.length) return firebase.apps[0];
  if (getApps().length) return getApps()[0];
  if (typeof firebaseConfig === 'undefined') console.warn('firebaseConfig not found; ensure firebase-init.js is loaded.');
  return initializeApp(firebaseConfig || {});
}
const app = ensureApp();
const db = getFirestore(app);

const $ = (sel) => document.querySelector(sel);
const log = (msg) => { const el = $("#sg-log"); if (el){ el.textContent += (msg + "\n"); el.scrollTop = el.scrollHeight; } };

function slugify(input) {
  return (String(input||"").toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ก-๙\s-]/g, ' ')
    .replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'item');
}
function pickVal(obj, keys = []) { for (const k of keys){ if (obj && obj[k] != null && String(obj[k]).trim() !== "") return obj[k]; } return null; }

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines=3) {
  const words = String(text||'').split(/\s+/);
  let line = '', lines = 0;
  for (let n=0; n<words.length; n++) {
    const testLine = line + (line? ' ' : '') + words[n];
    const m = ctx.measureText(testLine).width;
    if (m > maxWidth && n>0) {
      ctx.fillText(line, x, y); y += lineHeight; lines += 1;
      line = words[n];
      if (lines >= maxLines-1) { // last line with ellipsis
        let l = '';
        for (let k=n; k<words.length; k++){
          const t = (l? ' ' : '') + words[k];
          if (ctx.measureText(l + t + '…').width > maxWidth) break;
          l += t;
        }
        ctx.fillText(l + '…', x, y);
        return;
      }
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

async function drawOgImage({title, subtitle, price, baseColor="#0EA5E9", accent="#F59E0B", bgImageUrl=null}) {
  const W=1200, H=630;
  const canvas = document.createElement('canvas'); canvas.width=W; canvas.height=H;
  const ctx = canvas.getContext('2d');

  // background
  const grad = ctx.createLinearGradient(0,0,W,H);
  grad.addColorStop(0, baseColor);
  grad.addColorStop(1, "#1b263b");
  ctx.fillStyle = grad; ctx.fillRect(0,0,W,H);

  // optional bg image
  if (bgImageUrl) {
    try {
      const img = await loadImage(bgImageUrl);
      const scale = Math.max(W/img.width, H/img.height);
      const iw = img.width*scale, ih = img.height*scale;
      ctx.globalAlpha = 0.18;
      ctx.drawImage(img, (W-iw)/2, (H-ih)/2, iw, ih);
      ctx.globalAlpha = 1;
    } catch(e){ log('ภาพพื้นหลังโหลดไม่ได้: ' + e.message); }
  }

  // header bar
  ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fillRect(0,0,W,72);

  // brand text
  ctx.fillStyle = "#fff"; ctx.font = "700 38px system-ui, 'Noto Sans Thai', sans-serif";
  ctx.fillText("AllTasks24", 40, 48);

  // title
  ctx.font = "800 72px system-ui, 'Noto Sans Thai', sans-serif";
  wrapText(ctx, title||"บริการ/สินค้า", 40, 200, W-80, 80, 2);

  // subtitle
  ctx.font = "500 36px system-ui, 'Noto Sans Thai', sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  wrapText(ctx, subtitle||"", 40, 300, W-80, 48, 3);

  // price pill
  if (price) {
    const pill = `เริ่ม ${price} บาท`;
    ctx.font = "700 40px system-ui, 'Noto Sans Thai', sans-serif";
    const tw = ctx.measureText(pill).width + 40;
    ctx.fillStyle = accent;
    roundRect(ctx, W - tw - 40, H - 100, tw, 56, 16); ctx.fill();
    ctx.fillStyle = "#0b1220"; ctx.fillText(pill, W - tw - 20, H - 62);
  }

  // footer
  ctx.fillStyle = "rgba(255,255,255,0.14)"; ctx.fillRect(0, H-64, W, 64);
  ctx.fillStyle = "#fff"; ctx.font = "600 28px system-ui, 'Noto Sans Thai', sans-serif";
  ctx.fillText("alltasks24.online", 40, H-24);

  return await new Promise(res => canvas.toBlob(b => res(b), "image/jpeg", 0.92));
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
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

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

  return `<!doctype html><html lang="th"><head>
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
</body></html>`;
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

  return `<!doctype html><html lang="th"><head>
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
</body></html>`;
}

function buildSitemap(baseDomain, pages=[]) {
  const urls = pages.map(u => `  <url><loc>${u}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`).join("\\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

async function fetchCollection(colName) {
  try {
    const snap = await getDocs(collection(db, colName));
    const items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    log(`โหลด ${colName}: ${items.length} รายการ`);
    return items;
  } catch (e) {
    log(`✗ ดึง ${colName} ไม่ได้: ${e.message}`);
    return [];
  }
}

async function generateOgZip(items, base, ogDir, type="service") {
  const zip = new JSZip();
  const folder = zip.folder(ogDir.replace(/^\\//,'')); // strip leading slash for zip path
  const useItemImage = $("#sg-use-item-image")?.checked;
  for (const item of items) {
    const name = pickVal(item, ['name','title']) || item.id || (type==='service'?'บริการ':'สินค้า');
    const desc = pickVal(item, ['description','desc','detail']) || (type==='service'?'บริการจาก AllTasks24':'สินค้าแนะนำจาก AllTasks24');
    const price = pickVal(item, ['price','basePrice','startingPrice','salePrice','regularPrice']);
    const slug = item.slug || slugify(name);
    const bgUrl = useItemImage ? (pickVal(item, ['image','cover','thumbnail']) || null) : null;
    const blob = await drawOgImage({ title:name, subtitle:desc, price, bgImageUrl:bgUrl });
    const arrBuff = await blob.arrayBuffer();
    folder.file(`${slug}-1200x630.jpg`, arrBuff);
    log(`✓ OG: ${type}/${slug}`);
  }
  return zip;
}

async function generatePagesZIP({doPages=true, doOG=false, doSM=true}) {
  const base = ($("#sg-domain")?.value || "").replace(/\/+$/,'') || "https://alltasks24.online";
  const ogDir = $("#sg-ogdir")?.value || "/assets/og";
  const servicesCol = $("#sg-services-col")?.value || "services";
  const productsCol = $("#sg-products-col")?.value || "products";
  const alsoOG = doOG || $("#sg-generate-og")?.checked;

  log("เริ่มสร้างไฟล์...");
  const zip = new JSZip();
  const serviceFolder = zip.folder("service");
  const productFolder = zip.folder("product");

  // Fetch data
  const [services, products] = await Promise.all([fetchCollection(servicesCol), fetchCollection(productsCol)]);

  const serviceUrls = []; const productUrls = [];

  if (doPages) {
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

  if (alsoOG) {
    const ogZipServices = await generateOgZip(services, base, ogDir + (ogDir.endsWith('/')?'':'/') , "service");
    const ogZipProducts = await generateOgZip(products, base, ogDir + (ogDir.endsWith('/')?'':'/') , "product");
    // merge into main zip under assets/og
    await Promise.all(Object.keys(ogZipServices.files).map(async (name)=>{
      if (ogZipServices.files[name].dir) return;
      const buff = await ogZipServices.files[name].async("arraybuffer");
      zip.file(name, buff);
    }));
    await Promise.all(Object.keys(ogZipProducts.files).map(async (name)=>{
      if (ogZipProducts.files[name].dir) return;
      const buff = await ogZipProducts.files[name].async("arraybuffer");
      zip.file(name, buff);
    }));
  }

  if (doSM) {
    const core = [`${base}/`, `${base}/index.html`, `${base}/services.html`, `${base}/shop.html`, `${base}/promotions.html`, `${base}/reviews.html`];
    const sm = buildSitemap(base, [...core, ...serviceUrls, ...productUrls]);
    zip.file("sitemap.xml", sm);
    log("✓ sitemap.xml");
  }

  const blob = await zip.generateAsync({type:"blob"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "alltasks24-generated.zip";
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
  log("✓ เสร็จสิ้น");
}

// Modal controls & actions
const openBtn = document.getElementById('openStaticGen');
const closeBtn = document.getElementById('closeStaticGen');
const backdrop = document.getElementById('staticGenBackdrop');
openBtn?.addEventListener('click',()=>{ backdrop.style.display = 'flex'; });
closeBtn?.addEventListener('click',()=>{ backdrop.style.display = 'none'; });

document.getElementById('sg-gen-all')?.addEventListener('click', ()=> generatePagesZIP({doPages:true, doOG:true, doSM:true}));
document.getElementById('sg-gen-pages')?.addEventListener('click', ()=> generatePagesZIP({doPages:true, doOG:false, doSM:false}));
document.getElementById('sg-gen-og')?.addEventListener('click', ()=> generatePagesZIP({doPages:false, doOG:true, doSM:false}));
document.getElementById('sg-gen-sitemap')?.addEventListener('click', ()=> generatePagesZIP({doPages:false, doOG:false, doSM:true}));

console.log('[Static Generator Advanced] ready');