// admin.js — ฝั่งหลังบ้าน (Realtime + CRUD คร่าว ๆ)
import { db } from './firebase-init.js';
import { requireAdmin, logout } from './auth.js';
import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, onSnapshot,
  query, orderBy, serverTimestamp, Timestamp, where, increment, setDoc // <-- ใช้ setDoc ด้วย
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { limit } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';


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
try{document.getElementById('svcTags').value=Array.isArray(v?.tags)?v.tags.join(', '):(v?.tags||'');document.getElementById('svcGallery').value=Array.isArray(v?.gallery)?v.gallery.join('\n'):(v?.gallery||'');}catch(e){}

      new bootstrap.Modal(document.getElementById('svcModal')).show();
    }));
  });
  $('#svcSave').addEventListener('click', async ()=>{
  const tags=(document.getElementById('svcTags')?.value||'').split(',').map(s=>s.trim()).filter(Boolean);
  const gallery=(document.getElementById('svcGallery')?.value||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);

    const id=$('#svcId').value; const data={ name:$('#svcName').value, category:$('#svcCat').value, imageUrl:$('#svcImg').value, description:$('#svcDesc').value, tags: tags,
    gallery: gallery,
    updatedAt: serverTimestamp() };
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
      teamState:(document.querySelector('input[name="teamState"]:checked')||{}).value||'off',
      teamHeadcount:parseInt($('#teamCount')?.value||0)||0,
      teamNote:($('#teamNote')?.value||'').trim(),
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

// รีเซ็ตฟอร์มแบนเนอร์ (ให้แน่ใจว่า banId ว่างเสมอเวลาจะ "เพิ่ม")
function resetBannerForm(){
  const $ = (s,r=document)=>r.querySelector(s);
  $('#banId').value = '';
  $('#banTitle').value = '';
  $('#banSub').value = '';
  $('#banImg').value = '';
}

// 1) กดปุ่ม "เพิ่มสไลด์" -> ล้างฟอร์มก่อนเปิดโมดอล
document.querySelectorAll('#tab-banners [data-bs-target="#bannerModal"]').forEach(btn=>{
  btn.addEventListener('click', resetBannerForm);
});

// 2) ปิดโมดอลเมื่อไหร่ -> ล้างทิ้งด้วย กันค่าค้าง
document.getElementById('bannerModal')?.addEventListener('hidden.bs.modal', resetBannerForm);

/* ===== ADMIN: PRODUCTS CRUD ===== */
(function setupAdminProducts(){
  const $ = (s,r=document)=>r.querySelector(s);

  const F = {
    id: $('#prodId'),
    name: $('#name'), desc: $('#desc'),
    price: $('#price'), unit: $('#unit'),
    salePrice: $('#salePrice'), saleStart: $('#saleStart'), saleEnd: $('#saleEnd'),
    cover: $('#cover'), gallery: $('#gallery'), tags: $('#tags'),
    stock: $('#stock'), rank: $('#rank'), promoText: $('#promoText'),
    featured: $('#featured'), isBestSeller: $('#isBestSeller'), isNew: $('#isNew'),
    freeShip: $('#freeShip'), isActive: $('#isActive'),
    btnSave: $('#btnSave'), btnReset: $('#btnReset'), btnDelete: $('#btnDelete'),
    table: $('#productsTable')
  };

  if (!F.table) return; // ถ้าไม่มีแท็บสินค้า ให้ข้าม

  const toTS = (v)=>{ if(!v) return null; const d=new Date(v); return isNaN(d)?null:Timestamp.fromDate(d); };
  const parseCSV = (s)=> (s||'').split(',').map(x=>x.trim()).filter(Boolean);

  function fillForm(p){
    F.id.value = p?.id || '';
    F.name.value = p?.name || '';
    F.desc.value = p?.desc || '';
    F.price.value = p?.price ?? '';
    F.unit.value = p?.unit || '';
    F.salePrice.value = p?.salePrice ?? '';
    F.saleStart.value = p?.saleStart?.toDate ? p.saleStart.toDate().toISOString().slice(0,16) : '';
    F.saleEnd.value = p?.saleEnd?.toDate ? p.saleEnd.toDate().toISOString().slice(0,16) : '';
    F.cover.value = p?.cover || '';
    F.gallery.value = (p?.gallery||[]).join(', ');
    F.tags.value = (p?.tags||[]).join(', ');
    F.stock.value = p?.stock ?? '';
    F.rank.value = p?.rank ?? 999;
    F.promoText.value = p?.promoText || '';
    F.featured.checked = !!p?.featured;
    F.isBestSeller.checked = !!p?.isBestSeller;
    F.isNew.checked = !!p?.isNew;
    F.freeShip.checked = !!p?.freeShip;
    F.isActive.checked = p?.isActive !== false;
    F.btnDelete.classList.toggle('d-none', !p?.id);
  }

  F.btnReset?.addEventListener('click', ()=> fillForm(null));

  F.btnDelete?.addEventListener('click', async ()=>{
    if (!F.id.value) return;
    if (!confirm('ลบสินค้านี้?')) return;
    await deleteDoc(doc(collection(db,'products'), F.id.value));
    fillForm(null);
  });

  document.getElementById('productForm')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  try {
    // ตรวจช่องจำเป็นเองอีกชั้น เพื่อให้มีข้อความชัดเจน
    if (!F.name.value.trim()) { alert('กรุณากรอกชื่อสินค้า'); F.name.focus(); return; }
    if (!F.price.value) { alert('กรุณากรอกราคา'); F.price.focus(); return; }

    // ปิดปุ่มระหว่างบันทึก (กันกดซ้ำ)
    F.btnSave.disabled = true;
    F.btnSave.innerHTML = 'กำลังบันทึก...';

    const data = {
      name: F.name.value.trim(),
      desc: F.desc.value.trim(),
      price: Number(F.price.value)||0,
      unit: F.unit.value.trim() || null,
      salePrice: F.salePrice.value ? Number(F.salePrice.value) : null,
      saleStart: toTS(F.saleStart.value),
      saleEnd: toTS(F.saleEnd.value),
      cover: F.cover.value.trim() || null,
      gallery: parseCSV(F.gallery.value),
      tags: parseCSV(F.tags.value),
      stock: F.stock.value ? Number(F.stock.value) : null,
      rank: F.rank.value ? Number(F.rank.value) : 999,
      promoText: F.promoText.value.trim() || null,
      featured: F.featured.checked,
      isBestSeller: F.isBestSeller.checked,
      isNew: F.isNew.checked,
      freeShip: F.freeShip.checked,
      isActive: F.isActive.checked,
      updatedAt: Timestamp.now()
    };

    if (!F.id.value){
      data.createdAt = Timestamp.now();
      const ref = await addDoc(collection(db,'products'), data);
      F.id.value = ref.id;
    } else {
      await updateDoc(doc(collection(db,'products'), F.id.value), data);
    }

    alert('บันทึกแล้ว');
    // อยากให้ฟอร์มพร้อมเพิ่มรายการใหม่ต่อได้เลย
    fillForm(null);
  } catch (err) {
    console.error('[product save error]', err);
    alert('บันทึกไม่สำเร็จ: ' + (err?.message || err));
  } finally {
    F.btnSave.disabled = false;
    F.btnSave.textContent = 'บันทึก';
  }
});

  // ตาราง realtime เรียงตาม rank
  onSnapshot(query(collection(db,'products'), orderBy('rank','asc')), snap=>{
    F.table.innerHTML = '';
    snap.forEach(docSnap=>{
      const d = docSnap.data(), id = docSnap.id;
      const priceHtml = (typeof d.salePrice==='number' && d.salePrice < d.price)
        ? `<del class="text-muted">฿${(d.price||0).toLocaleString()}</del> <span class="text-danger">฿${(d.salePrice||0).toLocaleString()}</span>`
        : `฿${(d.price||0).toLocaleString()}${d.unit?` / ${d.unit}`:''}`;
      F.table.insertAdjacentHTML('beforeend', `
        <tr data-id="${id}">
          <td class="text-center">${d.rank??''}</td>
          <td>${d.name||''}</td>
          <td>${priceHtml}</td>
          <td class="small">${(d.tags||[]).join(', ')}</td>
          <td><input type="checkbox" class="form-check-input form-check-input-sm act-featured" ${d.featured?'checked':''}></td>
          <td><input type="checkbox" class="form-check-input form-check-input-sm act-active" ${d.isActive!==false?'checked':''}></td>
          <td class="text-nowrap">
            <button class="btn btn-sm btn-outline-secondary act-up">▲</button>
            <button class="btn btn-sm btn-outline-secondary act-down">▼</button>
            <button class="btn btn-sm btn-primary act-edit">แก้ไข</button>
          </td>
        </tr>
      `);
    });
  });

  // จัดการปุ่มในตาราง
  F.table?.addEventListener('click', async (e)=>{
    const tr = e.target.closest('tr[data-id]'); if(!tr) return;
    const id = tr.getAttribute('data-id');

    if (e.target.classList.contains('act-edit')){
      const snap = await getDoc(doc(collection(db,'products'), id));
      fillForm({id, ...snap.data()});
      document.getElementById('tab-products-tab')?.click();
    }
    if (e.target.classList.contains('act-up') || e.target.classList.contains('act-down')){
      const dir = e.target.classList.contains('act-up') ? -1 : 1;
      const cur = Number(tr.children[0].textContent)||999;
      await updateDoc(doc(collection(db,'products'), id), { rank: cur + dir, updatedAt: Timestamp.now() });
    }
    if (e.target.classList.contains('act-featured')){
      await updateDoc(doc(collection(db,'products'), id), { featured: e.target.checked, updatedAt: Timestamp.now() });
    }
    if (e.target.classList.contains('act-active')){
      await updateDoc(doc(collection(db,'products'), id), { isActive: e.target.checked, updatedAt: Timestamp.now() });
    }
  });
})();


/* Dashboard Enhancements injected */
requireAdmin(async (user, role) => {
  // 1) Counters
  onSnapshot(collection(db,'services'), snap => {
    const el = document.getElementById('countServices'); if (el) el.textContent = snap.size;
  });
  onSnapshot(collection(db,'reviews'), snap => {
    const el = document.getElementById('countReviewsAll'); if (el) el.textContent = snap.size;
  });
  onSnapshot(collection(db,'promotions'), snap => {
    const el = document.getElementById('countPromosActive'); if (!el) return;
    const now = Date.now(); let active = 0;
    snap.forEach(d => {
      const p = d.data() || {};
      const st = p.start?.toDate?.()?.getTime?.();
      const en = p.end?.toDate?.()?.getTime?.();
      if ((st==null || st <= now) && (en==null || en >= now)) active++;
    });
    el.textContent = active;
  });

  // 2) Latest bookings (5-10)
  onSnapshot(query(collection(db,'bookings'), orderBy('createdAt','desc'), limit(10)), snap => {
    const body = document.getElementById('latestBookingsBody'); if (!body) return;
    body.innerHTML='';
    snap.forEach(d => {
      const b = d.data() || {};
      const dateText = [b.date, b.time].filter(Boolean).join(' ') || (b.createdAt?.toDate?.()?.toLocaleString?.('th-TH') || '-');
      const note = (b.note ?? '').toString();
      body.insertAdjacentHTML('beforeend', `<tr>
        <td>${(b.service||'').toString()}</td>
        <td>${(b.name||'').toString()}</td>
        <td>${dateText}</td>
        <td class="small text-wrap" style="max-width:320px;white-space:pre-line">${note || '-'}</td>
      </tr>`);
    });
    if (!body.children.length) body.innerHTML = '<tr><td colspan="4" class="text-muted small">ยังไม่มีข้อมูล</td></tr>';
  });

  // 3) Active promotions
  onSnapshot(collection(db,'promotions'), snap => {
    const ul = document.getElementById('activePromoList'); if (!ul) return;
    const now = Date.now(); const items = [];
    snap.forEach(d => {
      const p = d.data() || {};
      const st = p.start?.toDate?.()?.getTime?.();
      const en = p.end?.toDate?.()?.getTime?.();
      const active = (st==null || st <= now) && (en==null || en >= now);
      if (active) items.push({ id:d.id, ...p, endTs: en ?? Number.POSITIVE_INFINITY });
    });
    items.sort((a,b)=> (a.endTs||Infinity) - (b.endTs||Infinity));
    ul.innerHTML = items.map(p => `
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <span class="text-truncate">${(p.title||'-').toString()}</span>
        <span class="small text-muted">${p.end?.toDate?.()?.toLocaleDateString?.('th-TH') ?? '—'}</span>
      </li>`).join('');
  });

  // 4) Top services from bookings
  onSnapshot(collection(db,'bookings'), snap => {
    const body = document.getElementById('topServicesBody'); if (!body) return;
    const cnt = {};
    snap.forEach(d=> {
      const svc = (d.data()?.service || '').toString().trim();
      if (!svc) return; cnt[svc] = (cnt[svc]||0)+1;
    });
    const top = Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,10);
    body.innerHTML = top.map(([name,total], idx) => `
      <tr><td>${idx+1}</td><td>${name}</td>
      <td class="text-end">${total}</td><td class="text-end">—</td></tr>`).join('');
    if (!body.children.length) body.innerHTML = '<tr><td colspan="4" class="text-muted small">ยังไม่มีข้อมูล</td></tr>';
  });

  // 5) Statistics (daily & monthly)
  async function bookingDaily(days=30) {
    try {
      const since = new Date(); since.setDate(since.getDate() - days);
      const qs = query(collection(db,'bookings'), where('createdAt','>=', Timestamp.fromDate(since)), orderBy('createdAt','asc'));
      const snap = await getDocs(qs);
      const bucket = {};
      snap.forEach(d => {
        const t = d.data()?.createdAt?.toDate?.(); if(!t) return;
        const key = t.toISOString().slice(0,10);
        bucket[key] = (bucket[key]||0) + 1;
      });
      const labels = Array.from({length:days}, (_,i)=> {
        const dt = new Date(since); dt.setDate(since.getDate()+i);
        return dt.toISOString().slice(0,10);
      });
      const data = labels.map(k=> bucket[k] || 0);
      return {labels, data};
    } catch(e){ console.error(e); return {labels:[], data:[]}; }
  }

  async function drawDailyChart(){
    if (!window.Chart) return;
    const el = document.getElementById('chartDaily'); if (!el) return;
    const {labels, data} = await bookingDaily(30);
    new Chart(el.getContext('2d'), { type:'line', data:{ labels, datasets:[{ label:'การจอง/วัน', data }] } });
  }

  async function drawMonthlyChart(){
    if (!window.Chart) return;
    const el = document.getElementById('chartMonthly'); if (!el) return;
    const snap = await getDocs(query(collection(db,'bookings'), orderBy('createdAt','asc')));
    const buckets = {};
    snap.forEach(d=>{
      const t = d.data()?.createdAt?.toDate?.(); if(!t) return;
      const key = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}`;
      buckets[key] = (buckets[key]||0)+1;
    });
    const labels = Object.keys(buckets).sort();
    const data = labels.map(k=> buckets[k]);
    new Chart(el.getContext('2d'), { type:'bar', data:{ labels, datasets:[{ label:'การจอง/เดือน', data }] } });
  }

  drawDailyChart(); drawMonthlyChart();

  // 6) Notifications
  function notify(title, text){
    const box = document.getElementById('notifBox'); if(!box) return;
    box.insertAdjacentHTML('afterbegin', `
      <div class="alert alert-warning alert-dismissible fade show" role="alert">
        <strong>${title}</strong> — ${text}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>`);
  }

  // booking new
  {
    const key='lastSeenBookingTsV2';
    let primed=false;
    onSnapshot(query(collection(db,'bookings'), orderBy('createdAt','desc'), limit(1)), snap=>{
      const d = snap.docs[0]; if(!d) return;
      const ts = d.data()?.createdAt?.toMillis?.() ?? Date.now();
      const last = Number(localStorage.getItem(key)||0);
      if(!primed){ localStorage.setItem(key, String(ts)); primed=true; return; }
      if(ts>last){ notify('การจองใหม่', `${d.data()?.name||'ลูกค้า'} • ${d.data()?.service||'-'}`); localStorage.setItem(key, String(ts)); }
    });
  }

  // review new (pending approval)
  {
    const key='lastSeenReviewTsV2';
    let primed=false;
    onSnapshot(collection(db,'reviews'), snap=>{
      const docs = snap.docs.map(x=>x.data()).filter(v=>v && v.approved===false);
      const latest = docs.map(v => v.createdAt?.toMillis?.() ?? 0).reduce((a,b)=>Math.max(a,b), 0);
      const last = Number(localStorage.getItem(key)||0);
      if(!primed){ if(latest) localStorage.setItem(key, String(latest)); primed=true; return; }
      if(latest>last){ notify('รีวิวใหม่', `มีรีวิวรออนุมัติ`); localStorage.setItem(key, String(latest)); }
    });
  }

  // promotions expiring soon (7 days)
  onSnapshot(collection(db,'promotions'), snap=>{
    const soon = Date.now() + 7*24*3600*1000;
    snap.forEach(d => {
      const p = d.data() || {}; const end = p.end?.toDate?.()?.getTime?.();
      if(end && end < soon && end >= Date.now()){
        notify('โปรโมชันใกล้หมดอายุ', p.title || d.id);
      }
    });
  });
});


// === Sidebar toggle (persist state) + Pricing frame reload ===
(function(){
  try{
    const key = 'adminSidebarCollapsed';
    if (localStorage.getItem(key) === '1') document.body.classList.add('sidebar-collapsed');
    document.getElementById('btnSidebar')?.addEventListener('click', ()=>{
      const on = document.body.classList.toggle('sidebar-collapsed');
      localStorage.setItem(key, on ? '1' : '0');
    });
    document.getElementById('btnReloadPricing')?.addEventListener('click', ()=>{
      const f = document.getElementById('pricingFrame');
      if (f && f.contentWindow) { try { f.contentWindow.location.reload(); } catch (e) { /* ignore */ } }
    });
  }catch(e){ console.warn('sidebar/pricing add-on:', e); }
})();



  async function loadTeamFromSettings(){
    try{
      const sRef=doc(db,'settings','public');
      const snap=await getDoc(sRef);
      if(!snap.exists()) return;
      const d=snap.data()||{};
      const r=document.querySelector(`input[name="teamState"][value="${d.teamState||'off'}"]`);
      if(r) r.checked=true;
      const c=document.getElementById('teamCount'); if(c&&d.teamHeadcount!=null) c.value=d.teamHeadcount;
      const n=document.getElementById('teamNote'); if(n&&d.teamNote!=null) n.value=d.teamNote;
    }catch(e){ console.error(e); }
  }
  document.addEventListener('DOMContentLoaded', loadTeamFromSettings);


/* ===== Image Upload to Firebase Storage (v40 patch) ===== */

// อัปโหลดไฟล์ พร้อม progress (console)
async function uploadImageWithProgress(file, path) {
  return new Promise((resolve, reject) => {
    try {
      if (!firebase?.storage) return reject(new Error('Firebase Storage SDK not loaded'));
      const storage = firebase.storage();
      const cleanName = (file?.name || 'image').replace(/[^\w.\-]+/g, '_');
      const ref = storage.ref(`${path}/${Date.now()}_${cleanName}`);
      const task = ref.put(file, { contentType: file.type || 'image/jpeg' });

      task.on('state_changed',
        snap => {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          console.log(`[upload] ${path} ${pct}%`);
        },
        err => reject(err),
        async () => {
          try {
            const url = await ref.getDownloadURL();
            resolve(url);
          } catch (e) { reject(e); }
        }
      );

      // กันค้าง 120 วิ
      setTimeout(() => {
        if (task.snapshot?.state !== 'success') {
          try { task.cancel(); } catch {}
          reject(new Error('Upload timeout'));
        }
      }, 120000);
    } catch (e) {
      reject(e);
    }
  });
}

// ผูก input[type=file] -> เขียนค่าไปยัง input/url/textarea ที่ระบุ
function bindUploaders() {
  const $ = (id) => document.getElementById(id);

  // helper: ผูกไฟล์เข้าช่องปลายทาง
  const hook = (fileInputId, targetInputId, path, { append=false, newline=false } = {}) => {
    const fi = $(fileInputId);
    const to = $(targetInputId);
    if (!fi || !to) return; // ไม่มี element ก็ข้าม

    fi.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;

      // ปิดปุ่มบันทึกชั่วคราว (ถ้ามี)
      const btns = document.querySelectorAll('button, .btn');
      btns.forEach(b => b.disabled = true);

      try {
        for (const f of files) {
          const url = await uploadImageWithProgress(f, path);
          if (append) {
            if (newline) {
              to.value = (to.value ? to.value.trim() + '\n' : '') + url;
            } else {
              to.value = (to.value ? (to.value + ', ') : '') + url;
            }
          } else {
            to.value = url;
          }
        }
      } catch (err) {
        console.error(err);
        alert('อัปโหลดไฟล์ล้มเหลว: ' + (err?.message || err));
      } finally {
        // เปิดปุ่มคืน
        btns.forEach(b => b.disabled = false);
        fi.value = ''; // reset input file
      }
    });
  };

  // ====== Mapping ตาม id ที่มีอยู่ใน admin.html (v40) ======
  // แบนเนอร์
  hook('banImgFile',   'banImg',     'uploads/banners');

  // โปรโมชัน
  hook('promoImgFile', 'promoImg',   'uploads/promotions');

  // บริการ
  hook('svcFile',      'svcImg',     'uploads/services');                    // รูปหลัก
  hook('svcGalFiles',  'svcGallery', 'uploads/services', { append:true, newline:true }); // แกลเลอรี (textarea บรรทัดละ 1 URL)

  // สินค้า (ร้านค้า)
  hook('prodCoverFile','cover',      'uploads/products');                    // รูปปก
  hook('prodGalFiles', 'gallery',    'uploads/products', { append:true });   // แกลเลอรี (คั่นด้วย , )
}

// ให้โค้ดทำงานหลัง DOM พร้อม (ปลอดภัยกับไฟล์ยาว)
document.addEventListener('DOMContentLoaded', bindUploaders);
/* ===== /Image Upload patch ===== */
