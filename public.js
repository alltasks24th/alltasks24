// หน้าแรกอยากโชว์กี่บริการ (ปรับเลขเดียวจบ)
const SERVICES_LIMIT_HOME = 9;

// public.js — ฝั่งผู้ใช้ (realtime + chat เปิดเมื่อกดปุ่ม)
import { auth, db, ensureAnonAuth } from './firebase-init.js';
import {
  collection, doc, getDoc, getDocs, addDoc, onSnapshot,
  query, where, orderBy, limit, serverTimestamp, increment, updateDoc
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { $ } from './utils.js';

const settingsRef = doc(db, 'settings', 'public');
let currentThreadId = localStorage.getItem('chatThreadIdV2') || null;
let sessionId = localStorage.getItem('sessionId') || null;

async function init(){
  const user = await ensureAnonAuth();
  if(!sessionId){ sessionId = Math.random().toString(36).slice(2); localStorage.setItem('sessionId', sessionId); }
  const y = document.getElementById('yearNow'); if(y) y.textContent = new Date().getFullYear();
  await loadSettings();
  bindRealtime();
  setupSearch(); setupBooking(); setupReview(); setupQuote();
  setupChat(user);
}
init();

async function loadSettings(){
  const s = await getDoc(settingsRef);
  const data = s.exists()? s.data(): { phone:'0800000000', line:'@yourline', facebook:'https://facebook.com/', mapUrl:'https://www.google.com/maps?q=Bangkok&output=embed' };
  const m = $('#mapEmbed'); if(m) m.src = data.mapUrl||'';
  const call = $('#fabCall'); if(call) call.href = `tel:${data.phone||''}`;
  const ln=$('#fabLine'); if(ln){const r=(data.line||'').trim(); ln.href=r?(r.startsWith('http')?r:`https://line.me/R/ti/p/${r.startsWith('@')?r:'@'+r}`):'#';}
  const fb = $('#fabFb'); if(fb) fb.href = data.facebook||'#';
  // Apply homepage hero texts from settings (if present)
  try {
    const heroH1 = document.querySelector('header.hero h1');
    if (heroH1 && data.heroTitle) heroH1.textContent = data.heroTitle;
    const heroSub = document.querySelector('header.hero .lead');
    if (heroSub && data.heroSubtitle) heroSub.textContent = data.heroSubtitle;
    const heroEyebrow = document.querySelector('header.hero .eyebrow');
    if (heroEyebrow && data.hero) heroEyebrow.textContent = data.hero;
  } catch (e) { console.warn('hero text apply', e); }

}

function bindRealtime(){
  onSnapshot(collection(db,'banners'), snap=>{
    const wrap = document.getElementById('banner-slides'); if(!wrap) return; wrap.innerHTML='';
    let i=0; snap.forEach(d=>{
      const b=d.data();
      wrap.insertAdjacentHTML('beforeend', `<div class="carousel-item ${i===0?'active':''}">
        <img src="${b.imageUrl||''}" class="d-block w-100 svc-thumb" alt="">
        <div class="carousel-caption text-start bg-black bg-opacity-25 rounded-3 p-3">
          <h3 class="fw-bold">${b.title||''}</h3><p class="mb-0">${b.subtitle||''}</p>
        </div></div>`);
      i++;
    });
  });

  onSnapshot(collection(db, 'promotions'), snap => {
  const home = document.getElementById('promo-cards');      // หน้าแรก
  const all  = document.getElementById('promo-cards-all');  // หน้าโปรโมชันทั้งหมด
  if (!home && !all) return;

  const now = new Date();
  const items = [];

  snap.forEach(docu => {
    const p = docu.data() || {};
    const start = p.start?.toDate?.() ? p.start.toDate() : (p.start ? new Date(p.start) : new Date(0));
    const end   = p.end?.toDate?.()   ? p.end.toDate()   : (p.end   ? new Date(p.end)   : new Date(0));
    if (now >= start && now <= end) items.push({ ...p, _end: end });
  });

  const card = p => `
    <div class="col-md-4">
      <div class="card card-clean h-100">
        <img src="${p.imageUrl || 'assets/img/promo.png'}" class="svc-thumb card-img-top" alt="">
        <div class="card-body">
          <h5 class="card-title">${p.title || 'โปรโมชัน'}</h5>
          <p class="card-text">${p.description || ''}</p>
        </div>
        <div class="card-footer small text-muted">ถึง ${p._end.toLocaleDateString('th-TH')}</div>
      </div>
    </div>
  `;

  // หน้าแรก: แสดงแค่ 3
  if (home) {
    home.innerHTML = items.slice(0, 3).map(card).join('');
    const lbl = document.getElementById('promo-range-label');
    if (lbl) lbl.textContent = items.length
      ? `โปรโมชันที่ใช้งาน (${items.length})`
      : 'ยังไม่มีโปรโมชันที่';
  }

  // หน้าโปรโมชันทั้งหมด: แสดงทั้งหมด
  if (all) {
    all.innerHTML = items.map(card).join('');
    const cnt = document.getElementById('promo-all-count');
    if (cnt) cnt.textContent = items.length ? `ทั้งหมด ${items.length} รายการ` : 'ไม่มีโปรโมชันที่ใช้งาน';
  }
});

  // ===== Services (หน้าแรก) =====
  onSnapshot(collection(db,'services'), snap=>{
    const wrap = document.getElementById('service-cards'); if(!wrap) return;
    let mods = document.getElementById('service-modals');
    if(!mods){ mods = document.createElement('div'); mods.id='service-modals'; document.body.appendChild(mods); }
    wrap.innerHTML=''; mods.innerHTML='';
    let shown = 0;

    snap.forEach(s=>{
      if (shown >= SERVICES_LIMIT_HOME) return;

      const d=s.data()||{};
      const id = s.id;
      const name = d.name||'';
      const category = d.category||'';
      const desc = d.description||'';
      const cover = d.imageUrl||'https://images.unsplash.com/photo-1487014679447-9f8336841d58?q=80&w=1400&auto=format&fit=crop';
      const tags = Array.isArray(d.tags)?d.tags:[];
      const gallery = Array.isArray(d.gallery)?d.gallery:[];

      // การ์ดบริการ + ป้ายกำกับ + ปุ่มดูรายละเอียด
      wrap.insertAdjacentHTML('beforeend', `<div class="col-md-4">
        <div class="card card-clean h-100">
          ${cover?`<img src="${cover}" class="svc-thumb" alt="">`:``}
          <div class="card-body d-flex flex-column">
            <div class="d-flex align-items-center gap-2 mb-2">
              <div class="svc-icon"><i class="bi bi-stars"></i></div>
              <h5 class="mb-0">${name}</h5>
            </div>
            <div class="text-muted small mb-1">${category}</div>
            <div class="mb-2">${tags.map(t=>`<span class="badge bg-secondary me-1">${t}</span>`).join('')}</div>
            <p class="text-muted flex-grow-1">${desc}</p>
            <button class="btn btn-primary mt-2" data-bs-toggle="modal" data-bs-target="#svc-${id}">ดูรายละเอียด</button>
          </div>
        </div>
      </div>`);

      // Modal + แกลเลอรี (สไลด์)
      const hasGallery = gallery.length>0;
      mods.insertAdjacentHTML('beforeend', `
        <div class="modal fade" id="svc-${id}" tabindex="-1" aria-labelledby="svc-label-${id}" aria-hidden="true">
          <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content">
              <div class="modal-header">
                <h5 id="svc-label-${id}" class="modal-title">${name}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="ปิด"></button>
              </div>
              <div class="modal-body">
                ${hasGallery?`
                  <div id="gal-${id}" class="carousel slide mb-3" data-bs-ride="carousel">
                    <div class="carousel-inner">
                      ${gallery.map((u,i)=>`
                        <div class="carousel-item ${i===0?'active':''}">
                          <img src="${u}" class="d-block w-100" alt="ผลงาน">
                        </div>`).join('')}
                    </div>
                    <button class="carousel-control-prev" type="button" data-bs-target="#gal-${id}" data-bs-slide="prev">
                      <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                      <span class="visually-hidden">ก่อนหน้า</span>
                    </button>
                    <button class="carousel-control-next" type="button" data-bs-target="#gal-${id}" data-bs-slide="next">
                      <span class="carousel-control-next-icon" aria-hidden="true"></span>
                      <span class="visually-hidden">ถัดไป</span>
                    </button>
                  </div>`:``}
                <div class="text-muted small mb-2">${category}</div>
                <p style="white-space:pre-line">${desc}</p>
                ${tags.length?`<div class="mt-2">${tags.map(t=>`<span class="badge bg-secondary me-1">${t}</span>`).join('')}</div>`:``}
              </div>
            </div>
          </div>
        </div>`);
      shown++;
    });
  });

  onSnapshot(collection(db,'serviceAreas'), snap=>{
    const ul = document.getElementById('area-list'); if(!ul) return; ul.innerHTML='';
    snap.forEach(a=>{ const d=a.data(); ul.insertAdjacentHTML('beforeend', `<li class="list-group-item d-flex justify-content-between"><span>${d.name||''}</span><span class="text-muted small">${d.province||''}</span></li>`); });
  });

  // ===== Reviews (approved only) =====
  (function(){
    const CACHE_KEY = 'cacheReviewsV1';
    const homeWrap = document.getElementById('reviewList');
    const allWrap  = document.getElementById('reviewAllList');

    const normalize = (r) => {
      const ts = r.createdAt?.toDate?.()
        ? r.createdAt.toDate().getTime()
        : (r.createdAt ? new Date(r.createdAt).getTime() : 0);
      return { ...r, __ts: ts };
    };

    function renderReviewCard(r){
      const stars = '★'.repeat(r.rating||0) + '☆'.repeat(5-(r.rating||0));
      return `
        <div class="col-md-6">
          <div class="card card-clean h-100">
            ${r.imageUrl ? `<img src="${r.imageUrl}" class="svc-thumb" alt="รีวิว">` : ''}
            <div class="card-body">
              <div class="d-flex justify-content-between">
                <strong>${r.name || 'ผู้ใช้'}</strong>
                <span class="badge text-bg-success">${stars}</span>
              </div>
              <p class="mb-0 mt-2 text-muted" style="white-space:pre-line">${r.text || ''}</p>
            </div>
          </div>
        </div>
      `;
    }

    function paint(list, {initial=false}={}){
      if (!homeWrap && !allWrap) return;

      // หน้ารีวิวทั้งหมด
      if (allWrap){
        const pageSize = Number(allWrap.dataset.pageSize || 12);
        const curPage  = Number(allWrap.dataset.page || 1);
        const slice = list.slice(0, curPage * pageSize);
        allWrap.innerHTML = slice.map(renderReviewCard).join('');

        if (!initial){
          requestAnimationFrame(()=>{
            const avgEl = document.getElementById('avgAll');
            if (avgEl){
              const avg = slice.length ? slice.reduce((s,x)=> s + Number(x.rating||0), 0)/slice.length : 0;
              avgEl.textContent = slice.length
                ? `คะแนนเฉลี่ย ${avg.toFixed(1)}/5 จาก ${slice.length} รีวิว`
                : 'ยังไม่มีรีวิว';
            }
          });
        }

        const moreBtn = document.getElementById('loadMoreReviews');
        if (moreBtn){
          moreBtn.style.display = slice.length >= list.length ? 'none' : '';
          if (!moreBtn._bound){
            moreBtn._bound = true;
            moreBtn.addEventListener('click', ()=>{
              const p = Number(allWrap.dataset.page || 1) + 1;
              allWrap.dataset.page = String(p);
              paint(list, {initial});
            });
          }
        }
        return;
      }

      // หน้าแรก
      if (homeWrap){
        const limitN = Number(homeWrap.dataset.limit || 4);
        const subset = list.slice(0, limitN);
        homeWrap.innerHTML = subset.map(renderReviewCard).join('');

        if (!initial){
          requestAnimationFrame(()=>{
            const avgEl = document.getElementById('avg');
            if (avgEl){
              const avg = subset.length ? subset.reduce((s,x)=> s + Number(x.rating||0), 0)/subset.length : 0;
              avgEl.textContent = subset.length
                ? `คะแนนเฉลี่ย ${avg.toFixed(1)}/5 จาก ${subset.length} รีวิว`
                : 'ยังไม่มีรีวิวที่อนุมัติ';
            }
          });
        }

        const moreLink = document.getElementById('btnReviewMore');
        if (moreLink){ moreLink.style.display = list.length > limitN ? '' : 'none'; }
      }
    }

    try{
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
      if (cached.length){ paint(cached, {initial:true}); }
    }catch(_){/* ignore */}

    const qMain = query(
      collection(db,'reviews'),
      where('approved','==', true),
      orderBy('createdAt','desc')
    );

    (async ()=>{
      try {
        const snap = await getDocs(qMain);
        const list = [];
        snap.forEach(d => list.push(normalize(d.data() || {})));
        try{ localStorage.setItem(CACHE_KEY, JSON.stringify(list.slice(0,60))); }catch(_){}
        paint(list, {initial:false});
      } catch (err) {
        console.error(err);
        const container = allWrap || homeWrap;
        if (container) {
          const msg = document.createElement('div');
          msg.className = 'text-danger small text-center my-2';
          msg.textContent = 'โหลดรีวิวไม่สำเร็จ (จะลองวิธีสำรอง)';
          container.parentElement?.insertBefore(msg, container);
        }
        try {
          const snap2 = await getDocs(
            query(collection(db,'reviews'), where('approved','==', true))
          );
          const list2 = [];
          snap2.forEach(d => list2.push(normalize(d.data() || {})));
          list2.sort((a,b)=> b.__ts - a.__ts);
          try{ localStorage.setItem(CACHE_KEY, JSON.stringify(list2.slice(0,60))); }catch(_){}
          paint(list2, {initial:false});
        } catch (err2) {
          console.error(err2);
          const container2 = allWrap || homeWrap;
          if (container2) {
            const msg2 = document.createElement('div');
            msg2.className = 'text-danger small text-center my-2';
            msg2.textContent = 'โหลดรีวิวล้มเหลว กรุณารีเฟรชหน้าหรือแจ้งแอดมิน';
            container2.parentElement?.insertBefore(msg2, container2);
          }
        }
      }
    })();

    onSnapshot(
      qMain,
      snap => {
        const list = [];
        snap.forEach(docu => list.push(normalize(docu.data() || {})));
        try{ localStorage.setItem(CACHE_KEY, JSON.stringify(list.slice(0,60))); }catch(_){}
        paint(list, {initial:false});
      },
      err => {
        console.error(err);
        const container = allWrap || homeWrap;
        if (container) {
          const warn = document.createElement('div');
          warn.className = 'text-danger small text-center my-2';
          warn.textContent = 'อัปเดตรีลไทม์ผิดพลาด กำลังใช้ข้อมูลล่าสุดที่แคชไว้';
          container.parentElement?.insertBefore(warn, container);
        }
      }
    );
  })();

  onSnapshot(collection(db,'faqs'), snap=>{
    const acc = document.getElementById('faqAccordion'); if(!acc) return; acc.innerHTML='';
    let i=0; snap.forEach(f=>{
      const d=f.data(); const id='fq'+(++i);
      acc.insertAdjacentHTML('beforeend', `<div class="accordion-item">
        <h2 class="accordion-header"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#${id}">${d.q||''}</button></h2>
        <div id="${id}" class="accordion-collapse collapse"><div class="accordion-body">${d.a||''}</div></div>
      </div>`);
    });
  });
}

function setupSearch(){
  const btn = document.getElementById('btnSearch'); if(!btn) return;
  btn.addEventListener('click', async()=>{
    const text = (document.getElementById('searchText').value||'').toLowerCase();
    const area = (document.getElementById('searchArea').value||'').toLowerCase();
    const sSnap = await getDocs(collection(db,'services')); const aSnap = await getDocs(collection(db,'serviceAreas'));
    const sList=[]; sSnap.forEach(d=>sList.push(d.data())); const aList=[]; aSnap.forEach(d=>aList.push(d.data()));
    const sMatch = sList.filter(s=> !text || [s.name,s.category,s.description].join(' ').toLowerCase().includes(text));
    const aMatch = aList.filter(a=> !area || [a.name,a.province].join(' ').toLowerCase().includes(area));
    document.getElementById('searchResults').innerHTML = `<div class="alert alert-info mt-2 mb-0">พบบริการ ${sMatch.length} และพื้นที่ ${aMatch.length}</div>`;
  });
}

function setupBooking(){
  const form = document.getElementById('bookingFormEl'); if(!form) return;
  form.addEventListener('submit', async (e)=>{
    e.preventDefault(); const data = Object.fromEntries(new FormData(form).entries());
    data.createdAt=serverTimestamp(); data.status='pending';
    try{ await addDoc(collection(db,'bookings'), data); form.reset(); document.getElementById('bookingMsg').textContent='ส่งคำขอแล้ว'; }
    catch(err){ document.getElementById('bookingMsg').textContent='ผิดพลาด โปรดลองใหม่'; console.error(err); }
  });
}

function setupReview(){
  const saveBtn = document.getElementById('saveReview');
  if (!saveBtn) return;

  saveBtn.addEventListener('click', async () => {
    const nameEl   = document.getElementById('reviewName');
    const ratingEl = document.getElementById('rating');
    const textEl   = document.getElementById('reviewText');
    const photoEl  = document.getElementById('reviewPhoto');

    const name   = (nameEl?.value || '').trim() || 'ผู้ใช้';
    const rating = Math.max(1, Math.min(5, Number(ratingEl?.value || 5)));
    const text   = (textEl?.value || '').trim();
    const photo  = (photoEl?.value || '').trim();

    if (!text) { alert('กรุณากรอกรีวิว'); return; }

    const data = {
      name,
      rating,
      text,
      imageUrl: photo || null,
      approved: false,
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'reviews'), data);
      if (nameEl)   nameEl.value   = '';
      if (textEl)   textEl.value   = '';
      if (photoEl)  photoEl.value  = '';
      if (ratingEl) ratingEl.value = '5';

      const modalEl = document.getElementById('reviewModal');
      if (modalEl && window.bootstrap) {
        const inst = window.bootstrap.Modal.getInstance(modalEl) || new window.bootstrap.Modal(modalEl);
        inst.hide();
      }
      alert('ส่งรีวิวแล้ว • รอแอดมินอนุมัติ');
    } catch (err) {
      console.error(err);
      alert('ส่งรีวิวไม่สำเร็จ กรุณาลองใหม่');
    }
  });
}

function setupQuote(){
  const form = document.getElementById('quoteForm'); if(!form) return;
  form.addEventListener('submit', async (e)=>{
    e.preventDefault(); const data=Object.fromEntries(new FormData(form).entries()); data.createdAt=serverTimestamp(); data.status='open';
    try{ await addDoc(collection(db,'tickets'), data); form.reset(); document.getElementById('quoteMsg').textContent='ส่งคำขอแล้ว'; }
    catch(err){ document.getElementById('quoteMsg').textContent='ผิดพลาด โปรดลองใหม่'; console.error(err); }
  });
}

async function setupChat(user){
  const widget = document.getElementById('chat'),
        fab = document.getElementById('fabChat'),
        badge = document.getElementById('fabChatBadge'),
        body = document.getElementById('chatBody'),
        input = document.getElementById('chatMessage'),
        send = document.getElementById('chatSend'),
        closeBtn = document.getElementById('closeChat');

  if(!widget || !fab || !body || !input || !send || !closeBtn){ return; }

  function openChat(open){
    widget.classList.toggle('open', open);
    if(open){ badge && (badge.style.display='none'); resetUnreadUser(); }
  }
  fab.addEventListener('click', ()=> openChat(!widget.classList.contains('open')));
  closeBtn.addEventListener('click', ()=> openChat(false));

  let createdNow = false;
  if(!currentThreadId){
    const t = await addDoc(collection(db,'chatThreads'), {
      createdAt: serverTimestamp(),
      lastMessage:'เริ่มสนทนา',
      status:'open',
      uid: user?.uid||null,
      sessionId,
      unreadAdmin: 0,
      unreadUser: 1
    });
    currentThreadId = t.id; localStorage.setItem('chatThreadIdV2', currentThreadId);
    createdNow = true;
  }

  const fmtDT = (ts)=>{
    const d = ts?.toDate?.() ? ts.toDate() : (ts instanceof Date ? ts : new Date());
    return d.toLocaleString('th-TH', { dateStyle:'short', timeStyle:'short' });
  };

  onSnapshot(query(collection(db,'chatThreads', currentThreadId, 'messages'), orderBy('createdAt','asc')), snap=>{
    body.innerHTML='';
    snap.forEach(m=>{
      const d=m.data();
      const who = d.sender==='admin' ? 'แอดมิน' : (d.sender==='bot' ? 'ระบบ' : 'ฉัน');
      const when = d.createdAt ? fmtDT(d.createdAt) : '';
      body.insertAdjacentHTML('beforeend', `
        <div class="chat-msg ${d.sender}">
          <div class="meta">${who} • ${when}</div>
          <div class="text">${d.text}</div>
        </div>
      `);
    });
    body.scrollTop = body.scrollHeight;
  });

  onSnapshot(doc(db,'chatThreads', currentThreadId), snap=>{
    const d=snap.data()||{}; const n = Number(d.unreadUser||0);
    if(!widget.classList.contains('open') && n>0){ if(badge){ badge.textContent=String(n); badge.style.display='inline-block'; } }
    else{ if(badge) badge.style.display='none'; }
  });

  async function sendMsg(){
    const text = input.value.trim(); if(!text) return;
    await addDoc(collection(db,'chatThreads', currentThreadId, 'messages'), { sender:'user', text, createdAt: serverTimestamp() });
    await updateDoc(doc(db,'chatThreads', currentThreadId), { lastMessage: text, unreadAdmin: increment(1) });
    input.value='';
  }
  send.addEventListener('click', sendMsg);
  input.addEventListener('keypress', e=>{ if(e.key==='Enter') sendMsg(); });

  if(createdNow){
    await addDoc(collection(db,'chatThreads', currentThreadId, 'messages'), { sender:'bot', text: 'ยินดีให้บริการ 24 ชั่วโมง หากทักผ่านช่องทางนี้แล้วไม่มีการตอบกลับ สามารถแอดไลน์ เพื่อติดต่อได้ หรือ โทร', createdAt: serverTimestamp() });
  }

  async function resetUnreadUser(){
    if(!currentThreadId) return;
    await updateDoc(doc(db,'chatThreads', currentThreadId), { unreadUser: 0 });
  }
}

// เปิดโมดอลแบบโปรแกรมมิง เผื่อ data API ไม่ hook
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-bs-toggle="modal"][data-bs-target^="#svc-"]');
  if (!btn) return;
  const sel = btn.getAttribute('data-bs-target');
  const el = document.querySelector(sel);
  if (el && window.bootstrap?.Modal) window.bootstrap.Modal.getOrCreateInstance(el).show();
});

/* === FIX: force-show modal + raise z-index (ADD-ONLY) === */
(function () {
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-bs-toggle="modal"][data-bs-target^="#svc-"]');
    if (!btn) return;
    const sel = btn.getAttribute('data-bs-target');
    const el = document.querySelector(sel);
    if (el && window.bootstrap?.Modal) {
      window.bootstrap.Modal.getOrCreateInstance(el).show();
      const car = el.querySelector('.carousel');
      if (car && window.bootstrap?.Carousel) {
        window.bootstrap.Carousel.getOrCreateInstance(car, { interval: 4000 });
      }
    }
  }, true);

  const style = document.createElement('style');
  style.innerHTML = `
    .modal{ z-index:1400 !important; }
    .modal-backdrop{ z-index:1300 !important; }
    body.modal-open .fab-dock,
    body.modal-open .chat-widget,
    body.modal-open .position-fixed,
    body.modal-open [data-fab],
    body.modal-open .offcanvas{ z-index:10 !important; }
  `;
  document.head.appendChild(style);

  const moveToBody = (m) => {
    if (!m || m.parentElement === document.body) return;
    document.body.appendChild(m);
  };
  const obs = new MutationObserver((list) => {
    for (const mu of list) {
      mu.addedNodes?.forEach(n => {
        if (n.nodeType === 1 && n.matches?.('.modal[id^="svc-"]')) moveToBody(n);
        if (n.nodeType === 1) n.querySelectorAll?.('.modal[id^="svc-"]').forEach(moveToBody);
      });
    }
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });
})();

// === SITE CONTACT (ตั้งค่าครั้งเดียว; เว้นว่างไว้ = ไม่แสดงปุ่มนั้น) ===
window.SITE_PHONE   = '094-173-1710';
window.SITE_LINE_URL= 'https://line.me/R/ti/p/@243zoeey';
window.SITE_FB_URL  = 'https://www.facebook.com/share/16Qd9wh7h4/';

// === เพิ่มปุ่ม โทร / LINE / Facebook ในโมดอลบริการ (ADD-ONLY) ===
(function(){
  function addContactButtons(modal){
    if(!modal || modal.querySelector('[data-addon="contact-cta"]')) return;
    const body = modal.querySelector('.modal-body'); if(!body) return;

    const phone = window.SITE_PHONE || '';
    const line  = window.SITE_LINE_URL || '';
    const fb    = window.SITE_FB_URL || '';

    let html = '';
    if (phone) html += `<a href="tel:${phone}" class="btn btn-outline-success"><i class="bi bi-telephone"></i> โทร</a>`;
    if (line)  html += `<a href="${line}" target="_blank" rel="noopener" class="btn btn-outline-success"><i class="bi bi-chat-dots"></i> LINE</a>`;
    if (fb)    html += `<a href="${fb}" target="_blank" rel="noopener" class="btn btn-outline-primary"><i class="bi bi-facebook"></i> Facebook</a>`;
    else       html += `<button type="button" class="btn btn-outline-primary" data-share="facebook"><i class="bi bi-facebook"></i> แชร์ Facebook</button>`;

    const wrap = document.createElement('div');
    wrap.setAttribute('data-addon','contact-cta');
    wrap.className = 'd-flex flex-wrap gap-2 mt-3';
    wrap.innerHTML = html;
    body.appendChild(wrap);
  }

  document.addEventListener('shown.bs.modal', e=>{
    const m = e.target;
    if(m && /^svc-/.test(m.id)) addContactButtons(m);
  });

  const obs = new MutationObserver(list=>{
    for (const mu of list){
      mu.addedNodes && mu.addedNodes.forEach(n=>{
        if(n.nodeType===1 && n.matches?.('.modal[id^="svc-"]')) addContactButtons(n);
      });
    }
  });
  obs.observe(document.body, {childList:true, subtree:true});

  document.addEventListener('click', e=>{
    const b = e.target.closest('[data-share="facebook"]');
    if(!b) return;
    e.preventDefault();
    const u = encodeURIComponent(location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${u}`,
      '_blank','noopener,noreferrer,width=640,height=480');
  });
})();

/* ===== HOME: เรนเดอร์สินค้า 3 ชิ้น (ถัดจากบริการ) ===== */
async function renderHomeProducts() {
  // รองรับทั้ง #home-products-list (ใหม่) และ #home-products (เดิม)
  const list = document.getElementById('home-products-list')
           || document.getElementById('home-products');
  const skel = document.getElementById('home-products-skeleton');
  const err  = document.getElementById('home-products-error');
  const empty= document.getElementById('home-products-empty');

  let mods = document.getElementById('product-modals');
  if (!list) return;
  if (!mods) {
    mods = document.createElement('div');
    mods.id = 'product-modals';
    document.body.appendChild(mods);
  }

  // show skeleton
  skel?.classList.remove('d-none');
  err?.classList.add('d-none');
  empty?.classList.add('d-none');
  list.innerHTML = '';
  mods.innerHTML = '';

  try {
    const snap = await getDocs(query(
      collection(db, 'products'),
      where('isActive','==', true),
      where('featured','==', true),
      orderBy('rank','asc'),
      limit(6) // โชว์ 3 รายการ
    ));

    if (snap.empty) {
      empty?.classList.remove('d-none');
      return;
    }

    snap.forEach(docSnap => {
      const d  = docSnap.data();
      const id = docSnap.id;

      const toDate = v => v?.toDate ? v.toDate() : (v ? new Date(v) : null);
      const now = new Date();
      const saleOn = typeof d.salePrice === 'number'
                  && d.salePrice < (d.price || 0)
                  && (!d.saleStart || toDate(d.saleStart) <= now)
                  && (!d.saleEnd   || now <= toDate(d.saleEnd));

      const percent = saleOn && d.price ? Math.round((1 - d.salePrice / d.price) * 100) : 0;
      const chips   = (d.tags || []).slice(0,5).map(t => `<span class="badge badge-outline me-1 mb-1">#${t}</span>`).join('');
      const stock   = (d.stock ?? null);
      const soldOut = (stock !== null) && Number(stock) <= 0;
      const startStr= d.saleStart ? toDate(d.saleStart).toLocaleString('th-TH') : '';

      // การ์ดบนหน้าแรก (ป้าย "ลด xx%" จะยังแสดงแม้มีรูป)
      const row = list;

      row.insertAdjacentHTML('beforeend', `
        <div class="col-md-4">
          <div class="card product-card h-100 shadow-sm ${soldOut ? 'is-soldout' : ''}">
          <div class="ratio ratio-16x9">
          ${saleOn ? `<span class="sale-badge badge bg-danger">ลด ${percent}%</span>` : ``}
          ${soldOut ? `<div class="soldout-badge">สินค้าหมด</div>` : ``}
          <img src="${d.cover}" class="w-100 h-100 object-fit-cover" alt="">
          </div>
            <div class="card-body d-flex flex-column">
              <h5 class="mb-1">${d.name || ''}</h5>
              <div class="fw-semibold mb-1">
                ${ saleOn
                    ? `<del class="text-muted me-1">฿${(d.price||0).toLocaleString()}</del>
                       <span class="text-danger">฿${(d.salePrice||0).toLocaleString()}</span>`
                    : `฿${(d.price||0).toLocaleString()}${d.unit?` / ${d.unit}`:''}` }
              </div>
              ${stock!==null ? `<div class="small text-muted mb-1">สต๊อก: ${stock}</div>` : ``}
              ${saleOn && startStr ? `<div class="small text-muted mb-1">เริ่มโปรโมชัน: ${startStr}</div>` : ``}
              <div class="mb-2 d-flex flex-wrap">${chips}</div>
              <p class="text-muted flex-grow-1 line-clamp-2">${d.desc || ''}</p>
              <button class="btn btn-primary mt-2" data-bs-toggle="modal" data-bs-target="#prod-${id}">
                ดูรายละเอียด
              </button>
            </div>
          </div>
        </div>
      `);

      // โมดอลรายละเอียด + แกลเลอรี
      const gal = Array.isArray(d.gallery) ? d.gallery : [];
      mods.insertAdjacentHTML('beforeend', `
        <div class="modal fade" id="prod-${id}" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">${d.name || ''}</h5>
                <button class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">
                ${gal.length ? `
                  <div id="gal-${id}" class="carousel slide mb-3" data-bs-ride="carousel">
                    <div class="carousel-inner">
                      ${gal.map((u,i)=>`
                        <div class="carousel-item ${i===0?'active':''}">
                          <img src="${u}" class="d-block w-100 rounded" alt="">
                        </div>`).join('')}
                    </div>
                    <button class="carousel-control-prev" type="button" data-bs-target="#gal-${id}" data-bs-slide="prev">
                      <span class="carousel-control-prev-icon"></span>
                    </button>
                    <button class="carousel-control-next" type="button" data-bs-target="#gal-${id}" data-bs-slide="next">
                      <span class="carousel-control-next-icon"></span>
                    </button>
                  </div>` : ``}
                <div class="fw-semibold mb-2">
                  ราคา:
                  ${ saleOn
                      ? `<del>฿${(d.price||0).toLocaleString()}</del> <span class="text-danger">฿${(d.salePrice||0).toLocaleString()}</span>`
                      : `฿${(d.price||0).toLocaleString()}${d.unit?` / ${d.unit}`:''}` }
                </div>
                ${stock!==null ? `<div class="small text-muted mb-1">สต๊อก: ${stock}</div>` : ``}
                ${saleOn && startStr ? `<div class="small text-muted mb-1">เริ่มโปรโมชัน: ${startStr}</div>` : ``}
                <div class="small text-muted mb-2">${(d.tags||[]).join(' · ')}</div>
                <p style="white-space:pre-line">${d.desc || ''}</p>

                <div class="d-flex flex-wrap gap-2 mt-3">
                  ${window.SITE_PHONE   ? `<a href="tel:${window.SITE_PHONE}" class="btn btn-outline-success"><i class="bi bi-telephone"></i> โทร</a>` : ``}
                  ${window.SITE_LINE_URL? `<a href="${window.SITE_LINE_URL}" target="_blank" rel="noopener" class="btn btn-outline-success"><i class="bi bi-chat-dots"></i> LINE</a>` : ``}
                  ${window.SITE_FB_URL  ? `<a href="${window.SITE_FB_URL}" target="_blank" rel="noopener" class="btn btn-outline-primary"><i class="bi bi-facebook"></i> Facebook</a>`
                                         : `<button type="button" class="btn btn-outline-primary" data-share="facebook"><i class="bi bi-facebook"></i> แชร์ Facebook</button>`}
                </div>
              </div>
            </div>
          </div>
        </div>
      `);
    });

  } catch (e) {
    console.error(e);
    err?.classList.remove('d-none');
  } finally {
    skel?.classList.add('d-none');
  }
}

// เรียกเมื่อ DOM พร้อม
document.addEventListener('DOMContentLoaded', () => {
  try { renderHomeProducts(); } catch (e) { /* shop.html may not have home section */ }
  decorateSoldOutCards(document);
  // Observe for dynamically rendered product cards (shop filters/search)
  const obs = new MutationObserver(() => {
    decorateSoldOutCards(document);
  });
  obs.observe(document.body, { childList: true, subtree: true });
});


// Generic decorator: mark sold-out cards on any page (home or shop)
function decorateSoldOutCards(root=document){
  const cards = root.querySelectorAll('.product-card');
  cards.forEach(card => {
    // Determine stock
    let soldOut = card.classList.contains('is-soldout');
    // 1) dataset / attribute
    const ds = card.dataset?.stock ?? card.getAttribute('data-stock');
    if (!soldOut && ds!=null && ds!=='') soldOut = Number(ds) <= 0;
    // 2) stock elements
    if (!soldOut){
      const sv = card.querySelector('.stock, .stock-value, [data-stock]');
      if (sv){
        const v = (sv.dataset ? sv.dataset.stock : null) ?? (sv.getAttribute ? sv.getAttribute('data-stock') : null) ?? sv.textContent;
        if (v!=null && String(v).trim()!=='') soldOut = Number(v)<=0;
      }
    }
    // 3) fallback: parse text
    if (!soldOut){
      const t = card.textContent.replace(/\s+/g,'').toLowerCase();
      if (t.includes('สต็อก:0') || t.includes('stock:0') || t.includes('สินค้าหมด')) soldOut = true;
    }
    if (soldOut){
      card.classList.add('is-soldout');
      const wrap = card.querySelector('.ratio, .card-img, .card-img-top') || card;
      if (wrap && !wrap.querySelector('.soldout-badge')){
        const badge = document.createElement('div');
        badge.className = 'soldout-badge';
        badge.textContent = 'สินค้าหมด';
        wrap.appendChild(badge);
      }
    }
  });
}


// === Floating Team Status Widget (bottom-left) ===
(function(){
  // Config
  const TSW_STYLE = 'pill'; // 'pill' | 'card' | 'bubble'
  const LABEL = { online:'ออนไลน์', busy:'ติดงาน', off:'ไม่ว่าง' };

  function mountContainer(){
    let el = document.getElementById('status-widget');
    if (!el){ el = document.createElement('div'); el.id = 'status-widget'; document.body.appendChild(el); }
    return el;
  }
  function renderPill(root, d){
    root.innerHTML = `<div class="tsw-pill tsw-${d.state}">
      <span class="tsw-dot"></span>
      <span class="tsw-label">${LABEL[d.state]||d.state}</span>
      ${d.state==='online' && d.count? `<span class="tsw-count">${d.count} คน</span>`:''}
    </div>`;
  }
  function renderCard(root, d){
    root.innerHTML = `<div class="tsw-card tsw-${d.state}" data-open="0" title="แตะเพื่อแสดง/ซ่อนรายละเอียด">
      <span class="tsw-icon">⚡</span>
      <div class="tsw-col">
        <div class="tsw-row"><span class="tsw-dot"></span><span class="tsw-label">${LABEL[d.state]||d.state}</span>${d.state==='online' && d.count? `<span class="tsw-count" style="background:#fff;padding:.12rem .44rem;border-radius:.5rem;font-weight:700">${d.count} คน</span>`:''}</div>
        <div class="tsw-note">${(d.note||'').replace(/</g,'&lt;')}</div>
      </div>
    </div>`;
    const el = root.firstElementChild; el.addEventListener('click', ()=>{ el.dataset.open = (el.dataset.open==='1'?'0':'1'); });
  }
  function renderBubble(root, d){
    root.innerHTML = `<div class="tsw-bubble tsw-${d.state}" data-open="0">
      <button class="tsw-btn" aria-label="${LABEL[d.state]||d.state}${d.count? ' '+d.count+' คน':''}"><span class="tsw-dot"></span></button>
      <div class="tsw-pop"><div class="tsw-row"><span class="tsw-dot"></span><span>${LABEL[d.state]||d.state}</span>${d.state==='online' && d.count? `<span class="tsw-count" style="background:#f3f4f6;border-radius:6px;padding:.06rem .4rem;margin-left:.25rem">${d.count} คน</span>`:''}</div>${(d.note? `<div class="tsw-note">${(d.note||'').replace(/</g,'&lt;')}</div>`:'')}</div>
    </div>`;
    const rootEl = root.firstElementChild; rootEl.querySelector('.tsw-btn').addEventListener('click', ()=>{ rootEl.dataset.open = (rootEl.dataset.open==='1'?'0':'1'); });
  }
  function paint(root, data){
    const d = {state: (data?.teamState)||'off', count: data?.teamHeadcount||0, note: data?.teamNote||''};
    if(TSW_STYLE==='card') return renderCard(root,d);
    if(TSW_STYLE==='bubble') return renderBubble(root,d);
    return renderPill(root,d); // default
  }

  // Ensure firestore functions
  function ensureFS(){
    return new Promise((resolve)=>{
      if (typeof doc!=='undefined' && typeof getDoc!=='undefined' && typeof onSnapshot!=='undefined') return resolve({doc, getDoc, onSnapshot});
      import('https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js').then(m=> resolve(m));
    });
  }

  async function setupStatusWidget(){
    try{
      const root = mountContainer();
      const {doc, getDoc, onSnapshot} = await ensureFS();
      const ref = doc(db,'settings','public');
      try { const snap = await getDoc(ref); paint(root, snap.data()||{}); } catch(e){ paint(root, {teamState:'off'}); }
      try { if (typeof onSnapshot === 'function') onSnapshot(ref, s=> paint(root, s.data()||{})); } catch(e){ /* ignore */ }
    }catch(err){ console.error('tsw init error', err); }
  }
  function waitDb(){ if (typeof db!=='undefined' && db) setupStatusWidget(); else setTimeout(waitDb, 150); }
  document.addEventListener('DOMContentLoaded', waitDb);
})();


/* === ADDON: copy link buttons (DO NOT REMOVE) === */
(()=>{ 
  function addCopyBtn(modal){ 
    try{
      if(!modal || modal.querySelector('[data-addon="copylink"]')) return;

      // 1) พยายามหาปุ่มใน footer ก่อน (มาตรฐาน)
      let row = modal.querySelector('.modal-footer .d-flex.gap-2.flex-wrap');
      const footer = modal.querySelector('.modal-footer');
      if(!row && footer) row = footer;

      // 2) Fallback: ถ้าไม่มี footer ให้ใช้แถวใน body เดิม
      if(!row){
        const body = modal.querySelector('.modal-body'); if(!body) return;
        row = body.querySelector('[data-addon="contact-cta"]') 
              || body.querySelector('.d-flex.flex-wrap.gap-2.mt-3');
        if(!row){ 
          row = document.createElement('div'); 
          row.className='d-flex flex-wrap gap-2 mt-3'; 
          body.appendChild(row); 
        }
      }

      // 3) ระบุ URL ของรายการในโมดัลนี้
      const isSvc = modal.id?.startsWith('svc-'); 
      const isProd = modal.id?.startsWith('prod-');
      if(!(isSvc||isProd)) return;
      const rid = modal.id.replace(/^svc-|^prod-/,'').trim();
      const url = location.origin + location.pathname + (isSvc?`?svc=${encodeURIComponent(rid)}`:`?prod=${encodeURIComponent(rid)}`);

      // 4) สร้างปุ่ม ให้ขนาดตามแถวปุ่ม (.btn-sm ถ้ามี)
      const isSmall = !!row.querySelector('.btn-sm');
      const btn = document.createElement('button');
      btn.type='button';
      btn.className='btn btn-outline-secondary' + (isSmall ? ' btn-sm' : '');
      btn.setAttribute('data-addon','copylink');
      btn.setAttribute('data-copy-link', url);
      btn.innerHTML='<i class="bi bi-link-45deg"></i> คัดลอกลิงก์';

      // 5) แทรกหลังปุ่ม Facebook ถ้ามี มิฉะนั้นต่อท้ายแถว
      const fbBtn = row.querySelector('.bi-facebook')?.closest('a,button');
      if(fbBtn) fbBtn.insertAdjacentElement('afterend', btn);
      else row.appendChild(btn);
    }catch(_){
      /* no-op */
    }
  }

  // เติมปุ่มตอนโมดอลแสดง
  document.addEventListener('shown.bs.modal', e=>{ 
    const m = e.target; 
    if(!m || !(m.id && (m.id.startsWith('svc-')||m.id.startsWith('prod-')))) return; 
    addCopyBtn(m); 
  });

  // คัดลอกลิงก์ (รองรับ fallback)
  async function copyText(t){ 
    try{ if(navigator.clipboard?.writeText){ await navigator.clipboard.writeText(t); return true; } }catch(_){}
    try{ 
      const ta=document.createElement('textarea'); ta.value=t; ta.style.position='fixed'; ta.style.opacity='0';
      document.body.appendChild(ta); ta.focus(); ta.select(); const ok=document.execCommand('copy'); ta.remove(); 
      return ok; 
    }catch(_){ return false; }
  }
  document.addEventListener('click', async e=>{ 
    const b = e.target.closest('[data-copy-link]'); if(!b) return;
    const url = b.getAttribute('data-copy-link');
    const ok = await copyText(url);
    const prev = b.innerHTML;
    b.innerHTML = ok?'<i class="bi bi-check2"></i> คัดลอกแล้ว':'คัดลอกไม่สำเร็จ';
    b.classList.add('copied');
    setTimeout(()=>{ b.innerHTML=prev; b.classList.remove('copied'); }, 1500);
  });

  // เปิดโมดอลอัตโนมัติถ้าเข้าด้วย ?svc= หรือ ?prod=
  function autoOpenFromQuery(){ 
    const q = new URLSearchParams(location.search);
    const id = q.get('svc') ? `svc-${q.get('svc')}` : (q.get('prod') ? `prod-${q.get('prod')}` : '');
    if(!id) return;
    const open=()=>{
      const el=document.getElementById(id); if(!el) return false;
      const m = window.bootstrap?.Modal.getOrCreateInstance(el); m?.show?.(); return true;
    };
    if(open()) return;
    const obs=new MutationObserver(()=>{ if(open()) obs.disconnect(); });
    obs.observe(document.body, {childList:true, subtree:true});
    setTimeout(()=>obs.disconnect(), 6000);
  }
  window.addEventListener('load', autoOpenFromQuery);
})();
