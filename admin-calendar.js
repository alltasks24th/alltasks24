// admin-calendar.js — Calendar (Today/Week) for bookings
import { db } from './firebase-init.js';
import {
  collection, query, where, orderBy, onSnapshot, updateDoc, doc, Timestamp
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

const $ = (s, r=document)=> r.querySelector(s);

let unsub = null;

function pad(n){ return String(n).padStart(2,'0'); }
function ymd(d){
  const yy = d.getFullYear();
  const mm = pad(d.getMonth()+1);
  const dd = pad(d.getDate());
  return `${yy}-${mm}-${dd}`;
}
function startOfWeek(d){ // Monday
  const day = d.getDay(); // 0-6
  const diff = (day===0? -6 : 1 - day);
  const nd = new Date(d); nd.setDate(d.getDate() + diff); nd.setHours(0,0,0,0); return nd;
}
function addDays(d, n){ const nd = new Date(d); nd.setDate(d.getDate()+n); return nd; }

function setDefaults(){
  const inp = $('#calDate');
  if (inp && !inp.value){
    const now = new Date();
    inp.value = ymd(now);
  }
}

function badge(status){
  const key = String(status || 'pending').toLowerCase();
  const TH = {
    pending: 'รอตรวจ',
    confirmed: 'ยืนยันแล้ว',
    in_progress: 'กำลังทำ',
    done: 'เสร็จแล้ว',
    canceled: 'ยกเลิก'
  };
  const label = TH[key] ?? key;
  return `<span class="cal-badge ${key}">${label}</span>`;
};
  const label = TH[key] ?? key;
  return `<span class="cal-badge ${key}">${label}</span>`;
}">${s}</span>`;
}

function itemRow(id, b){
  const dateText = [b.date, b.time].filter(Boolean).join(' ');
  const extra = (b.note ?? b.detail ?? b.details ?? '').toString().trim();
  return `<div class="cal-item" data-id="${id}">
    <div class="d-flex justify-content-between align-items-start">
      <div class="pe-2">
        <div class="title">${(b.service||'-')} <span class="text-muted">• ${(b.name||'-')}</span></div>
        <div class="meta">${dateText || ''}${b.phone? ' • ' + b.phone : ''}</div>
        ${extra? `<div class="small text-muted mt-1" style="white-space:pre-line">${extra}</div>`:''}
      </div>
      <div>${badge(b.status)}</div>
    </div>
    <div class="cal-actions mt-2">
      <button class="btn btn-sm btn-outline-primary act-status" data-s="confirmed">ยืนยัน</button>
      <button class="btn btn-sm btn-outline-warning act-status" data-s="in_progress">กำลังทำ</button>
      <button class="btn btn-sm btn-outline-success act-status" data-s="done">เสร็จ</button>
      <button class="btn btn-sm btn-outline-danger act-status" data-s="canceled">ยกเลิก</button>
    </div>
  </div>`;
}

function bindStatusButtons(container){
  container.querySelectorAll('.act-status').forEach(btn=>{
    btn.addEventListener('click', async (e)=>{
      const wrap = e.target.closest('.cal-item');
      const id = wrap?.dataset?.id; if (!id) return;
      const s = e.target.dataset.s;
      try{
        await updateDoc(doc(collection(db,'bookings'), id), { status: s, updatedAt: Timestamp.now() });
      }catch(err){
        alert('อัปเดตไม่สำเร็จ: ' + (err?.message || err));
      }
    });
  });
}

function renderToday(snap, filterStatus){
  const box = $('#calTodayList'); if (!box) return;
  const items = [];
  snap.forEach(d=>{
    const b = d.data() || {};
    if (filterStatus && (b.status||'pending') !== filterStatus) return;
    items.push({ id: d.id, b });
  });
  box.innerHTML = items.length
    ? items.map(x=> itemRow(x.id, x.b)).join('')
    : `<div class="cal-empty p-2">ยังไม่มีงาน</div>`;
  bindStatusButtons(box);
}

function renderWeek(snap, start, end, filterStatus){
  const grid = $('#calWeekGrid'); if (!grid) return;

  const dayMap = new Map();
  for (let i=0;i<7;i++){
    const d = addDays(start, i), key = ymd(d);
    dayMap.set(key, []);
  }

  snap.forEach(d=>{
    const b = d.data() || {};
    const k = (b.date || '').slice(0,10);
    if (!dayMap.has(k)) return;
    if (filterStatus && (b.status||'pending') !== filterStatus) return;
    dayMap.get(k).push({ id: d.id, b });
  });

  // sort each day by time
  for (const [k, arr] of dayMap){
    arr.sort((a,b)=> (a.b.time||'') < (b.b.time||'') ? -1 : 1);
  }

  const days = Array.from(dayMap.keys());
  grid.innerHTML = days.map((k, idx)=>{
    const d = addDays(start, idx);
    const label = d.toLocaleDateString('th-TH', { weekday:'short', day:'2-digit', month:'short' });
    const list = dayMap.get(k);
    return `<div class="cal-week-day">
      <div class="hd"><div>${label}</div><div class="text-muted small">${list.length} งาน</div></div>
      <div class="list">
        ${ list.length ? list.map(x => `<div class="cal-item" data-id="${x.id}">
              <div class="d-flex justify-content-between align-items-center">
                <div class="title">${(x.b.time || '--:--')} • ${(x.b.service||'-')}</div>
                <div>${badge(x.b.status)}</div>
              </div>
              <div class="meta">${(x.b.name||'-')}${x.b.phone? ' • ' + x.b.phone : ''}</div>
              <div class="cal-actions mt-2">
                <button class="btn btn-sm btn-outline-primary act-status" data-s="confirmed">ยืนยัน</button>
                <button class="btn btn-sm btn-outline-warning act-status" data-s="in_progress">กำลังทำ</button>
                <button class="btn btn-sm btn-outline-success act-status" data-s="done">เสร็จ</button>
                <button class="btn btn-sm btn-outline-danger act-status" data-s="canceled">ยกเลิก</button>
              </div>
            </div>`).join('') : `<div class="cal-empty">—</div>` }
      </div>
    </div>`;
  }).join('');

  bindStatusButtons(grid);
}

function refresh(){
  if (typeof unsub === 'function'){ try{unsub();}catch{}; unsub = null; }

  const dateStr = $('#calDate')?.value || ymd(new Date());
  const view = $('#calView')?.value || 'today';
  const statusFilter = $('#calStatus')?.value || '';

  if (view === 'today'){
    const qy = query(collection(db,'bookings'), where('date','==', dateStr), orderBy('createdAt','desc'));
    unsub = onSnapshot(qy, (snap)=>{
      $('#calTodayWrap')?.classList.remove('d-none');
      $('#calWeekWrap')?.classList.add('d-none');
      renderToday(snap, statusFilter);
    });
  }else{
    const d = new Date(dateStr);
    const start = startOfWeek(d);
    const end = addDays(start, 6);
    const from = ymd(start);
    const to = ymd(end);
    const qy = query(collection(db,'bookings'),
              where('date','>=', from),
              where('date','<=', to + '\uf8ff'),
              orderBy('date','asc'));
    unsub = onSnapshot(qy, (snap)=>{
      $('#calTodayWrap')?.classList.add('d-none');
      $('#calWeekWrap')?.classList.remove('d-none');
      renderWeek(snap, start, end, statusFilter);
    });
  }
}

function bind(){
  $('#calDate')?.addEventListener('change', refresh);
  $('#calView')?.addEventListener('change', refresh);
  $('#calStatus')?.addEventListener('change', refresh);
  $('#calRefresh')?.addEventListener('click', refresh);
}

document.addEventListener('DOMContentLoaded', ()=>{
  setDefaults();
  bind();
  refresh();
});
