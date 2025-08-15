// public.js — สคริปต์ฝั่งผู้ใช้
import { auth, db, ensureAnonAuth } from './firebase-init.js';
import {
  collection, doc, getDoc, getDocs, addDoc, onSnapshot,
  query, where, orderBy, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { el } from './utils.js';

const settingsDocRef = doc(db, 'settings', 'public');

async function init(){
  const user = await ensureAnonAuth();
  document.getElementById('yearNow').textContent = new Date().getFullYear();
  await loadSettings(); await loadBanners(); await loadPromotions(); await loadServices(); await loadAreas(); await loadApprovedReviews();
  setupSearch(); setupBooking(); setupReview(); setupQuote(); setupChat(user);
}
init();

async function loadSettings(){
  const s = await getDoc(settingsDocRef);
  let data = s.exists() ? s.data() : {
    siteName:'รับจ้างสารพัด 24 ชั่วโมง', heroText:'จ้างง่าย ทำไว โปร่งใส',
    phone:'080-000-0000', line:'@yourline', facebook:'https://facebook.com/',
    mapUrl:'https://www.google.com/maps?q=Bangkok&output=embed', mediaPolicy:'ใช้รูปผ่านลิงก์หรือในโฟลเดอร์เท่านั้น'
  };
  el('#mapEmbed').src = data.mapUrl;
  el('#floatingButtons').innerHTML = `
    <a href="tel:${data.phone||''}" target="_blank"><i class="bi bi-telephone"></i> โทร</a>
    <a href="https://line.me/R/ti/p/${(data.line||'').replace('@','')}" target="_blank"><i class="bi bi-line"></i> LINE</a>
    <a href="${data.facebook||'#'}" target="_blank"><i class="bi bi-facebook"></i> Facebook</a>`;
}

async function loadBanners(){
  const snap = await getDocs(collection(db,'banners'));
  const wrap = el('#banner-slides');
  let firstSet = false;
  snap.forEach(d=>{
    const b = d.data(); const active = !firstSet? 'active':'';
    wrap.insertAdjacentHTML('beforeend', `<div class="carousel-item ${active}"><img src="${b.imageUrl}" class="d-block w-100"><div class="carousel-caption text-start bg-black bg-opacity-25 rounded-3 p-3"><h3 class="fw-bold">${b.title||''}</h3><p class="mb-0">${b.subtitle||''}</p></div></div>`);
    firstSet = true;
  });
}

async function loadPromotions(){
  const now = new Date(); const list = el('#promo-cards'); list.innerHTML='';
  const qs = await getDocs(collection(db,'promotions')); let count=0;
  qs.forEach(docu=>{
    const p = docu.data(); const start = p.start?.toDate?.() || new Date(p.start||0); const end = p.end?.toDate?.() || new Date(p.end||0);
    if(now>=start && now<=end){ count++; list.insertAdjacentHTML('beforeend', `<div class="col-md-4"><div class="card h-100"><img src="${p.imageUrl||'assets/img/promo.png'}" class="card-img-top"><div class="card-body"><h5 class="card-title">${p.title||'โปรโมชัน'}</h5><p class="card-text">${p.description||''}</p></div><div class="card-footer small text-muted">ใช้ได้ถึง ${end.toLocaleDateString('th-TH')}</div></div></div>`); }
  });
  el('#promo-range-label').textContent = count? `แสดงโปรโมชันที่ใช้งานอยู่ (${count} รายการ)` : 'ยังไม่มีโปรโมชันที่ใช้งาน';
}

async function loadServices(){
  const wrap = el('#service-cards'); wrap.innerHTML=''; const snap = await getDocs(collection(db,'services'));
  snap.forEach(s=>{ const d=s.data(); wrap.insertAdjacentHTML('beforeend', `<div class="col-md-4"><div class="card h-100"><img src="${d.imageUrl||'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1400&auto=format&fit=crop'}" class="card-img-top" alt="${d.name}"><div class="card-body"><div class="text-muted small">${d.category||''}</div><h5 class="card-title">${d.name}</h5><p class="card-text">${d.description||''}</p></div></div></div>`); });
}

async function loadAreas(){
  const ul = el('#area-list'); ul.innerHTML=''; const snap = await getDocs(collection(db,'serviceAreas'));
  snap.forEach(a=>{ const d=a.data(); ul.insertAdjacentHTML('beforeend', `<li class="list-group-item d-flex justify-content-between"><span>${d.name}</span><span class="text-muted small">${d.province||''}</span></li>`); });
}

function setupSearch(){
  el('#btnSearch').addEventListener('click', async()=>{
    const text = (el('#searchText').value||'').toLowerCase(); const area = (el('#searchArea').value||'').toLowerCase();
    const sSnap = await getDocs(collection(db,'services')); const aSnap = await getDocs(collection(db,'serviceAreas'));
    const sList=[]; sSnap.forEach(d=>sList.push(d.data())); const aList=[]; aSnap.forEach(d=>aList.push(d.data()));
    const sMatch = sList.filter(s=> !text || [s.name,s.category,s.description].join(' ').toLowerCase().includes(text));
    const aMatch = aList.filter(a=> !area || [a.name,a.province].join(' ').toLowerCase().includes(area));
    el('#searchResults').innerHTML = `<div class="alert alert-info">พบบริการ ${sMatch.length} และพื้นที่ ${aMatch.length}</div>`;
  });
}

function setupBooking(){
  const form = el('#bookingForm');
  form.addEventListener('submit', async (e)=>{
    e.preventDefault(); const data = Object.fromEntries(new FormData(form).entries());
    data.createdAt = serverTimestamp(); data.status='pending';
    try{ await addDoc(collection(db,'bookings'), data); form.reset(); el('#bookingMsg').textContent='ส่งคำขอแล้ว รอการติดต่อกลับ'; }
    catch(err){ el('#bookingMsg').textContent='ผิดพลาด โปรดลองใหม่'; console.error(err); }
  });
}

async function loadApprovedReviews(){
  const wrap = el('#reviewList'); wrap.innerHTML=''; const snap = await getDocs(collection(db,'reviews')); const list=[];
  snap.forEach(r=>{ const d=r.data(); if(d.approved) list.push(d); });
  let avg=0; if(list.length) avg = list.reduce((a,b)=>a+Number(b.rating||0),0)/list.length;
  el('#avgRating').textContent = list.length? `คะแนนเฉลี่ย ${avg.toFixed(1)}/5 จาก ${list.length} รีวิว` : 'ยังไม่มีรีวิวที่อนุมัติ';
  list.forEach(r=>{ wrap.insertAdjacentHTML('beforeend', `<div class="col-md-6"><div class="card h-100">${r.imageUrl?`<img src="${r.imageUrl}" class="card-img-top">`:''}<div class="card-body"><div class="d-flex justify-content-between"><strong>${r.name||'ผู้ใช้'}</strong><span class="badge text-bg-success">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span></div><p class="mb-0 mt-2">${r.text||''}</p></div></div></div>`); });
}

function setupReview(){
  const form = el('#reviewForm');
  form.addEventListener('submit', async (e)=>{
    e.preventDefault(); const data = Object.fromEntries(new FormData(form).entries());
    data.rating = Number(data.rating||5); data.approved=false; data.createdAt = serverTimestamp();
    try{ await addDoc(collection(db,'reviews'), data); form.reset(); bootstrap.Modal.getInstance(document.getElementById('reviewModal')).hide(); alert('ส่งรีวิวแล้ว รออนุมัติ'); }
    catch(err){ alert('ผิดพลาด โปรดลองอีกครั้ง'); console.error(err); }
  });
}

function setupQuote(){
  const form = el('#quoteForm');
  form.addEventListener('submit', async (e)=>{
    e.preventDefault(); const data = Object.fromEntries(new FormData(form).entries()); data.createdAt = serverTimestamp(); data.status='open';
    try{ await addDoc(collection(db,'tickets'), data); form.reset(); el('#quoteMsg').textContent='ส่งคำขอแล้ว'; }
    catch(err){ el('#quoteMsg').textContent='ผิดพลาด โปรดลองใหม่'; console.error(err); }
  });
}

let currentThreadId = localStorage.getItem('chatThreadId') || null;
async function setupChat(user){
  const body=el('#chatBody'), input=el('#chatMessage'), send=el('#chatSend'), toggleBtn=el('#toggleChat'), widget=el('#chatWidget');

  // ✅ ปุ่มย่อ/ขยาย
  toggleBtn?.addEventListener('click', ()=>{
    widget.classList.toggle('minimized');
    toggleBtn.innerHTML = widget.classList.contains('minimized')? '<i class="bi bi-plus-lg"></i>' : '<i class="bi bi-dash-lg"></i>';
  });

  if(!currentThreadId){
    const t = await addDoc(collection(db,'chatThreads'), { createdAt: serverTimestamp(), lastMessage:'เริ่มสนทนา', status:'open', uid: user?.uid||null });
    currentThreadId = t.id; localStorage.setItem('chatThreadId', currentThreadId);
    await addDoc(collection(db,'chatThreads', currentThreadId, 'messages'), { sender:'bot', text:'สวัสดีค่ะ/ครับ พิมพ์ "จอง", "ราคา", "พื้นที่" เพื่อรับลิงก์ด่วน', createdAt: serverTimestamp() });
  }

  onSnapshot(query(collection(db,'chatThreads', currentThreadId, 'messages'), orderBy('createdAt')), snap=>{
    body.innerHTML=''; snap.forEach(m=>{ const d=m.data(); body.insertAdjacentHTML('beforeend', `<div class="chat-msg ${d.sender}">${d.text}</div>`); body.scrollTop = body.scrollHeight; });
  });

  async function autoReply(text){
    const t=text.toLowerCase(); let reply='ขอบคุณที่ติดต่อครับ/ค่ะ';
    if(t.includes('จอง')) reply='ไปที่ส่วน "จองงาน/นัดหมาย" แล้วกรอกฟอร์มได้เลยครับ';
    if(t.includes('ราคา')) reply='ราคาขึ้นกับบริการ/พื้นที่ กรอก "ขอใบเสนอราคา" แล้วทีมงานจะติดต่อกลับ';
    if(t.includes('พื้นที่')) reply='ดู "พื้นที่ให้บริการ + แผนที่" ในหน้าเว็บได้เลย';
    await addDoc(collection(db,'chatThreads', currentThreadId, 'messages'), { sender:'bot', text:reply, createdAt: serverTimestamp() });
  }
  async function sendMsg(){ const text=input.value.trim(); if(!text) return; await addDoc(collection(db,'chatThreads', currentThreadId, 'messages'), { sender:'user', text, createdAt: serverTimestamp() }); input.value=''; autoReply(text); }
  send.addEventListener('click', sendMsg); input.addEventListener('keypress', e=>{ if(e.key==='Enter') sendMsg(); });
}
