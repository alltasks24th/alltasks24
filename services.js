// services.js — หน้า "บริการทั้งหมด"
import { getApps, getApp, initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const app = getApps().length ? getApp() : (window.firebaseConfig ? initializeApp(window.firebaseConfig) : null);
if (!app) console.warn("[services.js] Firebase app not found. Ensure firebase-init.js is loaded first.");
const db = app ? getFirestore(app) : null;

// ===== CONTACT & ปุ่มติดต่อ =====
function contactButtons(){
  const phone = (window.SITE_PHONE    || "").trim();
  const line  = (window.SITE_LINE_URL || "").trim();
  const fb    = (window.SITE_FB_URL   || "").trim();
  let html = "";
  if (phone) html += `<a href="tel:${phone}" class="btn btn-outline-success btn-sm"><i class="bi bi-telephone"></i> โทร</a>`;
  if (line)  html += `<a href="${line}" target="_blank" rel="noopener" class="btn btn-outline-success btn-sm"><i class="bi bi-chat-dots"></i> LINE</a>`;
  if (fb)    html += `<a href="${fb}" target="_blank" rel="noopener" class="btn btn-outline-primary btn-sm"><i class="bi bi-facebook"></i> Facebook</a>`;
  return html;
}

// ---- DOM refs ----
const listEl = document.getElementById("servicesList");
const modHost = document.getElementById("service-modals");
const qService = document.getElementById("qService");
const qCategory = document.getElementById("qCategory");
const btnClear = document.getElementById("btnClear");

const norm = (s) => (s || "").toString().trim().toLowerCase();
const coverFallback = "https://images.unsplash.com/photo-1487014679447-9f8336841d58?q=80&w=1400&auto=format&fit=crop";

let all = [];   // raw from Firestore

function tagsHtml(tags) {
  if (!Array.isArray(tags) || !tags.length) return "";
  return `<div class="mb-2">${tags.map(t => `<span class="badge bg-secondary me-1">${t}</span>`).join("")}</div>`;
}

function cardHtml(svc) {
  const { id, name, category, description, imageUrl, tags = [] } = svc;
  return `
    <div class="col-md-4">
      <div class="card card-clean h-100">
        ${imageUrl ? `<img src="${imageUrl}" class="svc-thumb" alt="">` : ``}
        <div class="card-body d-flex flex-column">
          <div class="d-flex align-items-center gap-2 mb-2">
            <div class="svc-icon"><i class="bi bi-stars"></i></div>
            <h5 class="mb-0">${name || ""}</h5>
          </div>
          <div class="text-muted small mb-1">${category || ""}</div>
          ${tagsHtml(tags)}
          <p class="text-muted flex-grow-1">${description || ""}</p>
          <button class="btn btn-primary mt-2"
                  data-bs-toggle="modal"
                  data-bs-target="#svc-${id}">ดูรายละเอียด</button>
        </div>
      </div>
    </div>
  `;
}

function modalHtml(svc) {
  const { id, name, category, description, tags = [], gallery = [] } = svc;
  const hasGal = Array.isArray(gallery) && gallery.length > 0;

  const gal = hasGal ? `
    <div id="gal-${id}" class="carousel slide mb-3" data-bs-ride="carousel">
      <div class="carousel-inner">
        ${gallery.map((u,i)=>`
          <div class="carousel-item ${i===0?'active':''}">
            <img src="${u}" class="d-block w-100" alt="ผลงาน">
          </div>`).join("")}
      </div>
      <button class="carousel-control-prev" type="button" data-bs-target="#gal-${id}" data-bs-slide="prev">
        <span class="carousel-control-prev-icon" aria-hidden="true"></span>
        <span class="visually-hidden">ก่อนหน้า</span>
      </button>
      <button class="carousel-control-next" type="button" data-bs-target="#gal-${id}" data-bs-slide="next">
        <span class="carousel-control-next-icon" aria-hidden="true"></span>
        <span class="visually-hidden">ถัดไป</span>
      </button>
    </div>` : "";

  const tagBlock = Array.isArray(tags) && tags.length
    ? `<div class="mt-2">${tags.map(t=>`<span class="badge bg-secondary me-1">${t}</span>`).join("")}</div>`
    : "";

  // ✅ เพิ่ม footer + ปุ่มติดต่อ
  return `
    <div class="modal fade" id="svc-${id}" tabindex="-1" aria-labelledby="svc-label-${id}" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 id="svc-label-${id}" class="modal-title">${name || ""}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="ปิด"></button>
          </div>
          <div class="modal-body">
            ${gal}
            <div class="text-muted small mb-2">${category || ""}</div>
            <p style="white-space:pre-line">${description || ""}</p>
            ${tagBlock}
          </div>
          <div class="modal-footer justify-content-start">
            <div class="d-flex gap-2 flex-wrap">
              ${contactButtons()}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function upsertModal(svc) {
  const exist = document.getElementById(`svc-${svc.id}`);
  const html = modalHtml(svc);
  if (exist) exist.outerHTML = html; else modHost.insertAdjacentHTML("beforeend", html);
}

// render list with filter
function applyAndRender() {
  const q = norm(qService?.value);
  const c = norm(qCategory?.value);
  const list = all.filter(it => {
    const okName = !q || norm(it.name).includes(q) || norm(it.description).includes(q);
    const okCat = !c || norm(it.category).includes(c);
    return okName && okCat;
  });
  listEl.innerHTML = "";
  list.forEach(svc => {
    if (!svc.imageUrl) svc.imageUrl = coverFallback;
    listEl.insertAdjacentHTML("beforeend", cardHtml(svc));
    upsertModal(svc);
  });
}

// subscribe Firestore
if (db) {
  onSnapshot(collection(db, "services"), snap => {
    all = [];
    snap.forEach(d => {
      const v = d.data() || {};
      all.push({
        id: d.id,
        name: v.name || "",
        category: v.category || "",
        description: v.description || "",
        imageUrl: v.imageUrl || coverFallback,
        tags: Array.isArray(v.tags) ? v.tags : [],
        gallery: Array.isArray(v.gallery) ? v.gallery : []
      });
    });
    applyAndRender();
  });
}

// filter events
[qService, qCategory].forEach(el => el && el.addEventListener("input", applyAndRender));
btnClear?.addEventListener("click", () => {
  if (qService) qService.value = "";
  if (qCategory) qCategory.value = "";
  applyAndRender();
});

// ---- Force-show modal + z-index fix ----
document.addEventListener("click", (e) => {
  const btn = e.target.closest('[data-bs-toggle="modal"][data-bs-target^="#svc-"]');
  if (!btn) return;
  const sel = btn.getAttribute("data-bs-target");
  const el = document.querySelector(sel);
  if (el && window.bootstrap?.Modal) {
    window.bootstrap.Modal.getOrCreateInstance(el).show();
    const car = el.querySelector(".carousel");
    if (car && window.bootstrap?.Carousel) {
      window.bootstrap.Carousel.getOrCreateInstance(car, { interval: 4000 });
    }
  }
}, true);

// ป้องกันโดนทับ/คลิป
const style = document.createElement("style");
style.textContent = `
  .modal{ z-index:1400 !important; }
  .modal-backdrop{ z-index:1300 !important; }
`;
document.head.appendChild(style);
