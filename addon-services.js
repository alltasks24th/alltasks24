// addon-services.js — ไม่แตะ public.js เดิม, แค่ "เสริม" ปุ่ม + โมดอล + สไลด์ + ป้ายกำกับ
import { getApps, initializeApp, getApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// ใช้แอป Firebase เดิม ถ้ามีอยู่แล้ว
let app = getApps().length ? getApp() : null;
// ถ้าระบบของคุณประกาศ firebaseConfig ไว้ในสโคป global และยังไม่มี app, จะลอง init
if (!app && typeof window !== "undefined" && window.firebaseConfig) {
  app = initializeApp(window.firebaseConfig);
}
if (!app) {
  console.warn("[addon-services] No Firebase app found. Ensure public.js initializes Firebase before this file.");
}

const db = app ? getFirestore(app) : null;

// ยูทิล: หาชื่อบริการจากการ์ด (พยายามอ่านจาก h5, .card-title, h4, h3, ฯลฯ)
function getCardName(cardEl) {
  return (
    (cardEl.querySelector("h5")?.textContent) ||
    (cardEl.querySelector(".card-title")?.textContent) ||
    (cardEl.querySelector("h4")?.textContent) ||
    (cardEl.querySelector("h3")?.textContent) ||
    ""
  ).trim();
}

// ยูทิล: เพิ่ม badge ป้ายกำกับ ถ้ายังไม่มี
function ensureTagsBadges(cardBodyEl, tags) {
  if (!Array.isArray(tags) || !tags.length) return;
  let holder = cardBodyEl.querySelector('[data-addon="tags"]');
  if (!holder) {
    holder = document.createElement("div");
    holder.setAttribute("data-addon", "tags");
    holder.className = "mb-2";
    cardBodyEl.insertBefore(holder, cardBodyEl.querySelector("p, .card-text"));
  }
  holder.innerHTML = tags.map(t => `<span class="badge bg-secondary me-1">${t}</span>`).join("");
}

// ยูทิล: สร้าง/คืนค่า container โมดอลรวม
function getModalsContainer() {
  let mods = document.getElementById("service-modals");
  if (!mods) {
    mods = document.createElement("div");
    mods.id = "service-modals";
    document.body.appendChild(mods);
  }
  return mods;
}

// สร้าง/อัปเดตโมดอลตาม service
function upsertServiceModal(svc) {
  const { id, name, category, description, tags = [], gallery = [] } = svc;
  const mods = getModalsContainer();
  const modalId = `svc-${id}`;
  let modal = document.getElementById(modalId);

  const hasGallery = Array.isArray(gallery) && gallery.length > 0;
  const galleryHtml = hasGallery ? `
    <div id="gal-${id}" class="carousel slide mb-3" data-bs-ride="carousel">
      <div class="carousel-inner">
        ${gallery.map((img, i) => `
          <div class="carousel-item ${i===0?'active':''}">
            <img src="${img}" class="d-block w-100" alt="ผลงาน">
          </div>
        `).join('')}
      </div>
      <button class="carousel-control-prev" type="button" data-bs-target="#gal-${id}" data-bs-slide="prev">
        <span class="carousel-control-prev-icon" aria-hidden="true"></span>
        <span class="visually-hidden">ก่อนหน้า</span>
      </button>
      <button class="carousel-control-next" type="button" data-bs-target="#gal-${id}" data-bs-slide="next">
        <span class="carousel-control-next-icon" aria-hidden="true"></span>
        <span class="visually-hidden">ถัดไป</span>
      </button>
    </div>
  ` : "";

  const tagsHtml = Array.isArray(tags) && tags.length
    ? `<div class="mt-2">${tags.map(t=>`<span class="badge bg-secondary me-1">${t}</span>`).join('')}</div>`
    : "";

  const html = `
    <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="svc-label-${id}" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 id="svc-label-${id}" class="modal-title">${name || ""}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="ปิด"></button>
          </div>
          <div class="modal-body">
            ${galleryHtml}
            <div class="text-muted small mb-2">${category || ""}</div>
            <p style="white-space:pre-line">${(description || "")}</p>
            ${tagsHtml}
          </div>
        </div>
      </div>
    </div>
  `;

  if (!modal) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html.trim();
    mods.appendChild(wrapper.firstElementChild);
  } else {
    modal.outerHTML = html; // อัปเดตเนื้อในกรณีมีการแก้ข้อมูล
  }
}

// เพิ่มปุ่ม “ดูรายละเอียด” ให้การ์ด (ถ้ายังไม่มี)
function ensureDetailButton(cardEl, svcId) {
  if (cardEl.querySelector('[data-addon="detail-btn"]')) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn btn-primary mt-2";
  btn.setAttribute("data-addon", "detail-btn");
  btn.setAttribute("data-bs-toggle", "modal");
  btn.setAttribute("data-bs-target", `#svc-${svcId}`);
  btn.textContent = "ดูรายละเอียด";

  // พยายามวางไว้ท้าย .card-body
  const body = cardEl.querySelector(".card-body") || cardEl;
  body.appendChild(btn);
}

// ---------------------- Main Enhance Flow ----------------------
function enhanceWithSnapshot() {
  if (!db) return;

  const wrap = document.getElementById("service-cards");
  if (!wrap) return;

  // สร้าง map จากชื่อบริการ -> เอกสาร (อาศัยชื่อเป็นคีย์อ้างอิง)
  onSnapshot(collection(db, "services"), snap => {
    const byName = new Map();
    const arr = [];
    snap.forEach(doc => {
      const d = doc.data() || {};
      const item = {
        id: doc.id,
        name: d.name || "",
        category: d.category || "",
        description: d.description || "",
        imageUrl: d.imageUrl || "",
        tags: Array.isArray(d.tags) ? d.tags : [],
        gallery: Array.isArray(d.gallery) ? d.gallery : []
      };
      arr.push(item);
      if (item.name) byName.set(item.name.trim(), item);
    });

    // ไลน์ผ่านการ์ดที่ public.js เรนเดอร์ไว้แล้ว แล้ว "เสริม" ตามชื่อ
    const cards = wrap.querySelectorAll(".card");
    cards.forEach(card => {
      const nm = getCardName(card);
      if (!nm) return;
      const svc = byName.get(nm);
      if (!svc) return; // ถ้าไม่แมตช์ชื่อ ก็ข้าม (ไม่ทำลายอะไร)

      // แปะ badge tags ถ้ายังไม่มี
      const body = card.querySelector(".card-body") || card;
      ensureTagsBadges(body, svc.tags);

      // สร้าง/อัปเดตโมดอลของ service นี้
      upsertServiceModal(svc);

      // ปุ่มดูรายละเอียด
      ensureDetailButton(card, svc.id);
    });
  });
}

// เริ่มทำงานหลัง DOM พร้อม
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", enhanceWithSnapshot);
} else {
  enhanceWithSnapshot();
}
