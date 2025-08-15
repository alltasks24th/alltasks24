// admin.js — หลังบ้าน realtime + unread badge + owner bootstrap
import { auth, db, ensureAnonAuth, logout } from './firebase-init.js';
import {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy, serverTimestamp, increment
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { el, pill } from './utils.js';

async function init(){
  await ensureAnonAuth();
  if(!auth.currentUser || auth.currentUser.isAnonymous){ location.href='login.html'; return; }
  el('#btnLogout')?.addEventListener('click', ()=>logout().then(()=>location.href='login.html'));
  await ensureRoleDocument(auth.currentUser.uid);
  const role = await getUserRole(auth.currentUser.uid);
  el('#roleBadge').textContent = role.toUpperCase();

  bindDashboard(); bindServices(); bindAreas(); bindBookings(); bindQuotes();
  bindReviews(); bindUsers(); bindPromos(); bindBanners(); bindFaq(); bindSettings(); bindChats();
}
init();

async function ensureRoleDocument(uid){
  try{
    const uref = doc(db,'users', uid);
    const snap = await getDoc(uref);
    const usersSnap = await getDocs(collection(db,'users'));
    const firstRun = usersSnap.size === 0;
    const bar = el('#firstRun');
    if(bar){
      bar.style.display = (!snap.exists() && firstRun) ? 'flex' : 'none';
      el('#btnBootstrapOwner').onclick = async ()=>{
        try{ await setDoc(uref, { uid, role:'owner', createdAt: serverTimestamp() }); alert('ตั้ง Owner สำเร็จ'); location.reload(); }
        catch(err){ alert('บันทึก Owner ไม่สำเร็จ: ' + (err.code || err.message)); }
      };
    }
  }catch(err){ alert('ตั้งค่าครั้งแรกผิดพลาด: ' + (err.code || err.message)); }
}

async function getUserRole(uid){
  const u = await getDoc(doc(db,'users', uid));
  return u.exists()? (u.data().role||'viewer') : 'viewer';
}

function renderTable(container, items, fields, actions){
  const headers = fields.map(f=>`<th>${f.label}</th>`).join('') + (actions?'<th class="text-end">จัดการ</th>':'');
  const rows = items.map(it=>`<tr>` + fields.map(f=>`<td>${(typeof f.value==='function')? f.value(it): (it[f.value]??'')}</td>`).join('') +
    (actions? `<td class="text-end">${actions(it)}</td>`:'') + `</tr>`).join('');
  el(container).innerHTML = `<div class="table-responsive"><table class="table align-middle">
    <thead><tr>${headers}</tr></thead><tbody>${rows||'<tr><td colspan="99" class="text-center text-muted">ยังไม่มีข้อมูล</td></tr>'}</tbody></table></div>`;
}

function bindDashboard(){
  onSnapshot(collection(db,'bookings'), snap=> el('#statBookings').textContent = snap.size);
  onSnapshot(query(collection(db,'reviews'), where('approved','==',false)), snap=> el('#statReviews').textContent = snap.size);
  onSnapshot(collection(db,'tickets'), snap=> el('#statQuotes').textContent = snap.size);
  onSnapshot(collection(db,'users'), snap=> el('#statUsers').textContent = snap.size);
}

function bindServices(){
  const ref = collection(db,'services');
  onSnapshot(ref, snap=>{
    const arr=[]; snap.forEach(d=>arr.push({id:d.id, ...d.data()}));
    renderTable('#serviceTable', arr, [
      {label:'ชื่อ', value:'name'}, {label:'หมวด', value:'category'},
      {label:'รายละเอียด', value: i=> i.description?.slice(0,80)||'' }
    ], i=>`<div class="btn-group">
      <button class="btn btn-sm btn-outline-secondary" data-id="${i.id}" data-act="edit">แก้ไข</button>
      <button class="btn btn-sm btn-outline-danger" data-id="${i.id}" data-act="del">ลบ</button></div>`);
  });
  el('#btnAddService').onclick = async ()=>{
    const name = prompt('ชื่อบริการ'); if(!name) return;
    const category = prompt('หมวดหมู่'); const description = prompt('รายละเอียดสั้น'); const imageUrl = prompt('ลิงก์รูปภาพ');
    await addDoc(ref, { name, category, description, imageUrl, createdAt: serverTimestamp() });
  };
}

function bindAreas(){
  const ref = collection(db,'serviceAreas');
  onSnapshot(ref, snap=>{
    const arr=[]; snap.forEach(d=>arr.push({id:d.id, ...d.data()}));
    renderTable('#areaTable', arr, [
      {label:'ชื่อพื้นที่', value:'name'}, {label:'จังหวัด', value:'province'},
      {label:'โน้ต', value: i=> i.note||'' }
    ], i=>`<div class="btn-group">
      <button class="btn btn-sm btn-outline-secondary" data-id="${i.id}" data-act="edit">แก้ไข</button>
      <button class="btn btn-sm btn-outline-danger" data-id="${i.id}" data-act="del">ลบ</button></div>`);
  });
  el('#btnAddArea').onclick = async ()=>{
    const name = prompt('ชื่อพื้นที่'); if(!name) return;
    const province = prompt('จังหวัด'); const note = prompt('โน้ต (ไม่บังคับ)');
    await addDoc(ref, { name, province, note, createdAt: serverTimestamp() });
  };
}

function bindBookings(){
  const ref = collection(db,'bookings');
  onSnapshot(query(ref, orderBy('createdAt','desc')), snap=>{
    const arr=[]; snap.forEach(d=>arr.push({id:d.id, ...d.data()}));
    renderTable('#bookingTable', arr, [
      {label:'ชื่อ', value:'name'}, {label:'บริการ', value:'service'},
      {label:'พื้นที่', value:'area'}, {label:'วันเวลา', value: i=> `${i.date||''} ${i.time||''}`},
      {label:'สถานะ', value:'status'}
    ], i=>`<div class="btn-group">
      <button class="btn btn-sm btn-outline-secondary" data-id="${i.id}" data-act="set:confirmed">ยืนยัน</button>
      <button class="btn btn-sm btn-outline-secondary" data-id="${i.id}" data-act="set:done">เสร็จสิ้น</button>
      <button class="btn btn-sm btn-outline-danger" data-id="${i.id}" data-act="del">ลบ</button></div>`);
  });
}

function bindQuotes(){
  const ref = collection(db,'tickets');
  onSnapshot(query(ref, orderBy('createdAt','desc')), snap=>{
    const arr=[]; snap.forEach(d=>arr.push({id:d.id, ...d.data()}));
    renderTable('#quoteTable', arr, [
      {label:'ประเภท', value:'type'}, {label:'ชื่อ', value:'name'},
      {label:'ติดต่อ', value:'contact'}, {label:'สถานะ', value:'status'},
      {label:'รายละเอียด', value: i=> i.details?.slice(0,80)||'' }
    ], i=>`<div class="btn-group">
      <button class="btn btn-sm btn-outline-secondary" data-id="${i.id}" data-act="set:closed">ปิดงาน</button>
      <button class="btn btn-sm btn-outline-danger" data-id="${i.id}" data-act="del">ลบ</button></div>`);
  });
}

function bindReviews(){
  const ref = collection(db,'reviews');
  onSnapshot(query(ref, orderBy('createdAt','desc')), snap=>{
    const arr=[]; snap.forEach(d=>arr.push({id:d.id, ...d.data()}));
    renderTable('#reviewTable', arr, [
      {label:'ชื่อ', value:'name'}, {label:'คะแนน', value:'rating'},
      {label:'อนุมัติ', value: i=> i.approved? pill('Yes','success'):pill('No','warning') },
      {label:'ข้อความ', value: i=> i.text?.slice(0,60)||'' }
    ], i=>`<div class="btn-group">
      <button class="btn btn-sm btn-outline-success" data-id="${i.id}" data-act="set:approve">อนุมัติ</button>
      <button class="btn btn-sm btn-outline-danger" data-id="${i.id}" data-act="del">ลบ</button></div>`);
  });
}

function bindUsers(){
  const ref = collection(db,'users');
  onSnapshot(ref, snap=>{
    const arr=[]; snap.forEach(d=>arr.push({id:d.id, ...d.data()}));
    renderTable('#userTable', arr, [
      {label:'UID', value:'uid'}, {label:'อีเมล', value:'email'},
      {label:'บทบาท', value:'role'}
    ], i=>`<div class="btn-group">
      <button class="btn btn-sm btn-outline-secondary" data-id="${i.id}" data-act="role:viewer">Viewer</button>
      <button class="btn btn-sm btn-outline-secondary" data-id="${i.id}" data-act="role:admin">Admin</button>
      <button class="btn btn-sm btn-outline-secondary" data-id="${i.id}" data-act="role:owner">Owner</button>
      <button class="btn btn-sm btn-outline-danger" data-id="${i.id}" data-act="del">ลบ</button></div>`);
  });
  el('#btnAddUser').onclick = async ()=>{
    const uid = prompt('UID ผู้ใช้'); if(!uid) return;
    const email = prompt('อีเมล (ไม่บังคับ)'); const role = prompt('บทบาท (viewer/admin/owner)','viewer')||'viewer';
    await setDoc(doc(db,'users', uid), { uid, email, role, createdAt: serverTimestamp() });
  };
}

function bindPromos(){
  const ref = collection(db,'promotions');
  onSnapshot(ref, snap=>{
    const arr=[]; snap.forEach(d=>arr.push({id:d.id, ...d.data()}));
    renderTable('#promoTable', arr, [
      {label:'ชื่อ', value:'title'}, {label:'ช่วงเวลา', value: i=> `${i.start?.toDate?.().toLocaleDateString('th-TH')||'-'} - ${i.end?.toDate?.().toLocaleDateString('th-TH')||'-'}`},
      {label:'คำอธิบาย', value: i=> i.description?.slice(0,60)||'' }
    ], i=>`<div class="btn-group">
      <button class="btn btn-sm btn-outline-secondary" data-id="${i.id}" data-act="edit">แก้ไข</button>
      <button class="btn btn-sm btn-outline-danger" data-id="${i.id}" data-act="del">ลบ</button></div>`);
  });
  el('#btnAddPromo').onclick = async ()=>{
    const title = prompt('ชื่อโปรโมชัน'); if(!title) return;
    const description = prompt('คำอธิบาย'); const imageUrl = prompt('ลิงก์รูปภาพ');
    const start = new Date(prompt('วันที่เริ่ม (YYYY-MM-DD)', new Date().toISOString().slice(0,10)));
    const end = new Date(prompt('วันที่สิ้นสุด (YYYY-MM-DD)', new Date(Date.now()+7*86400000).toISOString().slice(0,10)));
    await addDoc(ref, { title, description, imageUrl, start, end, createdAt: serverTimestamp() });
  };
}

function bindBanners(){
  const ref = collection(db,'banners');
  onSnapshot(ref, snap=>{
    const arr=[]; snap.forEach(d=>arr.push({id:d.id, ...d.data()}));
    renderTable('#bannerTable', arr, [
      {label:'ชื่อ', value:'title'}, {label:'คำโปรย', value:'subtitle'},
      {label:'รูปภาพ', value: i=> i.imageUrl? `<a href="${i.imageUrl}" target="_blank">เปิดรูป</a>`:'' }
    ], i=>`<div class="btn-group">
      <button class="btn btn-sm btn-outline-secondary" data-id="${i.id}" data-act="edit">แก้ไข</button>
      <button class="btn btn-sm btn-outline-danger" data-id="${i.id}" data-act="del">ลบ</button></div>`);
  });
  el('#btnAddBanner').onclick = async ()=>{
    const title = prompt('ชื่อ'); const subtitle = prompt('คำโปรย'); const imageUrl = prompt('ลิงก์รูปภาพ');
    await addDoc(ref, { title, subtitle, imageUrl, createdAt: serverTimestamp() });
  };
}

function bindFaq(){
  const ref = collection(db,'faqs');
  onSnapshot(ref, snap=>{
    const arr=[]; snap.forEach(d=>arr.push({id:d.id, ...d.data()}));
    renderTable('#faqTable', arr, [
      {label:'คำถาม', value:'q'}, {label:'คำตอบ', value: i=> i.a?.slice(0,80)||'' }
    ], i=>`<div class="btn-group">
      <button class="btn btn-sm btn-outline-secondary" data-id="${i.id}" data-act="edit">แก้ไข</button>
      <button class="btn btn-sm btn-outline-danger" data-id="${i.id}" data-act="del">ลบ</button></div>`);
  });
  el('#btnAddFaq').onclick = async ()=>{
    const q = prompt('คำถาม'); if(!q) return;
    const a = prompt('คำตอบ'); await addDoc(ref, { q, a, createdAt: serverTimestamp() });
  };
}

function bindSettings(){
  const ref = doc(db,'settings','public');
  getDoc(ref).then(snap=>{
    const d = snap.exists()? snap.data() : {};
    const frm = document.getElementById('settingsForm');
    frm.siteName.value = d.siteName||''; frm.heroText.value = d.heroText||''; frm.phone.value = d.phone||'';
    frm.line.value = d.line||''; frm.facebook.value = d.facebook||''; frm.mapUrl.value = d.mapUrl||''; frm.mediaPolicy.value = d.mediaPolicy||'';
  });
  document.getElementById('settingsForm').addEventListener('submit', async (e)=>{
    e.preventDefault(); const data = Object.fromEntries(new FormData(e.target).entries());
    await setDoc(ref, data, { merge:true }); document.getElementById('settingsMsg').textContent='บันทึกแล้ว'; setTimeout(()=>document.getElementById('settingsMsg').textContent='',2000);
  });
}

// ---------- Chats (admin) ----------
function bindChats(){
  const list = document.getElementById('chatThreadList');
  onSnapshot(query(collection(db,'chatThreads'), orderBy('createdAt','desc')), snap=>{
    list.innerHTML=''; snap.forEach(d=>{
      const t=d.data(); const item=document.createElement('a'); item.className='list-group-item list-group-item-action d-flex justify-content-between align-items-center';
      item.innerHTML = `<span>Thread: ${d.id.slice(0,6)}…</span>
        <span class="d-flex align-items-center gap-2">
          ${t.unreadAdmin? `<span class="badge text-bg-danger">${t.unreadAdmin}</span>`:''}
          <span class="small text-muted">${t.status||''}</span>
        </span>`; 
      item.href='#'; item.onclick=()=>openThread(d.id); list.appendChild(item);
    });
  });
}

let activeThreadId = null;
function openThread(id){
  activeThreadId = id; document.getElementById('chatRoom').style.display='block'; document.getElementById('chatRoomTitle').textContent='ห้องแชท #'+id.slice(0,6);
  const body = document.getElementById('chatRoomBody');
  onSnapshot(query(collection(db,'chatThreads', id, 'messages'), orderBy('createdAt')), snap=>{
    body.innerHTML=''; snap.forEach(m=>{ const d=m.data(); const who = d.sender==='user'? 'primary-subtle' : (d.sender==='agent'?'success-subtle':'secondary-subtle'); body.insertAdjacentHTML('beforeend', `<div class="p-2 rounded mb-1 bg-${who}">${d.sender}: ${d.text}</div>`); body.scrollTop=body.scrollHeight; });
  });
  // reset unread for admin when open
  updateDoc(doc(db,'chatThreads', id), { unreadAdmin: 0 });
  document.getElementById('chatReplySend').onclick = async ()=>{
    const text = document.getElementById('chatReply').value.trim(); if(!text) return;
    await addDoc(collection(db,'chatThreads', id, 'messages'), { sender:'agent', text, createdAt: serverTimestamp() });
    await updateDoc(doc(db,'chatThreads', id), { lastMessage: text, unreadUser: increment(1) });
    document.getElementById('chatReply').value='';
  };
}

// ---------- Generic row actions ----------
document.body.addEventListener('click', async (e)=>{
  const btn = e.target.closest('button'); if(!btn) return;
  const act = btn.dataset.act; if(!act) return;
  const id = btn.dataset.id;
  let refName = btn.closest('div.table-responsive')?.querySelector('table')?.parentElement?.parentElement?.id || '';
  // map container id to collection
  refName = refName.replace('Table',''); // e.g., serviceTable -> service
  const map = { service:'services', area:'serviceAreas', booking:'bookings', quote:'tickets', review:'reviews', user:'users', promo:'promotions', banner:'banners', faq:'faqs' };
  const col = map[refName.replace('Table','')] || map[refName];
  if(!col) return;
  const dref = doc(db, col, id);
  if(act==='del'){ if(confirm('ลบรายการนี้?')) await deleteDoc(dref); return; }
  if(act.startsWith('set:')){ const [,val]=act.split(':'); if(col in {bookings:1,tickets:1}) await updateDoc(dref,{status:val}); if(col==='reviews'&&val==='approve') await updateDoc(dref,{approved:true}); return; }
  if(act.startsWith('role:')){ const [,role]=act.split(':'); await updateDoc(dref,{role}); return; }
  if(act==='edit'){
    const snap = await getDoc(dref); const data=snap.data()||{};
    for(const k of Object.keys(data)){ if(['createdAt','start','end'].includes(k)) continue; const nv=prompt(`แก้ไข ${k}`, data[k]??''); if(nv===null) continue; data[k]=nv; }
    await updateDoc(dref, data);
  }
});
