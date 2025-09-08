
// admin-ops.js — โมดูลเสริม: ใบงาน + สต๊อก (ไม่กระทบของเดิม)
import { db } from './firebase-init.js';
import { requireAdmin } from './auth.js';
import {
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc, getDoc, getDocs,
  onSnapshot, query, orderBy, where, serverTimestamp, runTransaction, limit
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

const $ = (s, r=document)=> r.querySelector(s);
const $$ = (s, r=document)=> Array.from(r.querySelectorAll(s));

// ===== Utilities =====
function fmt(n){
  n = Number(n||0);
  return n.toLocaleString('th-TH', {maximumFractionDigits:2});
}
function fmtDT(ts){
  try{
    if (!ts) return '-';
    if (typeof ts?.toDate === 'function') return ts.toDate().toLocaleString('th-TH');
    if (typeof ts === 'number') return new Date(ts).toLocaleString('th-TH');
    if (typeof ts === 'string') return new Date(ts).toLocaleString('th-TH');
  }catch(e){}
  return '-';
}
function genJobCode(){
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = (d.getMonth()+1).toString().padStart(2,'0');
  const dd= d.getDate().toString().padStart(2,'0');
  const rand = Math.floor(Math.random()*900+100); // 100-999
  return `J${y}${m}${dd}-${rand}`;
}

// ===== Main =====
requireAdmin(async (user, role)=>{

  // ---------- JOBS ----------
  const jobModal = new bootstrap.Modal(document.getElementById('jobModal'), {backdrop:'static'});
  const F = {
    id: $('#jobId'),
    code: $('#jobCode'),
    status: $('#jobStatus'),
    assign: $('#jobAssign'),
    cusName: $('#jobCusName'),
    cusPhone: $('#jobCusPhone'),
    cusAddr: $('#jobCusAddr'),
    service: $('#jobService'),
    desc: $('#jobDesc'),
    schedule: $('#jobSchedule'),
    quote: $('#jobQuote'),
    deposit: $('#jobDeposit'),
    travel: $('#jobTravelCost'),
    other: $('#jobOtherCost'),
    matBody: $('#jobMatBody'),
    btnAddMat: $('#matAddRow'),
    btnSave: $('#jobSave'),
    btnDelete: $('#jobDelete')
  };

  function addMatRow(item){
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input class="form-control form-control-sm mat-name" placeholder="ชื่อวัสดุ" value="${item?.name||''}"></td>
      <td style="width:120px"><input type="number" min="0" step="0.01" class="form-control form-control-sm mat-qty" value="${item?.qty||0}"></td>
      <td style="width:140px"><input type="number" min="0" step="0.01" class="form-control form-control-sm mat-cost" value="${item?.unitCost||0}"></td>
      <td style="width:60px"><button type="button" class="btn btn-sm btn-outline-danger mat-del"><i class="bi bi-x"></i></button></td>
    `;
    tr.querySelector('.mat-del').onclick = ()=> tr.remove();
    F.matBody.appendChild(tr);
  }

  F.btnAddMat?.addEventListener('click', ()=> addMatRow());

  function fillJobForm(j){
    F.id.value = j?.id || '';
    F.code.value = j?.code || genJobCode();
    F.status.value = j?.status || 'new';
    F.assign.value = j?.assign || '';
    F.cusName.value = j?.customer?.name || '';
    F.cusPhone.value = j?.customer?.phone || '';
    F.cusAddr.value = j?.customer?.address || '';
    F.service.value = j?.service || '';
    F.desc.value = j?.desc || '';
    F.schedule.value = (j?.schedule?.toDate?.()?.toISOString?.()?.slice(0,16)) || '';
    F.quote.value = j?.quote ?? 0;
    F.deposit.value = j?.deposit ?? 0;
    F.travel.value = j?.travelCost ?? 0;
    F.other.value = j?.otherCost ?? 0;
    F.matBody.innerHTML = '';
    (j?.materials||[]).forEach(addMatRow);
    F.btnDelete.classList.toggle('d-none', !j?.id);
  }

  function readJobForm(){
    const mats = Array.from(F.matBody?.children||[]).map(tr=>({
      name: tr.querySelector('.mat-name')?.value?.trim()||'',
      qty: Number(tr.querySelector('.mat-qty')?.value||0),
      unitCost: Number(tr.querySelector('.mat-cost')?.value||0),
    })).filter(r=> r.name && r.qty>0);

    const quote = Number(F.quote.value||0);
    const travel = Number(F.travel.value||0);
    const other = Number(F.other.value||0);
    const matsCost = mats.reduce((s,r)=> s + (r.qty*r.unitCost), 0);
    const estTotal = quote; // ผู้ใช้กรอก final ตามจริงภายหลังได้ แต่เริ่มที่ quote
    const gross = estTotal - matsCost - travel - other;

    return {
      code: F.code.value || genJobCode(),
      status: F.status.value || 'new',
      assign: F.assign.value?.trim() || '',
      service: F.service.value?.trim() || '',
      desc: F.desc.value?.trim() || '',
      customer: {
        name: F.cusName.value?.trim() || '',
        phone: F.cusPhone.value?.trim() || '',
        address: F.cusAddr.value?.trim() || ''
      },
      schedule: F.schedule.value? new Date(F.schedule.value) : null,
      quote, deposit: Number(F.deposit.value||0),
      travelCost: travel, otherCost: other,
      materials: mats,
      materialsCost: matsCost,
      estGrossProfit: gross
    };
  }

  // Create
  $('#jobAdd')?.addEventListener('click', ()=>{
    fillJobForm(null);
    jobModal.show();
  });

  // Save
  F.btnSave?.addEventListener('click', async ()=>{
    const data = readJobForm();
    const now = serverTimestamp();
    try{
      if (F.id.value){
        await updateDoc(doc(db,'jobs', F.id.value), {...data, updatedAt: now});
      }else{
        const ref = await addDoc(collection(db,'jobs'), {...data, createdAt: now, updatedAt: now});
        F.id.value = ref.id;
      }
      jobModal.hide();
    }catch(e){
      console.error(e);
      alert('บันทึกใบงานไม่สำเร็จ');
    }
  });

  // Delete
  F.btnDelete?.addEventListener('click', async ()=>{
    if (!F.id.value) return;
    if (!confirm('ลบใบงานนี้?')) return;
    await deleteDoc(doc(db,'jobs', F.id.value));
    jobModal.hide();
  });

  // Table render
  const jobsState = { all: [] };
  const tbodyJobs = document.getElementById('jobsTableBody');
  const statusFilter = document.getElementById('jobsStatusFilter');
  const searchInput = document.getElementById('jobsSearch');

  function renderJobs(){
    if (!tbodyJobs) return;
    const term = (searchInput?.value||'').toLowerCase();
    const f = statusFilter?.value || '';
    const rows = [];
    jobsState.all
      .filter(j=> !f || j.status===f)
      .filter(j=>{
        if (!term) return true;
        const bag = [j.code, j.service, j.customer?.name, j.customer?.phone].join(' ').toLowerCase();
        return bag.includes(term);
      })
      .slice(0, 500)
      .forEach(j=>{
        const total = j.quote ?? 0;
        rows.push(`
          <tr data-id="${j.id}">
            <td class="small">${j.code||'-'}</td>
            <td class="small">${(j.customer?.name||'-')}<div class="text-muted">${j.customer?.phone||''}</div></td>
            <td class="small">${j.service||'-'}</td>
            <td><span class="badge bg-light text-dark border">${j.status||'-'}</span></td>
            <td class="text-end">${fmt(total)}</td>
            <td class="small">${fmtDT(j.schedule||j.createdAt)}</td>
            <td>
              <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-primary btn-edit">แก้ไข</button>
                <button class="btn btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">สถานะ</button>
                <ul class="dropdown-menu">
                  <li><a class="dropdown-item set-st" data-st="new">ใหม่</a></li>
                  <li><a class="dropdown-item set-st" data-st="quoted">เสนอราคาแล้ว</a></li>
                  <li><a class="dropdown-item set-st" data-st="scheduled">นัดหมายแล้ว</a></li>
                  <li><a class="dropdown-item set-st" data-st="in_progress">กำลังทำ</a></li>
                  <li><a class="dropdown-item set-st" data-st="done">เสร็จแล้ว</a></li>
                  <li><a class="dropdown-item set-st" data-st="cancelled">ยกเลิก</a></li>
                </ul>
              </div>
            </td>
          </tr>
        `);
      });

    tbodyJobs.innerHTML = rows.join('') || '<tr><td colspan="7" class="text-center text-muted small">ยังไม่มีข้อมูล</td></tr>';
    tbodyJobs.querySelectorAll('.btn-edit').forEach(btn=> btn.onclick = async (e)=>{
      const id = e.target.closest('tr')?.dataset?.id;
      const snap = await getDoc(doc(db,'jobs', id));
      if (snap.exists()){
        const j = {...snap.data(), id: snap.id};
        fillJobForm(j);
        jobModal.show();
      }
    });
    tbodyJobs.querySelectorAll('.set-st').forEach(a => a.onclick = async (e)=>{
      const tr = e.target.closest('tr'); const id = tr?.dataset?.id; const st = e.target.dataset.st;
      if (id) await updateDoc(doc(db,'jobs', id), {status: st, updatedAt: serverTimestamp()});
    });
  }

  onSnapshot(query(collection(db,'jobs'), orderBy('createdAt','desc')), snap=>{
    const arr = [];
    snap.forEach(d=> arr.push({...d.data(), id:d.id}));
    jobsState.all = arr;
    renderJobs();
  });
  statusFilter?.addEventListener('change', renderJobs);
  searchInput?.addEventListener('input', renderJobs);

  // ---------- INVENTORY (materials) ----------
  const MF = {
    id: $('#matId'), name: $('#matName'), sku: $('#matSku'), unit: $('#matUnit'),
    reorder: $('#matReorder'), onHand: $('#matOnHand'), avgCost: $('#matAvgCost'),
    btnSave: $('#matSave'), btnReset: $('#matReset'), btnDelete: $('#matDelete')
  };

  function fillMatForm(m){
    MF.id.value = m?.id || '';
    MF.name.value = m?.name || '';
    MF.sku.value = m?.sku || '';
    MF.unit.value = m?.unit || '';
    MF.reorder.value = m?.reorderPoint ?? 0;
    MF.onHand.value = m?.onHand ?? 0;
    MF.avgCost.value = m?.avgCost ?? 0;
    MF.btnDelete.classList.toggle('d-none', !m?.id);
  }
  MF.btnReset?.addEventListener('click', ()=> fillMatForm(null));

  MF.btnSave?.addEventListener('click', async ()=>{
    const data = {
      name: MF.name.value?.trim() || '',
      sku: MF.sku.value?.trim() || '',
      unit: MF.unit.value?.trim() || '',
      reorderPoint: Number(MF.reorder.value||0),
      updatedAt: serverTimestamp()
    };
    try{
      if (MF.id.value){
        await updateDoc(doc(db,'materials', MF.id.value), data);
      }else{
        data.createdAt = serverTimestamp(); data.onHand = 0; data.avgCost = 0;
        const ref = await addDoc(collection(db,'materials'), data);
        MF.id.value = ref.id;
      }
      alert('บันทึกวัสดุเรียบร้อย');
    }catch(e){
      console.error(e); alert('บันทึกวัสดุไม่สำเร็จ');
    }
  });

  MF.btnDelete?.addEventListener('click', async ()=>{
    if (!MF.id.value) return; if (!confirm('ลบวัสดุนี้?')) return;
    await deleteDoc(doc(db,'materials', MF.id.value));
    fillMatForm(null);
  });

  const matBody = document.getElementById('matTableBody');
  const moveBody = document.getElementById('movesTableBody');

  function renderMaterials(arr){
    if (!matBody) return;
    const rows = arr.map(m=>`
      <tr data-id="${m.id}">
        <td>${m.name||'-'}<div class="small text-muted">${m.sku||''}</div></td>
        <td>${fmt(m.onHand||0)}</td>
        <td>${m.unit||'-'}</td>
        <td>${fmt(m.avgCost||0)}</td>
        <td>${fmt(m.reorderPoint||0)}</td>
        <td>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary act-edit">แก้ไข</button>
            <button class="btn btn-outline-success act-in">รับเข้า</button>
            <button class="btn btn-outline-secondary act-adjust">ปรับ</button>
          </div>
        </td>
      </tr>
    `);
    matBody.innerHTML = rows.join('') || '<tr><td colspan="6" class="text-center text-muted small">ยังไม่มีรายการ</td></tr>';

    matBody.querySelectorAll('.act-edit').forEach(btn=> btn.onclick = (e)=>{
      const id = e.target.closest('tr')?.dataset?.id;
      const m = arr.find(x=> x.id===id);
      fillMatForm(m);
    });

    matBody.querySelectorAll('.act-in').forEach(btn=> btn.onclick = async (e)=>{
      const id = e.target.closest('tr')?.dataset?.id; if (!id) return;
      const qty = Number(prompt('จำนวนรับเข้า (+):', '1')||0);
      if (!qty || qty<=0) return;
      const unitCost = Number(prompt('ราคาต่อหน่วย:', '0')||0);
      await stockMove(id, +qty, unitCost, 'in', 'receive');
    });

    matBody.querySelectorAll('.act-adjust').forEach(btn=> btn.onclick = async (e)=>{
      const id = e.target.closest('tr')?.dataset?.id; if (!id) return;
      const qty = Number(prompt('จำนวนปรับ (ใส่ค่าบวกเพิ่ม / ค่าลดให้ใส่เครื่องหมาย -):', '0')||0);
      if (!qty) return;
      let unitCost = 0;
      let type = 'adjust';
      if (qty>0){
        unitCost = Number(prompt('ราคาต่อหน่วยสำหรับจำนวนที่เพิ่ม (+):', '0')||0);
      }
      await stockMove(id, qty, unitCost, type, 'manual');
    });
  }

  async function stockMove(materialId, qty, unitCost, type, reason){
    const mRef = doc(db,'materials', materialId);
    await runTransaction(db, async (tx)=>{
      const snap = await tx.get(mRef);
      if (!snap.exists()) throw new Error('material not found');
      const m = snap.data() || {};
      const onHand = Number(m.onHand||0);
      const avg = Number(m.avgCost||0);
      let newOnHand = onHand + qty;
      if (newOnHand < 0) throw new Error('สต๊อกไม่พอ');
      let newAvg = avg;
      if (qty>0){
        const total = (onHand*avg) + (qty*Number(unitCost||0));
        newAvg = newOnHand>0 ? total / newOnHand : 0;
      }
      tx.update(mRef, { onHand: newOnHand, avgCost: newAvg, updatedAt: serverTimestamp() });

      const movesRef = collection(db, 'stockMoves');
      tx.set(doc(movesRef), {
        materialId, materialName: m.name || '',
        type, qty, unitCost: Number(unitCost||0), amount: Number(qty||0)*Number(unitCost||0),
        reason, createdAt: serverTimestamp(), by: user?.uid || null
      });
    }).catch(err=>{
      console.error(err); alert(err.message || 'ไม่สามารถบันทึกสต๊อกได้');
    });
  }

  onSnapshot(query(collection(db,'materials'), orderBy('name','asc')), snap=>{
    const arr=[]; snap.forEach(d=> arr.push({...d.data(), id:d.id}));
    renderMaterials(arr);
  });

  onSnapshot(query(collection(db,'stockMoves'), orderBy('createdAt','desc'), limit(50)), snap=>{
    if (!moveBody) return;
    const rows=[];
    snap.forEach(d=>{
      const m = d.data()||{};
      rows.push(`<tr>
        <td class="small">${fmtDT(m.createdAt)}</td>
        <td class="small">${m.materialName||m.materialId||'-'}</td>
        <td class="small">${m.type||'-'}</td>
        <td class="text-end">${fmt(m.qty||0)}</td>
        <td class="text-end">${fmt(m.unitCost||0)}</td>
        <td class="small">${m.reason||''}</td>
      </tr>`);
    });
    moveBody.innerHTML = rows.join('') || '<tr><td colspan="6" class="text-center text-muted small">ยังไม่มีข้อมูล</td></tr>';
  });

});
