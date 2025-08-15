// public.js — สคริปต์ฝั่งผู้ใช้
import { auth, db, ensureAnonAuth } from './firebase-init.js';
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy, serverTimestamp, limit
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { el, els, fmtDate, id } from './utils.js';

const settingsDocRef = doc(db, 'settings', 'public');

async function init(){
  const user = await ensureAnonAuth();
  document.getElementById('yearNow').textContent = new Date().getFullYear();
  await loadSettings();
  await loadBanners();
  await loadPromotions();
  await loadServices();
  await loadAreas();
  await loadApprovedReviews();
  setupSearch();
  setupBooking();
  setupReview();
  setupQuote();
  setupChat(user);
}
init();

// ตั้งค่า/ปุ่มลอย
async function loadSettings(){
  const s = await getDoc(settingsDocRef);
  let data = s.exists() ? s.data() : {
    siteName:'รับจ้างสารพัด 24 ชั่วโมง',
    heroText:'จ้างง่าย ทำไว โปร่งใส',
    phone:'080-000-0000', line:'@yourline', facebook:'https://facebook.com/',
    mapUrl:'https://www.google.com/maps?q=Bangkok&output=embed',
    mediaPolicy:'ใช้รูปผ่านลิงก์หรือในโฟลเดอร์เท่านั้น'
  };
  el('#mapEmbed').src = data.mapUrl || 'https://www.google.com/maps?q=Bangkok&output=embed';
  const fb = el('#floatingButtons');
  fb.innerHTML = `
    <a href="tel:${data.phone||''}" target="_blank"><i class="bi bi-telephone"></i> โทร</a>
    <a href="https://line.me/R/ti/p/${(data.line||'').replace('@','')}" target="_blank"><i class="bi bi-line"></i> LINE</a>
    <a href="${data.facebook||'#'}" target="_blank"><i class="bi bi-facebook"></i> Facebook</a>
  `;
}

// แบนเนอร์ (Carousel)
async function loadBanners(){
  const snap = await getDocs(collection(db,'banners'));
  const wrap = el('#banner-slides');
  let firstSet = false;
  snap.forEach(d=>{
    const b = d.data();
    const active = !firstSet ? 'active' : '';
    wrap.insertAdjacentHTML('beforeend', `
      <div class="carousel-item ${active}">
        <img src="${b.imageUrl}" class="d-block w-100" alt="banner">
        <div class="carousel-caption text-start bg-black bg-opacity-25 rounded-3 p-3">
          <h3 class="fw-bold">${b.title||''}</h3>
          <p class="mb-0">${b.subtitle||''}</p>
        </div>
      </div>
    `);
    firstSet = true;
  });
}

// โปรโมชัน (เฉพาะที่ใช้งานช่วงวันที่)
async function loadPromotions(){
  const now = new Date();
  const list = el('#promo-cards'); list.innerHTML='';
  const qs = await getDocs(collection(db,'promotions'));
  let count=0, minDate=null, maxDate=null;
  qs.forEach(docu=>{
    const p = docu.data();
    const start = p.start?.toDate?.() || new Date(p.start||0);
    const end = p.end?.toDate?.() || new Date(p.end||0);
    const isActive = now>=start && now<=end;
    if(isActive){
      minDate = !minDate?start: (start<minDate?start:minDate);
      maxDate = !maxDate?end: (end>maxDate?end:maxDate);
      count++;
      list.insertAdjacentHTML('beforeend', `
        <div class="col-md-4">
          <div class="card h-100">
            <img src="${p.imageUrl||'assets/img/promo.png'}" class="card-img-top" alt="promo">
            <div class="card-body">
              <h5 class="card-title">${p.title||'โปรโมชัน'}</h5>
              <p class="card-text">${p.description||''}</p>
            </div>
            <div class="card-footer small text-muted">
              ใช้ได้ถึง ${end.toLocaleDateString('th-TH')}
            </div>
          </div>
        </div>
      `);
    }
  });
  el('#promo-range-label').textContent = count? `แสดงโปรโมชันที่ใช้งานอยู่ (${count} รายการ)` : 'ขณะนี้ยังไม่มีโปรโมชันที่ใช้งาน';
}

// บริการ
async function loadServices(){
  const wrap = el('#service-cards'); wrap.innerHTML='';
  const snap = await getDocs(collection(db,'services'));
  snap.forEach(s=>{
    const d = s.data();
    wrap.insertAdjacentHTML('beforeend', `
      <div class="col-md-4">
        <div class="card h-100">
          <img src="${d.imageUrl||'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1400&auto=format&fit=crop'}" class="card-img-top" alt="${d.name}">
          <div class="card-body">
            <div class="text-muted small">${d.category||''}</div>
            <h5 class="card-title">${d.name}</h5>
            <p class="card-text">${d.description||''}</p>
          </div>
        </div>
      </div>
    `);
  });
}

// พื้นที่ให้บริการ
async function loadAreas(){
  const ul = el('#area-list'); ul.innerHTML='';
  const snap = await getDocs(collection(db,'serviceAreas'));
  snap.forEach(a=>{
    const d=a.data();
    ul.insertAdjacentHTML('beforeend', `<li class="list-group-item d-flex justify-content-between"><span>${d.name}</span><span class="text-muted small">${d.province||''}</span></li>`);
  });
}

// ค้นหา
function setupSearch(){
  el('#btnSearch').addEventListener('click', async()=>{
    const text = el('#searchText').value.trim().toLowerCase();
    const area = el('#searchArea').value.trim().toLowerCase();
    const result = el('#searchResults'); result.innerHTML='';
    const sSnap = await getDocs(collection(db,'services'));
    const aSnap = await getDocs(collection(db,'serviceAreas'));
    const sList = []; sSnap.forEach(d=>sList.push({id:d.id, ...d.data()}));
    const aList = []; aSnap.forEach(d=>aList.push({id:d.id, ...d.data()}));
    const sMatch = sList.filter(s => !text || [s.name,s.category,s.description].join(' ').toLowerCase().includes(text));
    const aMatch = aList.filter(a => !area || [a.name,a.province].join(' ').toLowerCase().includes(area));
    result.insertAdjacentHTML('beforeend', `<div class="alert alert-info">พบบริการ ${sMatch.length} รายการ และพื้นที่ ${aMatch.length} รายการ</div>`);
    result.insertAdjacentHTML('beforeend', `<div class="row g-3">`+ sMatch.map(s=>`
      <div class="col-md-4"><div class="card h-100">
        <img src="${s.imageUrl||''}" class="card-img-top">
        <div class="card-body"><div class="text-muted small">${s.category||''}</div><h6 class="card-title">${s.name}</h6><p class="small mb-0">${s.description||''}</p></div>
      </div></div>`).join('') + `</div>`);
  });
}

// จองงาน
function setupBooking(){
  const form = el('#bookingForm');
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    data.createdAt = serverTimestamp();
    data.status = 'pending';
    try{
      await addDoc(collection(db,'bookings'), data);
      el('#bookingMsg').textContent = 'ส่งคำขอเรียบร้อย รอการยืนยันจากแอดมิน';
      form.reset();
    }catch(err){
      el('#bookingMsg').textContent = 'เกิดข้อผิดพลาด โปรดลองใหม่';
      console.error(err);
    }
  });
}

// รีวิว
async function loadApprovedReviews(){
  const wrap = el('#reviewList'); wrap.innerHTML='';
  const snap = await getDocs(collection(db,'reviews'));
  const list = [];
  snap.forEach(r=>{ const d=r.data(); if(d.approved){ list.push(d); } });
  let avg = 0; if(list.length){ avg = list.reduce((a,b)=>a+Number(b.rating||0),0)/list.length; }
  el('#avgRating').textContent = list.length? `คะแนนเฉลี่ย ${avg.toFixed(1)}/5 จาก ${list.length} รีวิว` : 'ยังไม่มีรีวิวที่อนุมัติ';
  list.forEach(r=>{
    wrap.insertAdjacentHTML('beforeend',`
      <div class="col-md-6">
        <div class="card h-100">
          ${r.imageUrl? `<img src="${r.imageUrl}" class="card-img-top" alt="review">` : ''}
          <div class="card-body">
            <div class="d-flex align-items-center justify-content-between">
              <strong>${r.name||'ผู้ใช้'}</strong>
              <span class="badge text-bg-success">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span>
            </div>
            <p class="mb-0 mt-2">${r.text||''}</p>
          </div>
        </div>
      </div>
    `);
  });
}

function setupReview(){
  const form = el('#reviewForm');
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    data.rating = Number(data.rating||5);
    data.approved = false;
    data.createdAt = serverTimestamp();
    try{
      await addDoc(collection(db,'reviews'), data);
      form.reset();
      const modal = bootstrap.Modal.getInstance(document.getElementById('reviewModal'));
      modal.hide();
      alert('ส่งรีวิวเรียบร้อย รอการอนุมัติ');
    }catch(err){ alert('เกิดข้อผิดพลาด'); console.error(err); }
  });
}

// Quote / Issue
function setupQuote(){
  const form = el('#quoteForm');
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    data.createdAt = serverTimestamp();
    data.status = 'open';
    try{
      await addDoc(collection(db,'tickets'), data);
      form.reset();
      el('#quoteMsg').textContent = 'ส่งคำขอเรียบร้อย';
    }catch(err){ el('#quoteMsg').textContent = 'เกิดข้อผิดพลาด'; console.error(err); }
  });
}

// Live Chat (เก็บข้อความใน Firestore) + Auto-reply ง่ายๆ
let currentThreadId = localStorage.getItem('chatThreadId') || null;

async function setupChat(user){
  const body = el('#chatBody');
  const input = el('#chatMessage');
  const send = el('#chatSend');
  el('#toggleChat').addEventListener('click', ()=>{
    const w = document.getElementById('chatWidget');
    w.classList.toggle('minimized');
    const icon = w.classList.contains('minimized') ? 'plus-lg' : 'dash-lg';
    document.getElementById('toggleChat').innerHTML = `<i class="bi bi-${icon}"></i>`;
  });

  if(!currentThreadId){
    // สร้าง thread ใหม่
    const t = await addDoc(collection(db,'chatThreads'), {
      createdAt: serverTimestamp(),
      lastMessage: 'เปิดการสนทนาใหม่',
      status: 'open',
      uid: user?.uid || null
    });
    currentThreadId = t.id;
    localStorage.setItem('chatThreadId', currentThreadId);
    // ส่งข้อความต้อนรับ
    await addDoc(collection(db,'chatThreads', currentThreadId, 'messages'), {
      sender:'bot', text:'สวัสดีค่ะ/ครับ มีอะไรให้ช่วยไหม? พิมพ์ "จอง", "ราคา", "เขตบริการ" เพื่อรับลิงก์ด่วน', createdAt: serverTimestamp()
    });
  }

  // Listen messages
  onSnapshot(query(collection(db,'chatThreads', currentThreadId, 'messages'), orderBy('createdAt')), snap=>{
    body.innerHTML='';
    snap.forEach(m=>{
      const d = m.data();
      body.insertAdjacentHTML('beforeend', `<div class="chat-msg ${d.sender}">${d.text}</div>`);
      body.scrollTop = body.scrollHeight;
    });
  });

  async function autoReply(text){
    const t = text.toLowerCase();
    let reply = 'ขอบคุณที่ติดต่อค่ะ/ครับ ทีมงานจะตอบกลับโดยเร็ว';
    if(t.includes('จอง')) reply = 'ไปที่ส่วน "จองงาน/นัดหมาย" ด้านล่างหน้า หรือกรอกฟอร์มนี้ได้เลยครับ';
    if(t.includes('ราคา')) reply = 'ราคาขึ้นกับบริการ/พื้นที่ กรุณากรอกรายละเอียดใน "ขอใบเสนอราคา" แล้วเราจะติดต่อกลับ';
    if(t.includes('เขต') || t.includes('พื้นที่')) reply = 'ดู "พื้นที่ให้บริการ + แผนที่" ได้ในหน้าเว็บ และค้นหาพื้นที่ได้จากช่องค้นหา';
    await addDoc(collection(db,'chatThreads', currentThreadId, 'messages'), { sender:'bot', text: reply, createdAt: serverTimestamp() });
  }

  async function sendMsg(){
    const text = input.value.trim(); if(!text) return;
    await addDoc(collection(db,'chatThreads', currentThreadId, 'messages'), { sender:'user', text, createdAt: serverTimestamp() });
    input.value=''; autoReply(text);
  }
  send.addEventListener('click', sendMsg);
  input.addEventListener('keypress', e=>{ if(e.key==='Enter') sendMsg(); });
}
