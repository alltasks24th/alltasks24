// public.js — ฝั่งผู้ใช้ (realtime + chat r6)
import { auth, db, ensureAnonAuth } from './firebase-init.js';
import {
  collection, doc, getDoc, getDocs, addDoc, onSnapshot,
  query, where, orderBy, serverTimestamp, increment, updateDoc
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { el } from './utils.js';

const settingsRef = doc(db, 'settings', 'public');
let currentThreadId = localStorage.getItem('chatThreadIdV2') || null;
let sessionId = localStorage.getItem('sessionId') || null;

async function init(){
  const user = await ensureAnonAuth();
  if(!sessionId){
    sessionId = Math.random().toString(36).slice(2);
    localStorage.setItem('sessionId', sessionId);
  }
  const y = document.getElementById('yearNow');
  if(y) y.textContent = new Date().getFullYear();
  await loadSettings();
  bindRealtime();
  setupSearch(); setupBooking(); setupReview(); setupQuote();
  setupChat(user);
}
init();

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

function bindRealtime(){
  // Banners
  onSnapshot(collection(db,'banners'), snap=>{
    const wrap = el('#banner-slides'); if(!wrap) return; wrap.innerHTML='';
    let i=0; snap.forEach(d=>{
      const b=d.data();
      wrap.insertAdjacentHTML('beforeend', `<div class="carousel-item ${i===0?'active':''}">
        <img src="${b.imageUrl||''}" class="d-block w-100" alt="">
        <div class="carousel-caption text-start bg-black bg-opacity-25 rounded-3 p-3">
          <h3 class="fw-bold">${b.title||''}</h3><p class="mb-0">${b.subtitle||''}</p>
        </div></div>`);
      i++;
    });
  });

  // Promotions
  onSnapshot(collection(db,'promotions'), snap=>{
    const list = el('#promo-cards'); if(!list) return; list.innerHTML='';
    let count=0, now=new Date();
    snap.forEach(docu=>{
      const p=docu.data();
      const start = p.start?.toDate?.() ? p.start.toDate() : (p.start? new Date(p.start): new Date(0));
      const end   = p.end?.toDate?.()   ? p.end.toDate()   : (p.end? new Date(p.end): new Date(0));
      if(now>=start && now<=end){
        count++;
        list.insertAdjacentHTML('beforeend', `<div class="col-md-4">
          <div class="card h-100">
            <img src="${p.imageUrl||'assets/img/promo.png'}" class="card-img-top" alt="">
            <div class="card-body"><h5 class="card-title">${p.title||'โปรโมชัน'}</h5><p class="card-text">${p.description||''}</p></div>
            <div class="card-footer small text-muted">ถึง ${end.toLocaleDateString('th-TH')}</div>
          </div></div>`);
      }
    });
    const lbl = el('#promo-range-label');
    if(lbl) lbl.textContent = count? `แสดงโปรโมชันที่ใช้งานอยู่ (${count})` : 'ยังไม่มีโปรโมชันที่ใช้งาน';
  });

  // Services
  onSnapshot(collection(db,'services'), snap=>{
    const wrap = el('#service-cards'); if(!wrap) return; wrap.innerHTML='';
    snap.forEach(s=>{
      const d=s.data();
      wrap.insertAdjacentHTML('beforeend', `<div class="col-md-4">
        <div class="card h-100">
          <img src="${d.imageUrl||'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1400&auto=format&fit=crop'}" class="card-img-top" alt="">
          <div class="card-body">
            <div class="text-muted small">${d.category||''}</div>
            <h5 class="card-title">${d.name||''}</h5>
            <p class="card-text">${d.description||''}</p>
          </div>
        </div></div>`);
    });
  });

  // Areas
  onSnapshot(collection(db,'serviceAreas'), snap=>{
    const ul = el('#area-list'); if(!ul) return; ul.innerHTML='';
    snap.forEach(a=>{
      const d=a.data();
      ul.insertAdjacentHTML('beforeend', `<li class="list-group-item d-flex justify-content-between"><span>${d.name||''}</span><span class="text-muted small">${d.province||''}</span></li>`);
    });
  });

  // Reviews (approved only)
  onSnapshot(query(collection(db,'reviews'), where('approved','==',true), orderBy('createdAt','asc')), snap=>{
    const wrap = el('#reviewList'); if(!wrap) return; wrap.innerHTML='';
    const list=[]; snap.forEach(r=>list.push(r.data()));
    let avg=0; if(list.length) avg=list.reduce((a,b)=>a+Number(b.rating||0),0)/list.length;
    const avgEl = el('#avgRating');
    if(avgEl) avgEl.textContent = list.length? `คะแนนเฉลี่ย ${avg.toFixed(1)}/5 จาก ${list.length} รีวิว` : 'ยังไม่มีรีวิวที่อนุมัติ';
    list.forEach(r=>{
      wrap.insertAdjacentHTML('beforeend', `<div class="col-md-6"><div class="card h-100">
        ${r.imageUrl?`<img src="${r.imageUrl}" class="card-img-top" alt="รีวิว">`:''}
        <div class="card-body">
          <div class="d-flex justify-content-between"><strong>${r.name||'ผู้ใช้'}</strong><span class="badge text-bg-success">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span></div>
          <p class="mb-0 mt-2">${r.text||''}</p>
        </div></div></div>`);
    });
  });

  // FAQ realtime
  onSnapshot(collection(db,'faqs'), snap=>{
    const acc = el('#faqAccordion'); if(!acc) return; acc.innerHTML='';
    let i=0; snap.forEach(f=>{
      const d=f.data(); const id='fq'+(++i)+'_'+f.id;
      acc.insertAdjacentHTML('beforeend', `<div class="accordion-item">
        <h2 class="accordion-header"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#${id}">${d.q||''}</button></h2>
        <div id="${id}" class="accordion-collapse collapse"><div class="accordion-body">${d.a||''}</div></div>
      </div>`);
    });
  });
}

// ---------- search & forms ----------
function setupSearch(){ ... } // (คงเดิม)

function setupBooking(){ ... } // (คงเดิม)

function setupReview(){ ... } // (คงเดิม)

function setupQuote(){ ... } // (คงเดิม)

// ---------- Chat ----------
async function setupChat(user){
  const widget = el('#chatWidget'),
        fab = el('#fabChat'),
        badge = el('#fabChatBadge'),
        body = el('#chatBody'),
        input = el('#chatMessage'),
        send = el('#chatSend'),
        toggleBtn = el('#toggleChat');

  if(!widget || !fab || !body || !input || !send || !toggleBtn){ return; }

  widget.classList.remove('open'); // เริ่มปิด

  function openChat(open){
    widget.classList.toggle('open', open);
    if(open){ badge && (badge.style.display='none'); resetUnreadUser(); }
  }
  fab.addEventListener('click', ()=> openChat(!widget.classList.contains('open')));
  toggleBtn.addEventListener('click', ()=> openChat(false));

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

  onSnapshot(query(collection(db,'chatThreads', currentThreadId, 'messages'), orderBy('createdAt','asc')), snap=>{
    body.innerHTML='';
    snap.forEach(m=>{
      const d=m.data();
      body.insertAdjacentHTML('beforeend', `<div class="chat-msg ${d.sender}">${d.text}</div>`);
      body.scrollTop = body.scrollHeight;
    });
  });

  onSnapshot(doc(db,'chatThreads', currentThreadId), snap=>{
    const d=snap.data()||{};
    const n = Number(d.unreadUser||0);
    if(!widget.classList.contains('open') && n>0){
      if(badge){ badge.textContent=String(n); badge.style.display='inline-block'; }
    } else { if(badge) badge.style.display='none'; }
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
    await addDoc(collection(db,'chatThreads', currentThreadId, 'messages'), {
      sender:'bot',
      text: 'ยินดีให้บริการ 24 ชั่วโมง ฝากข้อความไว้ได้เลยครับ',
      createdAt: serverTimestamp()
    });
  }

  async function resetUnreadUser(){
    if(!currentThreadId) return;
    await updateDoc(doc(db,'chatThreads', currentThreadId), { unreadUser: 0 });
  }
}
