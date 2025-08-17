// public.js — ฝั่งผู้ใช้ (Realtime + Chat + Reviews + Service Detail)
// ---------------------------------------------------------------
// ✨ เพิ่ม: ปุ่ม "ดูรายละเอียด" บนการ์ดบริการ + โมดัลรายละเอียด
// ✨ เพิ่ม: แกลเลอรีภาพ (Carousel) + Tags
// ✨ เพิ่ม: ผูกชื่อบริการเข้าแบบฟอร์มจองอัตโนมัติ + นับยอดเปิดดู
// ---------------------------------------------------------------

import { auth, db, ensureAnonAuth } from './firebase-init.js';
import {
  collection, doc, getDoc, getDocs, addDoc, onSnapshot,
  query, where, orderBy, serverTimestamp, increment, updateDoc, limit
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { el } from './utils.js';

const settingsRef = doc(db, 'settings', 'public');
let currentThreadId = localStorage.getItem('chatThreadIdV2') || null;
let sessionId = localStorage.getItem('sessionId') || null;

// เก็บ service ทั้งหมดในหน่วยความจำสำหรับเปิดโมดัลเร็วๆ
const serviceCache = new Map();

async function init(){
  const user = await ensureAnonAuth();
  if(!sessionId){
    sessionId = Math.random().toString(36).slice(2);
    localStorage.setItem('sessionId', sessionId);
  }
  const y = document.getElementById('yearNow'); if(y) y.textContent = new Date().getFullYear();

  await loadSettings();
  bindRealtime();
  setupSearch();
  setupBooking();
  setupReview();
  setupQuote();
  setupChat(user);
  setupServiceDetailModal(); // ✅ เตรียมโมดัลรายละเอียด (สร้างอัตโนมัติถ้ายังไม่มี)
}
init();

// ---------- Settings ----------
async function loadSettings(){
  const s = await getDoc(settingsRef);
  const data = s.exists()? s.data(): {
    phone:'0800000000',
    line:'@yourline',
    facebook:'https://facebook.com/',
    mapUrl:'https://www.google.com/maps?q=Bangkok&output=embed'
  };
  const m = el('#mapEmbed'); if(m) m.src = data.mapUrl||'';
  const call = el('#fabCall'); if(call) call.href = `tel:${data.phone||''}`;
  const line = el('#fabLine'); if(line) line.href = `https://line.me/R/ti/p/${(data.line||'').replace('@','')}`;
  const fb = el('#fabFb'); if(fb) fb.href = data.facebook||'#';
}

// ---------- Realtime bindings ----------
function bindRealtime(){
  // Banners
  onSnapshot(collection(db,'banners'), snap=>{
    const wrap = el('#banner-slides'); if(!wrap) return; wrap.innerHTML='';
    let i=0; snap.forEach(d=>{
      const b=d.data();
      wrap.insertAdjacentHTML('beforeend', `
        <div class="carousel-item ${i===0?'active':''}">
          <img src="${b.imageUrl||''}" class="d-block w-100" alt="">
          <div class="carousel-caption text-start bg-black bg-opacity-25 rounded-3 p-3">
            <h3 class="fw-bold">${b.title||''}</h3><p class="mb-0">${b.subtitle||''}</p>
          </div>
        </div>`);
      i++;
    });
  });

  // Promotions (active only)
  onSnapshot(collection(db,'promotions'), snap=>{
    const list = el('#promo-cards'); if(!list) return; list.innerHTML='';
    let count=0, now=new Date();
    snap.forEach(docu=>{
      const p=docu.data();
      const start = p.start?.toDate?.() ? p.start.toDate() : (p.start? new Date(p.start): new Date(0));
      const end   = p.end?.toDate?.()   ? p.end.toDate()   : (p.end? new Date(p.end): new Date(0));
      if(now>=start && now<=end){
        count++;
        list.insertAdjacentHTML('beforeend', `
          <div class="col-md-4">
            <div class="card h-100">
              <img src="${p.imageUrl||'assets/img/promo.png'}" class="card-img-top" alt="">
              <div class="card-body">
                <h5 class="card-title">${p.title||'โปรโมชัน'}</h5>
                <p class="card-text">${p.description||''}</p>
              </div>
              <div class="card-footer small text-muted">ถึง ${end.toLocaleDateString('th-TH')}</div>
            </div>
          </div>`);
      }
    });
    const lbl = el('#promo-range-label');
    if(lbl) lbl.textContent = count? `แสดงโปรโมชันที่ใช้งานอยู่ (${count})` : 'ยังไม่มีโปรโมชันที่ใช้งาน';
  });

  // Services (✅ ใส่ปุ่มดูรายละเอียด + เก็บ cache)
  onSnapshot(collection(db,'services'), snap=>{
    const wrap = el('#service-cards'); if(!wrap) return; wrap.innerHTML='';
    serviceCache.clear();

    snap.forEach(docu=>{
      const id = docu.id;
      const d  = docu.data();

      // cache
      serviceCache.set(id, {
        id,
        name: d.name || '',
        category: d.category || '',
        description: d.description || '',
        imageUrl: d.imageUrl || '',
        // รองรับทั้ง array และ string
        gallery: Array.isArray(d.gallery) ? d.gallery :
                 (typeof d.gallery === 'string' ? d.gallery.split('\n').map(s=>s.trim()).filter(Boolean) : []),
        tags: Array.isArray(d.tags) ? d.tags :
              (typeof d.tags === 'string' ? d.tags.split(',').map(s=>s.trim()).filter(Boolean) : []),
        views: d.views || 0
      });

      wrap.insertAdjacentHTML('beforeend', `
        <div class="col-md-4">
          <div class="card h-100">
            <img src="${d.imageUrl||'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1400&auto=format&fit=crop'}" class="svc-thumb" alt="">
            <div class="card-body">
              <div class="text-muted small">${d.category||''}</div>
              <h5 class="card-title">${d.name||''}</h5>
              <p class="card-text">${(d.description||'').slice(0,120)}${(d.description||'').length>120?'...':''}</p>
              <div class="d-flex gap-2 mt-2 flex-wrap">
                ${(Array.isArray(d.tags)? d.tags: (typeof d.tags==='string'? d.tags.split(',').map(s=>s.trim()):[]))
                    .slice(0,3)
                    .map(t=>`<span class="badge text-bg-light border">${t}</span>`).join('')}
              </div>
            </div>
            <div class="card-footer bg-white border-0 pt-0 pb-3 px-3">
              <button class="btn btn-outline-primary btn-sm w-100 btn-svc-detail" data-id="${id}">
                ดูรายละเอียด
              </button>
            </div>
          </div>
        </div>
      `);
    });
  });

  // Areas
  onSnapshot(collection(db,'serviceAreas'), snap=>{
    const ul = el('#area-list'); if(!ul) return; ul.innerHTML='';
    snap.forEach(a=>{
      const d=a.data();
      ul.insertAdjacentHTML('beforeend', `
        <li class="list-group-item d-flex justify-content-between">
          <span>${d.name||''}</span><span class="text-muted small">${d.province||''}</span>
        </li>`);
    });
  });

  // Reviews (approved only) — แสดงหน้าแรก
  onSnapshot(
    query(collection(db,'reviews'), where('approved','==',true), orderBy('createdAt','desc'), limit(6)),
    snap=>{
      const wrap = el('#reviewList'); if(!wrap) return; wrap.innerHTML='';
      const list=[]; snap.forEach(r=>list.push(r.data()));
      let avg=0; if(list.length) avg=list.reduce((a,b)=>a+Number(b.rating||0),0)/list.length;
      const avgEl = el('#avgRating');
      if(avgEl) avgEl.textContent = list.length? `คะแนนเฉลี่ย ${avg.toFixed(1)}/5 จาก ${list.length} รีวิว` : 'ยังไม่มีรีวิวที่อนุมัติ';

      list.forEach(r=>{
        wrap.insertAdjacentHTML('beforeend', `
          <div class="col-md-6">
            <div class="card h-100">
              ${r.imageUrl?`<img src="${r.imageUrl}" class="card-img-top" alt="รีวิว">`:''}
              <div class="card-body">
                <div class="d-flex justify-content-between">
                  <strong>${r.name||'ผู้ใช้'}</strong>
                  <span class="badge text-bg-success">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span>
                </div>
                <p class="mb-0 mt-2">${r.text||''}</p>
              </div>
            </div>
          </div>`);
      });
    }
  );

  // FAQ realtime
  onSnapshot(collection(db,'faqs'), snap=>{
    const acc = el('#faqAccordion'); if(!acc) return; acc.innerHTML='';
    let i=0; snap.forEach(f=>{
      const d=f.data(); const id='fq'+(++i);
      acc.insertAdjacentHTML('beforeend', `
        <div class="accordion-item">
          <h2 class="accordion-header">
            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#${id}">
              ${d.q||''}
            </button>
          </h2>
          <div id="${id}" class="accordion-collapse collapse">
            <div class="accordion-body">${d.a||''}</div>
          </div>
        </div>`);
    });
  });
}

// ---------- Search ----------
function setupSearch(){
  const btn = el('#btnSearch'); if(!btn) return;
  btn.addEventListener('click', async()=>{
    const text = (el('#searchText').value||'').toLowerCase();
    const area = (el('#searchArea').value||'').toLowerCase();
    const sSnap = await getDocs(collection(db,'services'));
    const aSnap = await getDocs(collection(db,'serviceAreas'));
    const sList=[]; sSnap.forEach(d=>sList.push(d.data()));
    const aList=[]; aSnap.forEach(d=>aList.push(d.data()));
    const sMatch = sList.filter(s=> !text || [s.name,s.category,s.description].join(' ').toLowerCase().includes(text));
    const aMatch = aList.filter(a=> !area || [a.name,a.province].join(' ').toLowerCase().includes(area));
    el('#searchResults').innerHTML = `<div class="alert alert-info">พบบริการ ${sMatch.length} และพื้นที่ ${aMatch.length}</div>`;
  });
}

// ---------- Booking ----------
function setupBooking(){
  const form = el('#bookingForm'); if(!form) return;
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    data.createdAt=serverTimestamp(); data.status='pending';
    try{
      await addDoc(collection(db,'bookings'), data);
      form.reset();
      el('#bookingMsg').textContent='ส่งคำขอแล้ว';
    }catch(err){
      el('#bookingMsg').textContent='ผิดพลาด โปรดลองใหม่';
      console.error(err);
    }
  });
}

// ---------- Review ----------
function setupReview(){
  const saveBtn = document.getElementById('saveReview'); if(!saveBtn) return;
  saveBtn.addEventListener('click', async ()=>{
    const name = (document.getElementById('reviewName')?.value || '').trim();
    const rating=Number(document.getElementById('rating').value||5);
    const text=document.getElementById('reviewText').value.trim();
    if(!text){ alert('กรุณากรอกรีวิว'); return; }
    const data={ name, rating, text, approved:false, createdAt: serverTimestamp() };
    try{
      await addDoc(collection(db,'reviews'), data);
      document.getElementById('reviewText').value='';
      const m = document.getElementById('reviewModal');
      if(m && window.bootstrap){ window.bootstrap.Modal.getInstance(m)?.hide(); }
      alert('ส่งรีวิวแล้ว รออนุมัติ');
    }catch(err){
      alert('ผิดพลาด โปรดลองอีกครั้ง'); console.error(err);
    }
  });
}

// ---------- Quote / Ticket ----------
function setupQuote(){
  const form = el('#quoteForm'); if(!form) return;
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const data=Object.fromEntries(new FormData(form).entries());
    data.createdAt=serverTimestamp(); data.status='open';
    try{
      await addDoc(collection(db,'tickets'), data);
      form.reset();
      el('#quoteMsg').textContent='ส่งคำขอแล้ว';
    }catch(err){
      el('#quoteMsg').textContent='ผิดพลาด โปรดลองใหม่'; console.error(err);
    }
  });
}

// ---------- Chat (user) ----------
async function setupChat(user){
  const widget = el('#chatWidget'),
        fab = el('#fabChat'),
        badge = el('#fabChatBadge'),
        body = el('#chatBody'),
        input = el('#chatMessage'),
        send = el('#chatSend'),
        toggleBtn = el('#toggleChat');

  if(!widget || !fab || !body || !input || !send || !toggleBtn){ return; }

  // เริ่ม: ปิดอยู่
  widget.classList.remove('open');

  function openChat(open){
    widget.classList.toggle('open', open);
    if(open){ badge && (badge.style.display='none'); resetUnreadUser(); }
  }
  fab.addEventListener('click', ()=> openChat(!widget.classList.contains('open')));
  toggleBtn.addEventListener('click', ()=> openChat(false));

  // สร้าง thread ครั้งแรก
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

  // ฟังข้อความ
  onSnapshot(query(collection(db,'chatThreads', currentThreadId, 'messages'), orderBy('createdAt','asc')), snap=>{
    body.innerHTML='';
    snap.forEach(m=>{
      const d=m.data();
      body.insertAdjacentHTML('beforeend', `
        <div class="chat-msg ${d.sender}">
          <div class="bubble">
            <div class="meta">${d.sender==='admin'?'แอดมิน':(d.sender==='bot'?'ระบบ':'ผู้ใช้')}
              • ${d.createdAt?.toDate?.()? d.createdAt.toDate().toLocaleString('th-TH',{dateStyle:'short',timeStyle:'short'}) : ''}</div>
            <div class="text">${d.text}</div>
          </div>
        </div>`);
      body.scrollTop = body.scrollHeight;
    });
  });

  // ฟังยอดค้างอ่าน (ผู้ใช้)
  onSnapshot(doc(db,'chatThreads', currentThreadId), snap=>{
    const d=snap.data()||{}; const n = Number(d.unreadUser||0);
    if(!widget.classList.contains('open') && n>0){
      if(badge){ badge.textContent=String(n); badge.style.display='inline-block'; }
    }else{
      if(badge) badge.style.display='none';
    }
  });

  async function sendMsg(){
    const text = input.value.trim(); if(!text) return;
    await addDoc(collection(db,'chatThreads', currentThreadId, 'messages'), { sender:'user', text, createdAt: serverTimestamp() });
    await updateDoc(doc(db,'chatThreads', currentThreadId), { lastMessage: text, unreadAdmin: increment(1) });
    input.value='';
  }
  send.addEventListener('click', sendMsg);
  input.addEventListener('keypress', e=>{ if(e.key==='Enter') sendMsg(); });

  // ต้อนรับครั้งเดียว
  if(createdNow){
    await addDoc(collection(db,'chatThreads', currentThreadId, 'messages'), {
      sender:'bot', text: 'ยินดีให้บริการ 24 ชั่วโมง ฝากข้อความไว้ได้เลยครับ', createdAt: serverTimestamp()
    });
  }

  async function resetUnreadUser(){
    if(!currentThreadId) return;
    await updateDoc(doc(db,'chatThreads', currentThreadId), { unreadUser: 0 });
  }
}

// =====================================================
//                SERVICE DETAIL (Modal)
// =====================================================
function setupServiceDetailModal(){
  // ถ้ายังไม่มี modal ใน DOM ให้สร้างแบบง่ายๆ
  if(!document.getElementById('svcDetailModal')){
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal fade" id="svcDetailModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-scrollable">
          <div class="modal-content">
            <div class="modal-header">
              <h5 id="svcTitle" class="modal-title">รายละเอียดบริการ</h5>
              <button class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <!-- Carousel -->
              <div id="svcCarousel" class="carousel slide mb-3" data-bs-ride="carousel">
                <div class="carousel-inner" id="svcCarouselInner"></div>
                <button class="carousel-control-prev" type="button" data-bs-target="#svcCarousel" data-bs-slide="prev">
                  <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                  <span class="visually-hidden">Previous</span>
                </button>
                <button class="carousel-control-next" type="button" data-bs-target="#svcCarousel" data-bs-slide="next">
                  <span class="carousel-control-next-icon" aria-hidden="true"></span>
                  <span class="visually-hidden">Next</span>
                </button>
              </div>

              <div class="mb-2" id="svcTags"></div>
              <p id="svcDesc" class="mb-0"></p>
            </div>
            <div class="modal-footer">
              <button id="svcBookBtn" class="btn btn-primary">นัดหมายบริการนี้</button>
            </div>
          </div>
        </div>
      </div>
    `);
  }

  // จับคลิกปุ่มดูรายละเอียด (event delegation)
  document.addEventListener('click', async (e)=>{
    const btn = e.target.closest('.btn-svc-detail'); if(!btn) return;
    const id = btn.getAttribute('data-id'); if(!id) return;

    const sv = serviceCache.get(id);
    if(!sv){
      // fallback โหลดเดี่ยวๆ
      const snap = await getDoc(doc(db,'services', id));
      if(!snap.exists()) return;
      serviceCache.set(id, snap.data());
    }
    openServiceModal(id);
  });

  // ปุ่ม “นัดหมายบริการนี้”
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('#svcBookBtn'); if(!btn) return;
    const title = btn.getAttribute('data-title') || '';
    const inp = document.querySelector('#bookingForm [name="service"]');
    if(inp){ inp.value = title; }
    // โฟกัสไปฟอร์มจอง (ถ้ามี anchor)
    const book = document.getElementById('bookingForm');
    if(book){ book.scrollIntoView({behavior:'smooth', block:'start'}); }
    // ปิดโมดัล
    const modalEl = document.getElementById('svcDetailModal');
    if(modalEl && window.bootstrap){ window.bootstrap.Modal.getInstance(modalEl)?.hide(); }
  });
}

async function openServiceModal(id){
  const sv = serviceCache.get(id);
  if(!sv) return;

  // เติมหัว/รายละเอียด
  const ttl = document.getElementById('svcTitle'); if(ttl) ttl.textContent = sv.name || 'รายละเอียดบริการ';
  const desc= document.getElementById('svcDesc'); if(desc) desc.textContent = sv.description || '';

  // เติม tags
  const tagsWrap = document.getElementById('svcTags');
  if(tagsWrap){
    const tags = Array.isArray(sv.tags)? sv.tags : (typeof sv.tags==='string'? sv.tags.split(',').map(s=>s.trim()).filter(Boolean):[]);
    tagsWrap.innerHTML = tags.length? tags.map(t=>`<span class="badge text-bg-light border me-1 mb-1">${t}</span>`).join('') : '';
  }

  // Carousel: รวมภาพหลัก + แกลเลอรี
  const inner = document.getElementById('svcCarouselInner');
  if(inner){
    const images = [];
    if(sv.imageUrl) images.push(sv.imageUrl);
    const gal = Array.isArray(sv.gallery)? sv.gallery :
                (typeof sv.gallery==='string'? sv.gallery.split('\n').map(s=>s.trim()).filter(Boolean):[]);
    images.push(...gal);

    if(images.length===0){
      // ใส่ภาพ placeholder
      images.push('https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1400&auto=format&fit=crop');
    }

    inner.innerHTML = images.map((src,idx)=>`
      <div class="carousel-item ${idx===0?'active':''}">
        <img src="${src}" class="d-block w-100" alt="">
      </div>`).join('');
  }

  // ผูกชื่อไปปุ่มนัดหมาย
  const bookBtn = document.getElementById('svcBookBtn');
  if(bookBtn){ bookBtn.setAttribute('data-title', sv.name || ''); }

  // นับยอดดู
  try{ await updateDoc(doc(db,'services', id), { views: increment(1) }); }catch(_){}

  // เปิดโมดัล
  const modalEl = document.getElementById('svcDetailModal');
  if(modalEl && window.bootstrap){
    new bootstrap.Modal(modalEl).show();
  }else{
    modalEl?.classList.add('show');
    modalEl?.setAttribute('style','display:block');
  }
}

// ---------------------------------------------------------------
//                 หน้ารวมรีวิว (reviews.html) 
//  (ยังคงใช้ logic ที่มีอยู่ของคุณได้ตามเดิม ไม่มีการแก้ส่วนนี้ในไฟล์นี้)
// ---------------------------------------------------------------

// (ปล่อยว่างไว้ เพราะหน้า reviews.html จะเรียก public.js เช่นกัน
//  และโค้ดดึงรีวิวแบบหน้าแรก/ปุ่มโหลดเพิ่มคุณตั้งไว้อีกส่วนอยู่แล้ว)
