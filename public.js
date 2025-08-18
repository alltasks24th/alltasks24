// public.js — ฝั่งผู้ใช้ (realtime + chat เปิดเมื่อกดปุ่ม)
import { auth, db, ensureAnonAuth } from './firebase-init.js';
import {
  collection, doc, getDoc, getDocs, addDoc, onSnapshot,
  query, where, orderBy, serverTimestamp, increment, updateDoc
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
  const line = $('#fabLine'); if(line) line.href = `https://line.me/R/ti/p/${(data.line||'').replace('@','')}`;
  const fb = $('#fabFb'); if(fb) fb.href = data.facebook||'#';
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

  onSnapshot(collection(db,'promotions'), snap=>{
    const list = document.getElementById('promo-cards'); if(!list) return; list.innerHTML='';
    let count=0, now=new Date();
    snap.forEach(docu=>{
      const p=docu.data();
      const start = p.start?.toDate?.() ? p.start.toDate() : (p.start? new Date(p.start): new Date(0));
      const end   = p.end?.toDate?.()   ? p.end.toDate()   : (p.end? new Date(p.end): new Date(0));
      if(now>=start && now<=end){
        count++;
        list.insertAdjacentHTML('beforeend', `<div class="col-md-4">
          <div class="card card-clean h-100">
            <img src="${p.imageUrl||'assets/img/promo.png'}" class="svc-thumb card-img-top" alt="">
            <div class="card-body"><h5 class="card-title">${p.title||'โปรโมชัน'}</h5><p class="card-text">${p.description||''}</p></div>
            <div class="card-footer small text-muted">ถึง ${end.toLocaleDateString('th-TH')}</div>
          </div></div>`);
      }
    });
    const lbl = document.getElementById('promo-range-label'); if(lbl) lbl.textContent = count? `แสดงโปรโมชันที่ใช้งานอยู่ (${count})` : 'ยังไม่มีโปรโมชันที่ใช้งาน';
  });

  onSnapshot(collection(db,'services'), snap=>{
  const wrap = document.getElementById('service-cards');
  const mods = document.getElementById('service-modals');
  if(!wrap) return;
  wrap.innerHTML='';
  if (mods) mods.innerHTML='';

  snap.forEach(s=>{
    const d = s.data() || {};
    const id = s.id;
    const name = d.name || '';
    const category = d.category || '';
    const desc = d.description || '';
    const cover = d.imageUrl || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1400&auto=format&fit=crop';
    const tags = Array.isArray(d.tags) ? d.tags : [];
    const gallery = Array.isArray(d.gallery) ? d.gallery : [];

    // Card with tags and detail button
    wrap.insertAdjacentHTML('beforeend', `
      <div class="col-md-4">
        <div class="card card-clean h-100">
          ${cover ? `<img src="${cover}" class="svc-thumb" alt="">` : ``}
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
      </div>
    `);

    // Modal with optional gallery carousel
    if (mods) {
      const hasGallery = gallery.length > 0;
      mods.insertAdjacentHTML('beforeend', `
        <div class="modal fade" id="svc-${id}" tabindex="-1" aria-labelledby="svc-label-${id}" aria-hidden="true">
          <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content">
              <div class="modal-header">
                <h5 id="svc-label-${id}" class="modal-title">${name}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="ปิด"></button>
              </div>
              <div class="modal-body">
                ${hasGallery ? `
                  <div id="gal-${id}" class="carousel slide mb-3" data-bs-ride="carousel">
                    <div class="carousel-inner">
                      ${gallery.map((img,i)=>`
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
                ` : ``}
                <div class="text-muted small mb-2">${category}</div>
                <p style="white-space:pre-line">${desc}</p>
                ${tags.length ? `<div class="mt-2">${tags.map(t=>`<span class="badge bg-secondary me-1">${t}</span>`).join('')}</div>` : ``}
              </div>
            </div>
          </div>
        </div>
      `);
    }
  });
});});

  onSnapshot(collection(db,'serviceAreas'), snap=>{
    const ul = document.getElementById('area-list'); if(!ul) return; ul.innerHTML='';
    snap.forEach(a=>{ const d=a.data(); ul.insertAdjacentHTML('beforeend', `<li class="list-group-item d-flex justify-content-between"><span>${d.name||''}</span><span class="text-muted small">${d.province||''}</span></li>`); });
  });

  // ===== Reviews (approved only) =====
  (function(){
    // --- Quick paint: ใช้ cache เพนท์ก่อน แล้วค่อยรอข้อมูลจริง ---
    const CACHE_KEY = 'cacheReviewsV1';
    const homeWrap = document.getElementById('reviewList');
    const allWrap  = document.getElementById('reviewAllList');

    // helper: แปลง document -> object พร้อม timestamp สำหรับ sort
    const normalize = (r) => {
      const ts = r.createdAt?.toDate?.()
        ? r.createdAt.toDate().getTime()
        : (r.createdAt ? new Date(r.createdAt).getTime() : 0);
      return { ...r, __ts: ts };
    };

    // เรนเดอร์การ์ดรีวิว (ทั้งหน้าแรก/หน้ารวม)
    function paint(list, {initial=false}={}){
      if (!homeWrap && !allWrap) return;

      // ----- หน้ารีวิวทั้งหมด -----
      if (allWrap){
        const pageSize = Number(allWrap.dataset.pageSize || 12);
        const curPage  = Number(allWrap.dataset.page || 1);
        const slice = list.slice(0, curPage * pageSize);
        allWrap.innerHTML = slice.map(renderReviewCard).join('');

        // คำนวณค่าเฉลี่ย “ทีหลัง” เพื่อให้การ์ดขึ้นก่อน
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
              paint(list, {initial}); // re-render หน้าใหม่
            });
          }
        }
        return;
      }

      // ----- หน้าแรก (โชว์ล่าสุดตาม limit) -----
      if (homeWrap){
        const limit = Number(homeWrap.dataset.limit || 6);
        const subset = list.slice(0, limit);
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
        if (moreLink){ moreLink.style.display = list.length > limit ? '' : 'none'; }
      }
    }

    // 1) ลองเพนท์จาก cache ก่อน (เร็ว)
    try{
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
      if (cached.length){ paint(cached, {initial:true}); }
    }catch(_){/* ignore */}

    // ---- Query หลักของรีวิว (ต้องมี index: approved + createdAt desc) ----
    const qMain = query(
      collection(db,'reviews'),
      where('approved','==', true),
      orderBy('createdAt','desc')
    );

    // 2) โหลดครั้งเดียวแบบ try/catch (กัน error index) แล้วเพนท์ก่อน
    (async ()=>{
      try {
        const snap = await getDocs(qMain);           // << โหลดรอบแรกแบบครั้งเดียว
        const list = [];
        snap.forEach(d => list.push(normalize(d.data() || {})));

        // เก็บ cache (จำกัด 60)
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

        // Fallback: ตัด orderBy ออก แล้ว sort ฝั่ง client ชั่วคราว
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

    // 3) ติด onSnapshot แบบมี error handler (เผื่ออนาคต error)
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
  // ===== END Reviews =====

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
    // เก็บค่าจากฟอร์ม (มี/ไม่มีช่องไหนก็ได้ โค้ดจะกัน null ให้)
    const nameEl   = document.getElementById('reviewName');
    const ratingEl = document.getElementById('rating');
    const textEl   = document.getElementById('reviewText');
    const photoEl  = document.getElementById('reviewPhoto'); // ถ้ามีช่องแนบลิงก์รูป ให้ใส่ id="reviewPhoto"

    const name   = (nameEl?.value || '').trim() || 'ผู้ใช้';
    const rating = Math.max(1, Math.min(5, Number(ratingEl?.value || 5)));
    const text   = (textEl?.value || '').trim();
    const photo  = (photoEl?.value || '').trim();

    if (!text) { alert('กรุณากรอกรีวิว'); return; }

    const data = {
      name,
      rating,
      text,
      imageUrl: photo || null,     // แนบลิงก์รูป (ถ้ามี)
      approved: false,             // ส่งแล้วให้รออนุมัติ
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'reviews'), data);

      // เคลียร์ฟอร์ม
      if (nameEl)   nameEl.value   = '';
      if (textEl)   textEl.value   = '';
      if (photoEl)  photoEl.value  = '';
      if (ratingEl) ratingEl.value = '5';

      // ปิดโมดัล (ถ้าใช้ Bootstrap)
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

  // helper แปลงวันเวลา
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
    await addDoc(collection(db,'chatThreads', currentThreadId, 'messages'), { sender:'bot', text: 'ยินดีให้บริการ 24 ชั่วโมง ฝากข้อความไว้ได้เลยครับ', createdAt: serverTimestamp() });
  }

  async function resetUnreadUser(){
    if(!currentThreadId) return;
    await updateDoc(doc(db,'chatThreads', currentThreadId), { unreadUser: 0 });
  }
}
