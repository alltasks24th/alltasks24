// public.js — ฝั่งผู้ใช้ (realtime + chat unread + all sections visible)
import { auth, db, ensureAnonAuth } from './firebase-init.js';
import {
  collection, doc, getDoc, getDocs, addDoc, onSnapshot,
  query, where, orderBy, serverTimestamp, increment, updateDoc
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { el } from './utils.js';

let currentThreadId = localStorage.getItem('chatThreadId') || null;

// ---------- init ----------
async function init(){
  await ensureAnonAuth();
  document.getElementById('yearNow').textContent = new Date().getFullYear();
  bindRealtime();
  setupSearch(); setupBooking(); setupReview(); setupQuote(); setupChat();
}
init();

// ---------- realtime bindings ----------
function bindRealtime(){
  // Settings
  onSnapshot(doc(db,'settings','public'), snap=>{
    const d = snap.exists()? snap.data(): {};
    el('#mapEmbed') && (el('#mapEmbed').src = d.mapUrl || 'https://www.google.com/maps?q=Bangkok&output=embed');
    buildFloatingButtons(d);
  });

  // Banners
  onSnapshot(collection(db,'banners'), snap=>{
    const wrap = el('#banner-slides'); if(!wrap) return; wrap.innerHTML='';
    let i=0; snap.forEach(d=>{
      const b=d.data();
      wrap.insertAdjacentHTML('beforeend', `<div class="carousel-item ${i===0?'active':''}">
        <img src="${b.imageUrl}" class="d-block w-100" alt="banner">
        <div class="carousel-caption text-start bg-black bg-opacity-25 rounded-3 p-3">
          <h3 class="fw-bold">${b.title||''}</h3><p class="mb-0">${b.subtitle||''}</p>
        </div></div>`);
      i++;
    });
  });

  // Promotions (active only)
  onSnapshot(collection(db,'promotions'), snap=>{
    const list = el('#promo-cards'); if(!list) return; list.innerHTML='';
    let count=0, now=new Date();
    snap.forEach(docu=>{
      const p=docu.data(); const start=p.start?.toDate?.()||new Date(p.start||0); const end=p.end?.toDate?.()||new Date(p.end||0);
      if(now>=start && now<=end){
        count++;
        list.insertAdjacentHTML('beforeend', `<div class="col-md-4"><div class="card h-100">
          <img src="${p.imageUrl||'assets/img/promo.png'}" class="card-img-top"><div class="card-body">
          <h5 class="card-title">${p.title||'โปรโมชัน'}</h5><p class="card-text">${p.description||''}</p></div>
          <div class="card-footer small text-muted">ถึง ${end.toLocaleDateString('th-TH')}</div></div></div>`);
      }
    });
    el('#promo-range-label') && (el('#promo-range-label').textContent = count? `แสดงโปรโมชันที่ใช้งานอยู่ (${count})`:'ยังไม่มีโปรโมชันที่ใช้งาน');
  });

  // Services
  onSnapshot(collection(db,'services'), snap=>{
    const wrap = el('#service-cards'); if(!wrap) return; wrap.innerHTML='';
    snap.forEach(s=>{ const d=s.data(); wrap.insertAdjacentHTML('beforeend', `<div class="col-md-4"><div class="card h-100">
      <img src="${d.imageUrl||'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1400&auto=format&fit=crop'}" class="card-img-top">
      <div class="card-body"><div class="text-muted small">${d.category||''}</div><h5 class="card-title">${d.name||''}</h5><p class="card-text">${d.description||''}</p></div>
    </div></div>`); });
  });

  // Areas
  onSnapshot(collection(db,'serviceAreas'), snap=>{
    const ul = el('#area-list'); if(!ul) return; ul.innerHTML='';
    snap.forEach(a=>{ const d=a.data(); ul.insertAdjacentHTML('beforeend', `<li class="list-group-item d-flex justify-content-between"><span>${d.name}</span><span class="text-muted small">${d.province||''}</span></li>`); });
  });

  // Reviews (approved only)
  onSnapshot(collection(db,'reviews'), snap=>{
    const wrap = el('#reviewList'); if(!wrap) return; wrap.innerHTML='';
    const list=[]; snap.forEach(r=>{ const d=r.data(); if(d.approved) list.push(d); });
    let avg=0; if(list.length) avg=list.reduce((a,b)=>a+Number(b.rating||0),0)/list.length;
    el('#avgRating') && (el('#avgRating').textContent = list.length? `คะแนนเฉลี่ย ${avg.toFixed(1)}/5 จาก ${list.length} รีวิว` : 'ยังไม่มีรีวิวที่อนุมัติ');
    list.forEach(r=>{ wrap.insertAdjacentHTML('beforeend', `<div class="col-md-6"><div class="card h-100">
      ${r.imageUrl?`<img src="${r.imageUrl}" class="card-img-top">`:''}
      <div class="card-body"><div class="d-flex justify-content-between"><strong>${r.name||'ผู้ใช้'}</strong><span class="badge text-bg-success">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span></div><p class="mb-0 mt-2">${r.text||''}</p></div></div></div>`); });
  });

  // FAQ realtime
  onSnapshot(collection(db,'faqs'), snap=>{
    const acc = el('#faqAccordion'); if(!acc) return; acc.innerHTML='';
    let i=0; snap.forEach(f=>{
      const d=f.data(); const id='fq'+(++i);
      acc.insertAdjacentHTML('beforeend', `<div class="accordion-item">
        <h2 class="accordion-header"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#${id}">${d.q||''}</button></h2>
        <div id="${id}" class="accordion-collapse collapse"><div class="accordion-body">${d.a||''}</div></div></div>`);
    });
  });
}

function buildFloatingButtons(data){
  const fb = document.getElementById('floatingButtons');
  if(!fb) return;
  fb.innerHTML = `
    <a href="tel:${data.phone||''}" target="_blank"><i class="bi bi-telephone"></i> โทร</a>
    <a href="https://line.me/R/ti/p/${(data.line||'').replace('@','')}" target="_blank"><i class="bi bi-line"></i> LINE</a>
    <a href="${data.facebook||'#'}" target="_blank"><i class="bi bi-facebook"></i> Facebook</a>`;
}

// ---------- search & forms ----------
function setupSearch(){
  const btn = el('#btnSearch'); if(!btn) return;
  btn.addEventListener('click', async()=>{
    const text = (el('#searchText').value||'').toLowerCase();
    const area = (el('#searchArea').value||'').toLowerCase();
    const sSnap = await getDocs(collection(db,'services')); const aSnap = await getDocs(collection(db,'serviceAreas'));
    const sList=[]; sSnap.forEach(d=>sList.push(d.data())); const aList=[]; aSnap.forEach(d=>aList.push(d.data()));
    const sMatch = sList.filter(s=> !text || [s.name,s.category,s.description].join(' ').toLowerCase().includes(text));
    const aMatch = aList.filter(a=> !area || [a.name,a.province].join(' ').toLowerCase().includes(area));
    el('#searchResults').innerHTML = `<div class="alert alert-info">พบบริการ ${sMatch.length} และพื้นที่ ${aMatch.length}</div>`;
  });
}

function setupBooking(){
  const form = el('#bookingForm'); if(!form) return;
  form.addEventListener('submit', async (e)=>{
    e.preventDefault(); const data = Object.fromEntries(new FormData(form).entries());
    data.createdAt=serverTimestamp(); data.status='pending';
    try{ await addDoc(collection(db,'bookings'), data); form.reset(); el('#bookingMsg').textContent='ส่งคำขอแล้ว'; }
    catch(err){ el('#bookingMsg').textContent='ผิดพลาด โปรดลองใหม่'; console.error(err); }
  });
}

function setupReview(){
  const form = el('#reviewForm'); if(!form) return;
  form.addEventListener('submit', async (e)=>{
    e.preventDefault(); const data=Object.fromEntries(new FormData(form).entries());
    data.rating=Number(data.rating||5); data.approved=false; data.createdAt=serverTimestamp();
    try{ await addDoc(collection(db,'reviews'), data); form.reset(); bootstrap.Modal.getInstance(document.getElementById('reviewModal')).hide(); alert('ส่งรีวิวแล้ว รออนุมัติ'); }
    catch(err){ alert('ผิดพลาด โปรดลองอีกครั้ง'); console.error(err); }
  });
}

function setupQuote(){
  const form = el('#quoteForm'); if(!form) return;
  form.addEventListener('submit', async (e)=>{
    e.preventDefault(); const data=Object.fromEntries(new FormData(form).entries()); data.createdAt=serverTimestamp(); data.status='open';
    try{ await addDoc(collection(db,'tickets'), data); form.reset(); el('#quoteMsg').textContent='ส่งคำขอแล้ว'; }
    catch(err){ el('#quoteMsg').textContent='ผิดพลาด โปรดลองใหม่'; console.error(err); }
  });
}

// ---------- Chat (user) ----------
async function setupChat(){
  const widget = el('#chatWidget'), fab = el('#chatFab'), badge = el('#chatFabBadge');
  const body = el('#chatBody'), input = el('#chatMessage'), send = el('#chatSend'), toggleBtn = el('#toggleChat');

  function openChat(open){
    widget.classList.toggle('minimized', !open);
    if(open){ badge.style.display='none'; resetUnreadUser(); }
  }
  fab.addEventListener('click', ()=> openChat(widget.classList.contains('minimized')));
  toggleBtn.addEventListener('click', ()=> openChat(!widget.classList.contains('minimized')));

  // สร้าง thread ครั้งแรก
  if(!currentThreadId){
    const t = await addDoc(collection(db,'chatThreads'), { createdAt: serverTimestamp(), lastMessage:'เริ่มสนทนา', status:'open', uid: auth.currentUser?.uid||null, unreadAdmin: 1, unreadUser: 0 });
    currentThreadId = t.id; localStorage.setItem('chatThreadId', currentThreadId);
    await addDoc(collection(db,'chatThreads', currentThreadId, 'messages'), { sender:'bot', text:'สวัสดีค่ะ/ครับ พิมพ์ "จอง", "ราคา", "พื้นที่"', createdAt: serverTimestamp() });
  }

  // ฟังข้อความ (เฉพาะ thread ของตัวเอง)
  onSnapshot(query(collection(db,'chatThreads', currentThreadId, 'messages'), orderBy('createdAt')), snap=>{
    body.innerHTML=''; snap.forEach(m=>{ const d=m.data(); body.insertAdjacentHTML('beforeend', `<div class="chat-msg ${d.sender}">${d.text}</div>`); body.scrollTop = body.scrollHeight; });
  });

  // ฟัง unreadUser ที่ thread
  onSnapshot(doc(db,'chatThreads', currentThreadId), snap=>{
    const d=snap.data()||{}; const n = Number(d.unreadUser||0);
    if(n>0 && widget.classList.contains('minimized')){ badge.textContent=String(n); badge.style.display='inline-block'; }
  });

  async function resetUnreadUser(){
    if(!currentThreadId) return;
    await updateDoc(doc(db,'chatThreads', currentThreadId), { unreadUser: 0 });
  }

  async function autoReply(text){
    const t=text.toLowerCase(); let reply='ขอบคุณที่ติดต่อครับ/ค่ะ ทีมงานจะตอบกลับโดยเร็ว';
    if(t.includes('จอง')) reply='ไปที่ส่วน "จองงาน/นัดหมาย" แล้วกรอกฟอร์มได้เลยครับ';
    if(t.includes('ราคา')) reply='ราคาขึ้นกับบริการ/พื้นที่ กรอก "ขอใบเสนอราคา" แล้วทีมงานจะติดต่อกลับ';
    if(t.includes('พื้นที่')) reply='ดู "พื้นที่ให้บริการ + แผนที่" ในหน้าเว็บได้เลย';
    await addDoc(collection(db,'chatThreads', currentThreadId, 'messages'), { sender:'bot', text:reply, createdAt: serverTimestamp() });
    await updateDoc(doc(db,'chatThreads', currentThreadId), { unreadUser: increment(1) });
  }

  async function sendMsg(){
    const text = input.value.trim(); if(!text) return;
    await addDoc(collection(db,'chatThreads', currentThreadId, 'messages'), { sender:'user', text, createdAt: serverTimestamp() });
    await updateDoc(doc(db,'chatThreads', currentThreadId), { lastMessage: text, unreadAdmin: increment(1) });
    input.value=''; autoReply(text);
  }
  send.addEventListener('click', sendMsg);
  input.addEventListener('keypress', e=>{ if(e.key==='Enter') sendMsg(); });
}
