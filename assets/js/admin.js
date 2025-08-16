// assets/js/admin.js — หลังบ้าน (realtime + CRUD)
import { auth, db, adminSignIn, isAdmin } from './firebase-init.js';
import {
  collection, doc, getDoc, getDocs, addDoc, onSnapshot, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, increment
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { el, els, fmtDate } from './utils.js';

// nav tab
els('.list-group .list-group-item').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    els('.list-group .list-group-item').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.getAttribute('data-target');
    els('.admin-tab').forEach(sec=>sec.classList.add('d-none'));
    el(target)?.classList.remove('d-none');
  });
});

// auth guard (ต้องเป็น admin)
(async ()=>{
  const user = auth.currentUser || null;
  let uid = user?.uid || null;
  if(!uid){
    // ให้ผู้ใช้ไปหน้า login เองถ้ายังไม่ล็อกอิน
    window.location.href = 'login.html';
    return;
  }
  const ok = await isAdmin(uid);
  if(!ok){ alert('สิทธิ์ไม่เพียงพอ'); window.location.href='login.html'; return; }
  el('#adminRole').textContent = 'Admin';
})();

el('#btnLogout')?.addEventListener('click', async ()=>{
  const { signOut } = await import('https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js');
  await signOut(auth);
  window.location.href='login.html';
});

// ===== Dashboard counts =====
onSnapshot(collection(db,'bookings'), snap=> el('#statBookings').textContent = snap.size);
onSnapshot(collection(db,'reviews'),  snap=> el('#statReviews').textContent  = snap.size);
onSnapshot(collection(db,'chatThreads'),  snap=> el('#statChats').textContent  = snap.size);
onSnapshot(collection(db,'promotions'),  snap=> el('#statPromos').textContent = snap.size);

// ===== Services =====
const svcBody = el('#tblServicesBody');
onSnapshot(collection(db,'services'), snap=>{
  if(!svcBody) return;
  svcBody.innerHTML='';
  snap.forEach(d=>{
    const s = d.data();
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${s.name||''}</td><td>${s.category||''}</td><td>${s.description||''}</td><td>${s.imageUrl?`<img src="${s.imageUrl}" style="width:70px">`:''}</td>
    <td class="text-end">
      <button class="btn btn-sm btn-outline-neon me-2" data-id="${d.id}" data-act="edit">แก้ไข</button>
      <button class="btn btn-sm btn-outline-danger" data-id="${d.id}" data-act="del">ลบ</button>
    </td>`;
    svcBody.appendChild(tr);
  });
});
el('#addService')?.addEventListener('click', async ()=>{
  const name = prompt('ชื่อบริการ'); if(!name) return;
  const category = prompt('หมวดหมู่');
  const description = prompt('คำอธิบาย');
  const imageUrl = prompt('ลิงก์รูป (ถ้ามี)');
  await addDoc(collection(db,'services'), { name, category, description, imageUrl, createdAt: serverTimestamp() });
});
svcBody?.addEventListener('click', async (e)=>{
  const btn = e.target.closest('button'); if(!btn) return;
  const id = btn.getAttribute('data-id');
  const act = btn.getAttribute('data-act');
  if(act==='del'){ if(confirm('ลบบริการนี้?')) await deleteDoc(doc(db,'services', id)); }
  if(act==='edit'){
    const ref = doc(db,'services', id);
    const cur = (await getDoc(ref)).data()||{};
    const name = prompt('ชื่อบริการ', cur.name||''); if(!name) return;
    const category = prompt('หมวดหมู่', cur.category||'');
    const description = prompt('คำอธิบาย', cur.description||'');
    const imageUrl = prompt('ลิงก์รูป (ถ้ามี)', cur.imageUrl||'');
    await updateDoc(ref, { name, category, description, imageUrl });
  }
});

// ===== Areas =====
const areaBody = el('#tblAreasBody');
onSnapshot(collection(db,'serviceAreas'), snap=>{
  if(!areaBody) return;
  areaBody.innerHTML='';
  snap.forEach(d=>{
    const a=d.data();
    const tr=document.createElement('tr');
    tr.innerHTML = `<td>${a.name||''}</td><td>${a.province||''}</td><td class="small">${(a.geojson||'').slice(0,60)}...</td>
    <td class="text-end">
      <button class="btn btn-sm btn-outline-neon me-2" data-id="${d.id}" data-act="edit">แก้ไข</button>
      <button class="btn btn-sm btn-outline-danger" data-id="${d.id}" data-act="del">ลบ</button>
    </td>`;
    areaBody.appendChild(tr);
  });
});
el('#addArea')?.addEventListener('click', async ()=>{
  const name = prompt('ชื่อพื้นที่'); if(!name) return;
  const province = prompt('จังหวัด');
  const geojson = prompt('GeoJSON Polygon (ถ้ามี)');
  await addDoc(collection(db,'serviceAreas'), { name, province, geojson: geojson||'', createdAt: serverTimestamp() });
});
areaBody?.addEventListener('click', async (e)=>{
  const btn = e.target.closest('button'); if(!btn) return;
  const id = btn.getAttribute('data-id');
  const act = btn.getAttribute('data-act');
  if(act==='del'){ if(confirm('ลบพื้นที่นี้?')) await deleteDoc(doc(db,'serviceAreas', id)); }
  if(act==='edit'){
    const ref = doc(db,'serviceAreas', id);
    const cur = (await getDoc(ref)).data()||{};
    const name = prompt('ชื่อพื้นที่', cur.name||''); if(!name) return;
    const province = prompt('จังหวัด', cur.province||'');
    const geojson = prompt('GeoJSON Polygon', cur.geojson||'');
    await updateDoc(ref, { name, province, geojson });
  }
});

// ===== Bookings =====
const bkBody = el('#tblBookingsBody');
onSnapshot(query(collection(db,'bookings'), orderBy('createdAt','desc')), snap=>{
  if(!bkBody) return;
  bkBody.innerHTML='';
  snap.forEach(d=>{
    const b=d.data();
    const tr=document.createElement('tr');
    tr.innerHTML = `<td>${b.name||''}</td><td>${b.phone||''}</td><td>${b.service||''}</td><td>${b.area||''}</td>
      <td>${b.date||''} ${b.time||''}</td>
      <td>${b.status||'pending'}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-neon me-2" data-id="${d.id}" data-act="done">เสร็จสิ้น</button>
        <button class="btn btn-sm btn-outline-danger" data-id="${d.id}" data-act="del">ลบ</button>
      </td>`;
    bkBody.appendChild(tr);
  });
});
bkBody?.addEventListener('click', async (e)=>{
  const btn=e.target.closest('button'); if(!btn) return;
  const id=btn.getAttribute('data-id'); const act=btn.getAttribute('data-act');
  if(act==='del'){ if(confirm('ลบรายการนี้?')) await deleteDoc(doc(db,'bookings', id)); }
  if(act==='done'){ await updateDoc(doc(db,'bookings', id), { status:'done' }); }
});

// ===== Tickets =====
const tkBody = el('#tblTicketsBody');
onSnapshot(query(collection(db,'tickets'), orderBy('createdAt','desc')), snap=>{
  if(!tkBody) return;
  tkBody.innerHTML='';
  snap.forEach(d=>{
    const t=d.data();
    const tr=document.createElement('tr');
    tr.innerHTML = `<td>${t.email||''}</td><td>${t.subject||''}</td><td>${t.message||''}</td>
    <td>${t.status||'open'}</td>
    <td class="text-end">
      <button class="btn btn-sm btn-outline-neon me-2" data-id="${d.id}" data-act="close">ปิดงาน</button>
      <button class="btn btn-sm btn-outline-danger" data-id="${d.id}" data-act="del">ลบ</button>
    </td>`;
    tkBody.appendChild(tr);
  });
});
tkBody?.addEventListener('click', async (e)=>{
  const btn=e.target.closest('button'); if(!btn) return;
  const id=btn.getAttribute('data-id'); const act=btn.getAttribute('data-act');
  if(act==='del'){ if(confirm('ลบรายการนี้?')) await deleteDoc(doc(db,'tickets', id)); }
  if(act==='close'){ await updateDoc(doc(db,'tickets', id), { status:'closed' }); }
});

// ===== Reviews =====
const rvBody = el('#tblReviewsBody');
onSnapshot(query(collection(db,'reviews'), orderBy('createdAt','desc')), snap=>{
  if(!rvBody) return;
  rvBody.innerHTML='';
  snap.forEach(d=>{
    const r=d.data();
    const tr=document.createElement('tr');
    tr.innerHTML = `<td>${r.name||''}</td><td>${r.rating||''}</td><td>${r.text||''}</td>
      <td>${r.approved?'<span class="badge bg-success">อนุมัติแล้ว</span>':'<span class="badge bg-secondary">รออนุมัติ</span>'}</td>
      <td class="text-end">
        ${!r.approved? `<button class="btn btn-sm btn-outline-neon me-2" data-id="${d.id}" data-act="approve">อนุมัติ</button>`:''}
        <button class="btn btn-sm btn-outline-danger" data-id="${d.id}" data-act="del">ลบ</button>
      </td>`;
    rvBody.appendChild(tr);
  });
});
rvBody?.addEventListener('click', async (e)=>{
  const btn=e.target.closest('button'); if(!btn) return;
  const id=btn.getAttribute('data-id'); const act=btn.getAttribute('data-act');
  if(act==='del'){ if(confirm('ลบรีวิวนี้?')) await deleteDoc(doc(db,'reviews', id)); }
  if(act==='approve'){ await updateDoc(doc(db,'reviews', id), { approved:true }); }
});

// ===== Promotions =====
const pmBody = el('#tblPromosBody');
onSnapshot(collection(db,'promotions'), snap=>{
  if(!pmBody) return;
  pmBody.innerHTML='';
  snap.forEach(d=>{
    const p=d.data();
    const tr=document.createElement('tr');
    const start = p.start?.toDate?.()? p.start.toDate().toLocaleDateString('th-TH'): (p.start||'');
    const end   = p.end?.toDate?.()? p.end.toDate().toLocaleDateString('th-TH'): (p.end||'');
    tr.innerHTML = `<td>${p.title||''}</td><td>${start} - ${end}</td><td>${p.imageUrl?`<img src="${p.imageUrl}" style="width:70px">`:''}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-neon me-2" data-id="${d.id}" data-act="edit">แก้ไข</button>
        <button class="btn btn-sm btn-outline-danger" data-id="${d.id}" data-act="del">ลบ</button>
      </td>`;
    pmBody.appendChild(tr);
  });
});
el('#addPromo')?.addEventListener('click', async ()=>{
  const title = prompt('ชื่อโปรโมชัน'); if(!title) return;
  const description = prompt('คำอธิบาย');
  const imageUrl = prompt('ลิงก์รูป');
  const start = prompt('วันที่เริ่ม (YYYY-MM-DD)');
  const end = prompt('วันที่สิ้นสุด (YYYY-MM-DD)');
  await addDoc(collection(db,'promotions'), { title, description, imageUrl, start, end, createdAt: serverTimestamp() });
});
pmBody?.addEventListener('click', async (e)=>{
  const btn=e.target.closest('button'); if(!btn) return;
  const id=btn.getAttribute('data-id'); const act=btn.getAttribute('data-act');
  if(act==='del'){ if(confirm('ลบโปรโมชันนี้?')) await deleteDoc(doc(db,'promotions', id)); }
  if(act==='edit'){
    const ref=doc(db,'promotions', id);
    const cur=(await getDoc(ref)).data()||{};
    const title = prompt('ชื่อโปรโมชัน', cur.title||''); if(!title) return;
    const description = prompt('คำอธิบาย', cur.description||'');
    const imageUrl = prompt('ลิงก์รูป', cur.imageUrl||'');
    const start = prompt('วันที่เริ่ม (YYYY-MM-DD)', cur.start||'');
    const end = prompt('วันที่สิ้นสุด (YYYY-MM-DD)', cur.end||'');
    await updateDoc(ref, { title, description, imageUrl, start, end });
  }
});

// ===== Banners =====
const bnBody = el('#tblBannersBody');
onSnapshot(collection(db,'banners'), snap=>{
  if(!bnBody) return;
  bnBody.innerHTML='';
  snap.forEach(d=>{
    const b=d.data();
    const tr=document.createElement('tr');
    tr.innerHTML = `<td>${b.title||''}</td><td>${b.subtitle||''}</td><td>${b.imageUrl?`<img src="${b.imageUrl}" style="width:70px">`:''}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-neon me-2" data-id="${d.id}" data-act="edit">แก้ไข</button>
        <button class="btn btn-sm btn-outline-danger" data-id="${d.id}" data-act="del">ลบ</button>
      </td>`;
    bnBody.appendChild(tr);
  });
});
el('#addBanner')?.addEventListener('click', async ()=>{
  const title = prompt('หัวข้อ'); if(!title) return;
  const subtitle = prompt('คำโปรย');
  const imageUrl = prompt('ลิงก์รูป');
  await addDoc(collection(db,'banners'), { title, subtitle, imageUrl, createdAt: serverTimestamp() });
});
bnBody?.addEventListener('click', async (e)=>{
  const btn=e.target.closest('button'); if(!btn) return;
  const id=btn.getAttribute('data-id'); const act=btn.getAttribute('data-act');
  if(act==='del'){ if(confirm('ลบแบนเนอร์นี้?')) await deleteDoc(doc(db,'banners', id)); }
  if(act==='edit'){
    const ref=doc(db,'banners', id);
    const cur=(await getDoc(ref)).data()||{};
    const title = prompt('หัวข้อ', cur.title||''); if(!title) return;
    const subtitle = prompt('คำโปรย', cur.subtitle||'');
    const imageUrl = prompt('ลิงก์รูป', cur.imageUrl||'');
    await updateDoc(ref, { title, subtitle, imageUrl });
  }
});

// ===== FAQ =====
const fqBody = el('#tblFaqBody');
onSnapshot(collection(db,'faqs'), snap=>{
  if(!fqBody) return;
  fqBody.innerHTML='';
  snap.forEach(d=>{
    const f=d.data();
    const tr=document.createElement('tr');
    tr.innerHTML = `<td>${f.q||''}</td><td>${f.a||''}</td>
    <td class="text-end">
      <button class="btn btn-sm btn-outline-neon me-2" data-id="${d.id}" data-act="edit">แก้ไข</button>
      <button class="btn btn-sm btn-outline-danger" data-id="${d.id}" data-act="del">ลบ</button>
    </td>`;
    fqBody.appendChild(tr);
  });
});
el('#addFaq')?.addEventListener('click', async ()=>{
  const q = prompt('คำถาม'); if(!q) return;
  const a = prompt('คำตอบ');
  await addDoc(collection(db,'faqs'), { q, a, createdAt: serverTimestamp() });
});
fqBody?.addEventListener('click', async (e)=>{
  const btn=e.target.closest('button'); if(!btn) return;
  const id=btn.getAttribute('data-id'); const act=btn.getAttribute('data-act');
  if(act==='del'){ if(confirm('ลบคำถามนี้?')) await deleteDoc(doc(db,'faqs', id)); }
  if(act==='edit'){
    const ref=doc(db,'faqs', id);
    const cur=(await getDoc(ref)).data()||{};
    const q = prompt('คำถาม', cur.q||''); if(!q) return;
    const a = prompt('คำตอบ', cur.a||'');
    await updateDoc(ref, { q, a });
  }
});

// ===== Settings =====
el('#btnSaveSettings')?.addEventListener('click', async ()=>{
  const form = el('#settingsForm');
  const data = Object.fromEntries(new FormData(form).entries());
  await updateDoc(doc(db,'settings','public'), data).catch(async ()=>{
    await (await import('https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js')).setDoc(doc(db,'settings','public'), data);
  });
  el('#settingsMsg').textContent = 'บันทึกแล้ว';
});

// ===== Chat (Admin) =====
const thList = el('#chatThreadList');
function bindRealtimeChat(){
  onSnapshot(query(collection(db,'chatThreads'), orderBy('createdAt','desc')), snap=>{
    if(!thList) return; thList.innerHTML='';
    let total=0;
    snap.forEach(d=>{
      const t=d.data(); total += Number(t.unreadAdmin||0);
      const li=document.createElement('li');
      li.className='list-group-item d-flex justify-content-between align-items-center';
      li.innerHTML = `<span>${t.sessionId || t.uid || d.id}</span>
      <span>${t.unreadAdmin?`<span class="badge bg-danger me-2">${t.unreadAdmin}</span>`:''}
      <button class="btn btn-sm btn-outline-neon" data-id="${d.id}" data-act="open">เปิด</button></span>`;
      thList.appendChild(li);
    });
    const badge = document.getElementById('badgeChatTotal');
    if(badge){ badge.textContent = total ? String(total) : ''; badge.style.display = total? 'inline-block':'none'; }
  });

  thList?.addEventListener('click', async (e)=>{
    const btn=e.target.closest('button'); if(!btn) return;
    const id=btn.getAttribute('data-id'); const act=btn.getAttribute('data-act');
    if(act==='open'){ openThread(id); }
  });
}
bindRealtimeChat();

let unsubMsg = null;
async function openThread(threadId){
  await updateDoc(doc(db,'chatThreads', threadId), { unreadAdmin: 0 });
  const body = document.getElementById('chatMessagesAdmin');
  const input = document.getElementById('chatInputAdmin');
  const send = document.getElementById('chatSendAdmin');
  body.innerHTML='';
  if(unsubMsg) unsubMsg();
  unsubMsg = onSnapshot(query(collection(db,'chatThreads', threadId, 'messages'), orderBy('createdAt','asc')), snap=>{
    body.innerHTML='';
    snap.forEach(m=>{
      const d=m.data(); const div=document.createElement('div');
      div.className = 'chat-msg ' + (d.sender==='user' ? 'user':'agent');
      div.textContent = d.text;
      body.appendChild(div);
    });
    body.scrollTop = body.scrollHeight;
  });
  send.onclick = async ()=>{
    const text = input.value.trim(); if(!text) return;
    await addDoc(collection(db,'chatThreads', threadId, 'messages'), { sender:'agent', text, createdAt: serverTimestamp() });
    await updateDoc(doc(db,'chatThreads', threadId), { lastMessage:text, unreadUser: increment(1) });
    input.value='';
  }
}
