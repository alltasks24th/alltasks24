
// admin.js — ฝั่งหลังบ้าน (Realtime + CRUD คร่าว ๆ)
import { db } from './firebase-init.js';
import { requireAdmin, logout } from './auth.js';
import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, onSnapshot,
  query, orderBy, serverTimestamp, Timestamp, where, increment
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

const $ = (s, r=document)=> r.querySelector(s);
const $$ = (s, r=document)=> Array.from(r.querySelectorAll(s));

requireAdmin(async (user, role)=>{
  onSnapshot(collection(db,'bookings'), snap=> $('#countBookings').textContent = snap.size);
  onSnapshot(query(collection(db,'reviews'), where('approved','==',false)), snap=> $('#countNewReviews').textContent = snap.size);
  onSnapshot(collection(db,'roles'), snap=> $('#countUsers').textContent = snap.size);
  onSnapshot(collection(db,'promotions'), snap=> $('#countPromos').textContent = snap.size);

  onSnapshot(collection(db,'services'), snap=>{
    const tbody = $('#svcTableBody'); tbody.innerHTML='';
    snap.forEach(d=>{
      const s=d.data();
      tbody.insertAdjacentHTML('beforeend', `<tr data-id="${d.id}">
        <td>${s.name||''}</td><td>${s.category||''}</td><td><span class="badge bg-light text-dark border">${s.imageUrl?'ภาพลิงก์':'-'}</span></td>
        <td class="text-end"><button class="btn btn-sm btn-outline-primary btn-edit">แก้ไข</button> <button class="btn btn-sm btn-outline-danger btn-del">ลบ</button></td></tr>`);
    });
    tbody.querySelectorAll('.btn-del').forEach(btn=> btn.addEventListener('click', async e=>{
      const id = e.target.closest('tr').dataset.id; if(confirm('ลบรายการนี้?')) await deleteDoc(doc(db,'services', id));
    }));
    tbody.querySelectorAll('.btn-edit').forEach(btn=> btn.addEventListener('click', async e=>{
      const id = e.target.closest('tr').dataset.id; const snap=await getDoc(doc(db,'services', id)); const v=snap.data();
      $('#svcId').value=id; $('#svcName').value=v.name||''; $('#svcCat').value=v.category||''; $('#svcImg').value=v.imageUrl||''; $('#svcDesc').value=v.description||'';
      new bootstrap.Modal(document.getElementById('svcModal')).show();
    }));
  });
  $('#svcSave').addEventListener('click', async ()=>{
    const id=$('#svcId').value; const data={ name:$('#svcName').value, category:$('#svcCat').value, imageUrl:$('#svcImg').value, description:$('#svcDesc').value, updatedAt: serverTimestamp() };
    if(id){ await updateDoc(doc(db,'services',id), data); } else { data.createdAt=serverTimestamp(); await addDoc(collection(db,'services'), data); }
    bootstrap.Modal.getInstance(document.getElementById('svcModal')).hide();
  });

  onSnapshot(collection(db,'faqs'), snap=>{
    const list=$('#faqList'); list.innerHTML='';
    snap.forEach(d=> list.insertAdjacentHTML('beforeend', `<li class="list-group-item d-flex justify-content-between align-items-center" data-id="${d.id}">${d.data().q}<button class="btn btn-sm btn-outline-danger btn-del">ลบ</button></li>`));
    list.querySelectorAll('.btn-del').forEach(b=> b.addEventListener('click', async e=>{ const id=e.target.closest('li').dataset.id; if(confirm('ลบคำถามนี้?')) await deleteDoc(doc(db,'faqs',id)); }));
  });
  $('#faqAdd').addEventListener('click', async ()=>{
    const q=$('#faqQ').value.trim(), a=$('#faqA').value.trim(); if(!q||!a) return;
    await addDoc(collection(db,'faqs'), {q,a, createdAt:serverTimestamp()}); $('#faqQ').value=''; $('#faqA').value='';
  });

  onSnapshot(collection(db,'promotions'), snap=>{
    const tbody=$('#promoTableBody'); tbody.innerHTML='';
    snap.forEach(d=>{
      const p=d.data(); const start = p.start?.toDate?.()? p.start.toDate() : null; const end=p.end?.toDate?.()?p.end.toDate():null;
      tbody.insertAdjacentHTML('beforeend', `<tr data-id="${d.id}">
        <td>${p.title||''}</td><td>${start? start.toLocaleDateString('th-TH'): '-'} - ${end? end.toLocaleDateString('th-TH'): '-'}</td>
        <td>${p.description||''}</td>
        <td class="text-end"><button class="btn btn-sm btn-outline-primary btn-edit">แก้ไข</button> <button class="btn btn-sm btn-outline-danger btn-del">ลบ</button></td>
      </tr>`);
    });
    tbody.querySelectorAll('.btn-del').forEach(btn=> btn.addEventListener('click', async e=>{ const id=e.target.closest('tr').dataset.id; if(confirm('ลบโปรโมชันนี้?')) await deleteDoc(doc(db,'promotions',id)); }));
    tbody.querySelectorAll('.btn-edit').forEach(btn=> btn.addEventListener('click', async e=>{
      const id=e.target.closest('tr').dataset.id; const v=(await getDoc(doc(db,'promotions',id))).data();
      $('#promoId').value=id; $('#promoTitle').value=v.title||''; $('#promoDesc').value=v.description||''; $('#promoImg').value=v.imageUrl||'';
      $('#promoStart').value = v.start?.toDate?.()? v.start.toDate().toISOString().slice(0,10) : ''; 
      $('#promoEnd').value = v.end?.toDate?.()? v.end.toDate().toISOString().slice(0,10) : '';
      new bootstrap.Modal(document.getElementById('promoModal')).show();
    }));
  });
  $('#promoSave').addEventListener('click', async ()=>{
    const id=$('#promoId').value;
    const data={ title:$('#promoTitle').value, description:$('#promoDesc').value, imageUrl:$('#promoImg').value,
      start: $('#promoStart').value? Timestamp.fromDate(new Date($('#promoStart').value)) : null,
      end: $('#promoEnd').value? Timestamp.fromDate(new Date($('#promoEnd').value)) : null,
      updatedAt: serverTimestamp()
    };
    if(id){ await updateDoc(doc(db,'promotions',id), data); } else { data.createdAt=serverTimestamp(); await addDoc(collection(db,'promotions'), data); }
    bootstrap.Modal.getInstance(document.getElementById('promoModal')).hide();
  });

  onSnapshot(collection(db,'banners'), snap=>{
    const tbody=$('#bannerTableBody'); tbody.innerHTML='';
    snap.forEach(d=>{
      const b=d.data();
      tbody.insertAdjacentHTML('beforeend', `<tr data-id="${d.id}">
        <td>${b.title||'-'}</td>
        <td><span class="text-muted small">${b.subtitle||''}</span></td>
        <td><span class="badge bg-light text-dark border">${b.imageUrl? 'ภาพลิงก์':''}</span></td>
        <td class="text-end"><button class="btn btn-sm btn-outline-primary btn-edit">แก้ไข</button> <button class="btn btn-sm btn-outline-danger btn-del">ลบ</button></td>
      </tr>`);
    });
    tbody.querySelectorAll('.btn-del').forEach(btn=> btn.addEventListener('click', async e=>{ const id=e.target.closest('tr').dataset.id; if(confirm('ลบแบนเนอร์นี้?')) await deleteDoc(doc(db,'banners',id)); }));
    tbody.querySelectorAll('.btn-edit').forEach(btn=> btn.addEventListener('click', async e=>{
      const id=e.target.closest('tr').dataset.id; const v=(await getDoc(doc(db,'banners',id))).data();
      $('#banId').value=id; $('#banTitle').value=v.title||''; $('#banSub').value=v.subtitle||''; $('#banImg').value=v.imageUrl||'';
      new bootstrap.Modal(document.getElementById('bannerModal')).show();
    }));
  });
  $('#banSave').addEventListener('click', async ()=>{
    const id=$('#banId').value; const data={ title:$('#banTitle').value, subtitle:$('#banSub').value, imageUrl:$('#banImg').value, updatedAt: serverTimestamp() };
    if(id){ await updateDoc(doc(db,'banners',id), data); } else { data.createdAt=serverTimestamp(); await addDoc(collection(db,'banners'), data); }
    bootstrap.Modal.getInstance(document.getElementById('bannerModal')).hide();
  });

  onSnapshot(query(collection(db,'reviews'), where('approved','==',false), orderBy('createdAt','asc')), snap=>{
    const tbody=$('#reviewTableBody'); tbody.innerHTML='';
    snap.forEach(d=>{
      const r=d.data();
      tbody.insertAdjacentHTML('beforeend', `<tr data-id="${d.id}"><td>${r.name||'ผู้ใช้'}</td><td>${r.rating||'-'}</td><td>${r.text||''}</td>
      <td class="text-end"><button class="btn btn-sm btn-success btn-approve">อนุมัติ</button> <button class="btn btn-sm btn-outline-danger btn-del">ลบ</button></td></tr>`);
    });
    tbody.querySelectorAll('.btn-approve').forEach(b=> b.addEventListener('click', async e=>{ const id=e.target.closest('tr').dataset.id; await updateDoc(doc(db,'reviews',id), {approved:true}); }));
    tbody.querySelectorAll('.btn-del').forEach(b=> b.addEventListener('click', async e=>{ const id=e.target.closest('tr').dataset.id; if(confirm('ลบรีวิวนี้?')) await deleteDoc(doc(db,'reviews',id)); }));
  });

  const sRef=doc(db,'settings','public');
  $('#saveSettings').addEventListener('click', async ()=>{
    const data={ siteName:$('#setSite').value, phone:$('#setPhone').value, line:$('#setLine').value, facebook:$('#setFb').value,
    hero:$('#setHero').value, mediaPolicy:$('#setPolicy').value, mapUrl:$('#setMap').value, updatedAt: serverTimestamp() };
    await updateDoc(sRef, data).catch(async()=> await addDoc(collection(db,'settings'), {id:'public', ...data}));
    alert('บันทึกแล้ว');
  });
  const sSnap = await getDoc(sRef);
  if(sSnap.exists()){
    const v=sSnap.data(); $('#setSite').value=v.siteName||'alltasks24.online'; $('#setPhone').value=v.phone||''; $('#setLine').value=v.line||''; $('#setFb').value=v.facebook||''; $('#setHero').value=v.hero||''; $('#setPolicy').value=v.mediaPolicy||''; $('#setMap').value=v.mapUrl||'';
  }

  onSnapshot(query(collection(db,'chatThreads'), orderBy('createdAt','desc')), snap=>{
    const list=$('#threadList'); list.innerHTML='';
    snap.forEach(d=>{
      const t=d.data();
      list.insertAdjacentHTML('beforeend', `<button class="list-group-item list-group-item-action d-flex justify-content-between align-items-center" data-id="${d.id}">
        <span>${t.sessionId||t.uid?.slice(0,6)||'แขก'}</span>
        <span class="badge ${ (t.unreadAdmin||0)>0 ? 'text-bg-danger':'text-bg-secondary' }">${t.unreadAdmin||0}</span>
      </button>`);
    });
    list.querySelectorAll('button').forEach(b=> b.addEventListener('click', ()=> openThread(b.dataset.id)));
  });

  let unsubMsg=null, currentThread=null;
  async function openThread(id){
    currentThread=id;
    if(unsubMsg) unsubMsg(); $('#chatMsgs').innerHTML='';
    unsubMsg = onSnapshot(query(collection(db,'chatThreads', id, 'messages'), orderBy('createdAt','asc')), snap=>{
      const wrap=$('#chatMsgs'); wrap.innerHTML='';
      snap.forEach(m=>{ const d=m.data(); wrap.insertAdjacentHTML('beforeend', `<div class="small my-1"><span class="badge ${d.sender==='user'?'text-bg-light':'text-bg-primary'}">${d.sender}</span> ${d.text}</div>`); wrap.scrollTop=wrap.scrollHeight; });
    });
    await updateDoc(doc(db,'chatThreads', id), { unreadAdmin: 0 });
  }
  $('#adminSend').addEventListener('click', async ()=>{
    const inp=$('#adminMsg'); const text=inp.value.trim(); if(!text || !currentThread) return;
    await addDoc(collection(db,'chatThreads', currentThread, 'messages'), { sender:'admin', text, createdAt: serverTimestamp() });
    await updateDoc(doc(db,'chatThreads', currentThread), { lastMessage:text, unreadUser: increment(1) });
    inp.value='';
  });

  $('#btnLogout').addEventListener('click', logout);
});

// === BOOKINGS — realtime list ===
onSnapshot(query(collection(db,'bookings'), orderBy('createdAt','desc')), snap=>{
  const tbody = $('#bookTableBody'); if(!tbody) return;
  tbody.innerHTML='';
  snap.forEach(d=>{
    const b = d.data();
    tbody.insertAdjacentHTML('beforeend', `
      <tr data-id="${d.id}">
        <td>${b.name||'-'}</td>
        <td>
          <div class="fw-semibold">${b.service||'-'}</div>
          <div class="small text-muted">${b.area||''}</div>
        </td>
        <td>${(b.date||'-')} ${(b.time||'')}</td>
        <td>
          <span class="badge ${ b.status==='done'?'text-bg-success' : b.status==='confirmed'?'text-bg-primary':'text-bg-secondary' }">
            ${b.status||'pending'}
          </span>
        </td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-primary" data-action="status" data-s="confirmed">ยืนยัน</button>
          <button class="btn btn-sm btn-outline-success" data-action="status" data-s="done">เสร็จสิ้น</button>
          <button class="btn btn-sm btn-outline-danger" data-action="del">ลบ</button>
        </td>
      </tr>`);
  });
  tbody.querySelectorAll('button[data-action="status"]').forEach(btn=> btn.onclick = async (e)=>{
    const tr = e.target.closest('tr'); const id = tr?.dataset?.id; const s = e.target.dataset.s;
    if(id) await updateDoc(doc(db,'bookings',id), { status: s });
  });
  tbody.querySelectorAll('button[data-action="del"]').forEach(btn=> btn.onclick = async (e)=>{
    const tr = e.target.closest('tr'); const id = tr?.dataset?.id;
    if(id && confirm('ลบรายการนี้?')) await deleteDoc(doc(db,'bookings', id));
  });
});

// === TICKETS — show detail + newest first ===
onSnapshot(
  query(collection(db,'tickets'), orderBy('createdAt','desc')),
  snap => {
    const tbody = document.getElementById('ticketTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    snap.forEach(d => {
      const t = d.data();
      const fullDetail = (t.detail ?? t.details ?? t.message ?? '').toString();
      tbody.insertAdjacentHTML('beforeend', `
        <tr data-id="${d.id}">
          <td>${t.email || '-'}</td>
          <td>
            <div class="fw-semibold">${t.subject || '-'}</div>
            <div class="small text-muted" style="white-space:pre-line">${fullDetail}</div>
          </td>
          <td>${t.status || 'open'}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-primary" data-action="close">ปิด</button>
          </td>
        </tr>
      `);
    });

    // ปุ่มปิดงาน
    tbody.querySelectorAll('button[data-action="close"]').forEach(btn => {
      btn.onclick = async (e) => {
        const tr = e.target.closest('tr');
        const id = tr?.dataset?.id;
        if (id) await updateDoc(doc(db,'tickets', id), { status: 'closed' });
      };
    });
  }
);
