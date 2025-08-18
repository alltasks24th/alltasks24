// admin.js — ฝั่งหลังบ้าน (Realtime + CRUD คร่าว ๆ)
import { db } from './firebase-init.js';
import { requireAdmin, logout } from './auth.js';
import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, onSnapshot,
  query, orderBy, serverTimestamp, Timestamp, where, increment, setDoc // <-- ใช้ setDoc ด้วย
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

const $ = (s, r=document)=> r.querySelector(s);
const $$ = (s, r=document)=> Array.from(r.querySelectorAll(s));

requireAdmin(async (user, role)=>{
  onSnapshot(collection(db,'bookings'), snap=> $('#countBookings').textContent = snap.size);
  onSnapshot(query(collection(db,'reviews'), where('approved','==',false)), snap=> $('#countNewReviews').textContent = snap.size);
  onSnapshot(collection(db,'roles'), snap=> $('#countUsers').textContent = snap.size);
  onSnapshot(collection(db,'promotions'), snap=> $('#countPromos').textContent = snap.size);

  // === SERVICES ===
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

  // === FAQ ===
  onSnapshot(collection(db,'faqs'), snap=>{
    const list=$('#faqList'); list.innerHTML='';
    snap.forEach(d=> list.insertAdjacentHTML('beforeend', `<li class="list-group-item d-flex justify-content-between align-items-center" data-id="${d.id}">${d.data().q}<button class="btn btn-sm btn-outline-danger btn-del">ลบ</button></li>`));
    list.querySelectorAll('.btn-del').forEach(b=> b.addEventListener('click', async e=>{ const id=e.target.closest('li').dataset.id; if(confirm('ลบคำถามนี้?')) await deleteDoc(doc(db,'faqs',id)); }));
  });
  $('#faqAdd').addEventListener('click', async ()=>{
    const q=$('#faqQ').value.trim(), a=$('#faqA').value.trim(); if(!q||!a) return;
    await addDoc(collection(db,'faqs'), {q,a, createdAt:serverTimestamp()}); $('#faqQ').value=''; $('#faqA').value='';
  });

  // === PROMOTIONS ===
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

  // === BANNERS ===
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

  // === SETTINGS (ใช้ setDoc merge) ===
  const sRef=doc(db,'settings','public');
  $('#saveSettings').addEventListener('click', async ()=>{
    const data={
      siteName:$('#setSite').value,
      phone:$('#setPhone').value,
      line:$('#setLine').value,
      facebook:$('#setFb').value,
      hero:$('#setHero').value,
      mediaPolicy:$('#setPolicy').value,
      mapUrl:$('#setMap').value,
      updatedAt: serverTimestamp()
    };
    try{
      await setDoc(sRef, data, { merge:true });
      alert('บันทึกแล้ว');
    }catch(err){
      console.error(err);
      alert('บันทึกไม่สำเร็จ: ' + (err?.code || err?.message || err));
    }
  });
  const sSnap = await getDoc(sRef);
  if(sSnap.exists()){
    const v=sSnap.data();
    $('#setSite').value=v.siteName||'alltasks24.online';
    $('#setPhone').value=v.phone||'';
    $('#setLine').value=v.line||'';
    $('#setFb').value=v.facebook||'';
    $('#setHero').value=v.hero||'';
    $('#setPolicy').value=v.mediaPolicy||'';
    $('#setMap').value=v.mapUrl||'';
  }

  // === CHAT (ปรับเรนเดอร์ให้มีชื่อและเวลา + สีบับเบิล) ===
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

    // helper แปลงวันเวลา
    const fmtDT = (ts)=>{
      const d = ts?.toDate?.() ? ts.toDate() : (ts instanceof Date ? ts : new Date());
      return d.toLocaleString('th-TH', { dateStyle:'short', timeStyle:'short' });
    };

    unsubMsg = onSnapshot(query(collection(db,'chatThreads', id, 'messages'), orderBy('createdAt','asc')), snap=>{
      const wrap=$('#chatMsgs'); wrap.innerHTML='';
      snap.forEach(m=>{
        const d=m.data();
        const who = d.sender==='admin' ? 'แอดมิน' : (d.sender==='bot' ? 'ระบบ' : 'ผู้ใช้');
        const when = d.createdAt ? fmtDT(d.createdAt) : '';
        // บับเบิล + เมตา
        wrap.insertAdjacentHTML('beforeend', `
          <div class="chat-row ${d.sender}">
            <div class="chat-bubble ${d.sender}">
              <div class="meta">${who} • ${when}</div>
              <div class="text">${d.text}</div>
            </div>
          </div>
        `);
      });
      wrap.scrollTop=wrap.scrollHeight;
    });
    await updateDoc(doc(db,'chatThreads', id), { unreadAdmin: 0 });
  }
  $('#adminSend').addEventListener('click', async ()=>{
    const inp=$('#adminMsg'); const text=inp.value.trim(); if(!text || !currentThread) return;
    await addDoc(collection(db,'chatThreads', currentThread, 'messages'), { sender:'admin', text, createdAt: serverTimestamp() });
    await updateDoc(doc(db,'chatThreads', currentThread), { lastMessage:text, unreadUser: increment(1) });
    inp.value='';
  });

  // ==================== AREAS (ทำงานเฉพาะแอดมิน) ====================
  (() => {
    const list = document.getElementById('areaListAdmin');
    const addBtn = document.getElementById('areaAdd');
    const nameInp = document.getElementById('areaName');
    const provInp = document.getElementById('areaProv');
    const geoInp  = document.getElementById('areaGeo');
    const mapIframe = document.getElementById('adminMap');

    if (!addBtn) return;

    // Realtime list
    onSnapshot(collection(db, 'serviceAreas'), (snap) => {
      if (!list) return;
      const items = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() }));
      items.sort((a,b) => (a.createdAt?.seconds||0) - (b.createdAt?.seconds||0));

      list.innerHTML = items.map(a => `
        <li class="list-group-item d-flex justify-content-between align-items-center" data-id="${a.id}">
          <div>
            <div class="fw-semibold">${a.name || '-'}</div>
            <div class="small text-muted">${a.province || ''}</div>
          </div>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary" data-act="map">ดูแผนที่</button>
            <button class="btn btn-outline-success" data-act="default">ใช้แผนที่นี้</button>
            <button class="btn btn-outline-danger" data-act="del">ลบ</button>
          </div>
        </li>
      `).join('');
    });

    // Add area
    addBtn.addEventListener('click', async () => {
      const name = (nameInp?.value || '').trim();
      const province = (provInp?.value || '').trim();
      const geoStr = (geoInp?.value || '').trim();

      if (!name) { alert('กรุณากรอกชื่อพื้นที่'); return; }

      let geo = null;
      if (geoStr) {
        try { geo = JSON.parse(geoStr); }
        catch { alert('รูปแบบ GeoJSON ไม่ถูกต้อง'); return; }
      }

      addBtn.disabled = true;
      const old = addBtn.textContent;
      addBtn.textContent = 'กำลังบันทึก...';

      try {
        await addDoc(collection(db, 'serviceAreas'), {
          name, province, ...(geo ? { geo } : {}),
          createdAt: serverTimestamp()
        });

        if (nameInp) nameInp.value = '';
        if (provInp) provInp.value = '';
        if (geoInp)  geoInp.value  = '';
        alert('เพิ่มพื้นที่เรียบร้อย');
      } catch (err) {
        console.error(err);
        alert('เพิ่มไม่สำเร็จ: ' + (err?.code || err?.message || err));
      } finally {
        addBtn.disabled = false;
        addBtn.textContent = old;
      }
    });

    // Click list (map / set default / delete)
    list?.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-act]');
      if (!btn) return;

      const li = btn.closest('li');
      const id = li?.dataset?.id;
      const act = btn.dataset.act;

      if (act === 'map') {
        const title = li.querySelector('.fw-semibold')?.textContent || '';
        const prov  = li.querySelector('.small')?.textContent || '';
        const q = encodeURIComponent(`${title} ${prov}`);
        if (mapIframe) mapIframe.src = `https://www.google.com/maps?q=${q}&output=embed`;
        return;
      }

      if (act === 'default') {
        const title = li.querySelector('.fw-semibold')?.textContent || '';
        const prov  = li.querySelector('.small')?.textContent || '';
        const url = `https://www.google.com/maps?q=${encodeURIComponent(`${title} ${prov}`)}&output=embed`;
        await setDoc(doc(db, 'settings', 'public'), { mapUrl: url, updatedAt: serverTimestamp() }, { merge: true });
        alert('อัปเดตแผนที่หน้าเว็บแล้ว');
        return;
      }

      if (act === 'del' && id) {
        if (confirm('ลบพื้นที่นี้?')) await deleteDoc(doc(db, 'serviceAreas', id));
        return;
      }
    });
  })();
  // ==================== END AREAS ====================

  $('#btnLogout').addEventListener('click', logout);
});

// === BOOKINGS — realtime list ===
onSnapshot(query(collection(db,'bookings'), orderBy('createdAt','desc')), snap=>{
  const tbody = $('#bookTableBody'); if (!tbody) return;
  tbody.innerHTML = '';

  snap.forEach(d=>{
    const b = d.data() || {};
    const extra = (b.note ?? b.detail ?? b.details ?? '').toString().trim();

    tbody.insertAdjacentHTML('beforeend', `
      <tr data-id="${d.id}">
        <td>${b.name || '-'}</td>
        <td>${b.service || '-'}</td>
        <td>${b.phone || '-'}</td>
        <td class="small text-wrap" style="max-width:360px;white-space:pre-line">
          ${extra || '-'}
        </td>
        <td>${(b.date || '-')} ${(b.time || '')}</td>
        <td>
          <span class="badge ${ b.status==='done' ? 'text-bg-success'
                                 : b.status==='confirmed' ? 'text-bg-primary'
                                 : 'text-bg-secondary' }">
            ${b.status || 'pending'}
          </span>
        </td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-primary" data-action="status" data-s="confirmed">ยืนยัน</button>
          <button class="btn btn-sm btn-outline-success" data-action="status" data-s="done">เสร็จสิ้น</button>
          <button class="btn btn-sm btn-outline-danger" data-action="del">ลบ</button>
        </td>
      </tr>
    `);
  });

  tbody.querySelectorAll('button[data-action="status"]').forEach(btn => btn.onclick = async (e)=>{
    const tr = e.target.closest('tr'); const id = tr?.dataset?.id; const s = e.target.dataset.s;
    if (id) await updateDoc(doc(db,'bookings', id), { status: s });
  });
  tbody.querySelectorAll('button[data-action="del"]').forEach(btn => btn.onclick = async (e)=>{
    const tr = e.target.closest('tr'); const id = tr?.dataset?.id;
    if (id && confirm('ลบรายการนี้?')) await deleteDoc(doc(db,'bookings', id));
  });
});

// === TICKETS — show detail + newest first ===
onSnapshot(
  query(collection(db,'tickets'), orderBy('createdAt','desc')),
  snap => {
    const tbody = document.getElementById('ticketTableBody');
    if (!tbody) return;

    const rows = [];
    snap.forEach(d => {
      const t = d.data() || {};
      const email = t.email ?? t.contact ?? '-';
      const subject = t.subject ?? t.type ?? '-';
      const detail = (t.detail ?? t.details ?? t.message ?? '').toString();
      const status = t.status ?? 'open';

      rows.push(`
        <tr data-id="${d.id}">
          <td>${email}</td>
          <td>${subject}</td>
          <td class="small text-wrap" style="max-width:420px;white-space:pre-line">${detail || '-'}</td>
          <td><span class="badge ${status==='closed'?'bg-secondary':'bg-success'}">${status}</span></td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-primary" data-act="close">ปิด</button>
          </td>
        </tr>
      `);
    });
    tbody.innerHTML = rows.join('');
  }
);

// ปุ่มปิดงาน
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-act="close"]');
  if (!btn) return;
  const id = btn.closest('tr')?.dataset?.id;
  if (id) await updateDoc(doc(db,'tickets', id), { status: 'closed' });
});

// === REVIEWS — pending ===
onSnapshot(
  query(collection(db,'reviews'), where('approved','==', false)),
  snap => {
    const tbody = document.getElementById('reviewTableBody');
    if (!tbody) return;

    const items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    items.sort((a,b) => (a.createdAt?.seconds||0) - (b.createdAt?.seconds||0)); // เก่าสุดก่อน

    tbody.innerHTML = items.map(r => `
      <tr data-id="${r.id}">
        <td>${r.name || 'ผู้ใช้'}</td>
        <td>${r.rating ?? '-'}</td>
        <td>${r.text || ''}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-success btn-approve">อนุมัติ</button>
          <button class="btn btn-sm btn-outline-danger btn-del">ลบ</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.btn-approve').forEach(b => b.onclick = async e => {
      const id = e.target.closest('tr')?.dataset?.id;
      if (id) await updateDoc(doc(db,'reviews', id), { approved: true });
    });
    tbody.querySelectorAll('.btn-del').forEach(b => b.onclick = async e => {
      const id = e.target.closest('tr')?.dataset?.id;
      if (id && confirm('ลบรีวิวนี้?')) await deleteDoc(doc(db,'reviews', id));
    });
  }
);

// === REVIEWS — approved list ===
onSnapshot(
  query(collection(db,'reviews'), where('approved','==', true)),
  snap => {
    const tbody = document.getElementById('reviewApprovedTableBody');
    if (!tbody) return;

    const items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    // เรียงใหม่ -> ล่าสุดอยู่บน
    items.sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));

    tbody.innerHTML = items.map(r => `
      <tr data-id="${r.id}">
        <td>${r.name || 'ผู้ใช้'}</td>
        <td>${r.rating ?? '-'}</td>
        <td>${r.text || ''}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-secondary btn-unapprove">ยกเลิกอนุมัติ</button>
          <button class="btn btn-sm btn-outline-danger btn-del">ลบ</button>
        </td>
      </tr>
    `).join('');

    // ปุ่มยกเลิกอนุมัติ
    tbody.querySelectorAll('.btn-unapprove')
      .forEach(b => b.onclick = async (e) => {
        const id = e.target.closest('tr')?.dataset?.id;
        if (id) await updateDoc(doc(db,'reviews', id), { approved: false });
      });

    // ปุ่มลบ
    tbody.querySelectorAll('.btn-del').forEach(b => b.onclick = async e => {
      const id = e.target.closest('tr')?.dataset?.id;
      if (id && confirm('ลบรีวิวนี้?')) await deleteDoc(doc(db,'reviews', id));
    });
  }
);
