// ===== helpers =====
const $=(s)=>document.querySelector(s), $$=(s)=>Array.from(document.querySelectorAll(s));
const THB = n=>'฿'+(Math.round(+n||0)).toLocaleString('th-TH');
const ceil15 = m=>Math.ceil((+m||0)/15)*15;

function readCfg(){
  return {
    base:+$('#cfg_base').value||0, incKm:+$('#cfg_incKm').value||0,
    perKm1:+$('#cfg_perKm1').value||0, tier2Start:+$('#cfg_tier2Start').value||0, perKm2:+$('#cfg_perKm2').value||0,
    minCharge:+$('#cfg_minCharge').value||0, stop:+$('#cfg_stop').value||0, wait:+$('#cfg_wait').value||0,
    night:+$('#cfg_night').value||0, rain:+$('#cfg_rain').value||0, weekend:+$('#cfg_weekend').value||0,
    roundTo:+$('#cfg_roundTo').value||1, multSize:+$('#cfg_multSize').value||1, multLabor:+$('#cfg_multLabor').value||1,
    maxKm:+$('#cfg_maxKm').value||0, maxW:+$('#cfg_maxW').value||0
  };
}
function writeCfg(c){ Object.entries(c).forEach(([k,v])=>{ const el=$('#cfg_'+k)||$('#cfg_'+({incKm:'incKm',perKm1:'perKm1',perKm2:'perKm2',tier2Start:'tier2Start'}[k]||k)); if(el) el.value=v; }); }

function compute(saveDraft=false){
  const cfg = readCfg();
  let km = +($('#km').value||0); if($('#roundtrip').value==='yes') km*=2;
  const stops=+($('#stops').value||0), waitMin=+($('#wait').value||0);
  const size=$('#size').value, workers=$('#workers').value;
  const other=+($('#otherCost').value||0), disc=+($('#discount').value||0), vatOn=$('#vat').value==='yes';
  const flags={night:$('#night').checked, rain:$('#rain').checked, weekend:$('#weekend').checked};

  if(km<0||isNaN(km)){ $('#alertBox').classList.remove('d-none'); $('#alertBox').textContent='ระยะทางไม่ถูกต้อง'; return null; }
  $('#alertBox').classList.add('d-none');

  let amt = cfg.base;
  const extra = Math.max(0, km - cfg.incKm);
  const tier1 = Math.max(0, Math.min(extra, Math.max(0,cfg.tier2Start-cfg.incKm)));
  const tier2 = Math.max(0, extra - tier1);
  amt += tier1*cfg.perKm1 + tier2*cfg.perKm2;
  amt += stops*cfg.stop;
  amt += (ceil15(waitMin)/60)*cfg.wait;
  if(flags.night)   amt += cfg.night;
  if(flags.rain)    amt += cfg.rain;
  if(flags.weekend) amt += cfg.weekend;
  if(size==='medium') amt*=cfg.multSize;
  if(workers==='2')  amt*=cfg.multLabor;
  amt = Math.round(amt/Math.max(1,cfg.roundTo))*Math.max(1,cfg.roundTo);
  if(amt<cfg.minCharge) amt=cfg.minCharge;

  const sub = Math.max(0, amt + other - disc);
  const vat = vatOn ? Math.round(sub*0.07) : 0;
  const grand = Math.round(sub + vat);

  const lines=[];
  lines.push(['ฐาน/ในเมือง', THB(cfg.base)]);
  if(tier1>0) lines.push([`เกินระยะ ${tier1.toFixed(1)} กม. × ฿${cfg.perKm1}/กม.`, THB(tier1*cfg.perKm1)]);
  if(tier2>0) lines.push([`เกินระยะ (ชั้น2) ${tier2.toFixed(1)} กม. × ฿${cfg.perKm2}/กม.`, THB(tier2*cfg.perKm2)]);
  if(stops>0) lines.push([`จุดแวะ ${stops} จุด`, THB(stops*cfg.stop)]);
  if(waitMin>0) lines.push([`รอคิว ${ceil15(waitMin)} นาที`, THB((ceil15(waitMin)/60)*cfg.wait)]);
  if(flags.night) lines.push(['กลางคืน', THB(cfg.night)]);
  if(flags.rain)  lines.push(['ฝนตก', THB(cfg.rain)]);
  if(flags.weekend) lines.push(['เสาร์–อาทิตย์/นักขัต', THB(cfg.weekend)]);
  if(size==='medium') lines.push(['คูณขนาด (กลาง)', `× ${cfg.multSize}`]);
  if(workers==='2')   lines.push(['คูณแรงงาน (2 คน)', `× ${cfg.multLabor}`]);
  lines.push([`ปัดเศษขั้นละ ${Math.max(1,cfg.roundTo)}`, '']);
  if(other>0) lines.push(['ค่าสินค้าตามจริง', THB(other)]);
  if(disc>0)  lines.push(['ส่วนลด', '-'+THB(disc)]);
  if(vat>0)   lines.push(['VAT 7%', THB(vat)]);

  $('#breakdownBox').innerHTML = lines.map(([l,r])=>`<div><span>${l}</span><span>${r}</span></div>`).join('');
  $('#grandLabel').textContent = THB(grand);
  $('#grandSummary').textContent = THB(grand);

  const out = { job:($('#jobName').value||'งานรับจ้าง'), km, stops, waitMin, size, workers, other, disc, vat, grand, service:amt };
  if(saveDraft) localStorage.setItem('calcDraftPlus', JSON.stringify({
    job:out.job, km:+($('#km').value||0), roundtrip:$('#roundtrip').value==='yes', stops, waitMin, size, workers,
    isNight:flags.night, isRain:flags.rain, isWeekend:flags.weekend, otherCost:other, discount:disc, vat:vatOn
  }));
  return out;
}

// ===== receipt =====
function addRow(name, qty, unit, price){
  if($('#rc_items').querySelector('.text-muted')) $('#rc_items').innerHTML='';
  const tr=document.createElement('tr');
  tr.innerHTML=`<td><input class="form-control form-control-sm item-name" value="${name||''}"></td>
  <td class="text-center" style="max-width:90px"><input type="number" class="form-control form-control-sm item-qty" value="${qty||1}"></td>
  <td class="text-center" style="max-width:110px"><input class="form-control form-control-sm item-unit" value="${unit||'งาน'}"></td>
  <td class="text-end" style="max-width:160px"><input type="number" class="form-control form-control-sm item-price" value="${price||0}"></td>
  <td class="text-end item-total">฿0</td>`;
  $('#rc_items').appendChild(tr);
  tr.addEventListener('input', recomputeReceipt);
  recomputeReceipt();
}
function recomputeReceipt(){
  let sum=0;
  $$('#rc_items tr').forEach(tr=>{
    const q=+tr.querySelector('.item-qty').value||0, p=+tr.querySelector('.item-price').value||0;
    const t=Math.round(q*p); sum+=t; tr.querySelector('.item-total').textContent=THB(t);
  });
  const other=+($('#rc_other').dataset.val||0), disc=+($('#rc_discount').dataset.val||0), vat=+($('#rc_vat').dataset.val||0);
  $('#rc_total').textContent=THB(sum + other - disc + vat);
}
function genInvNo(){
  const d=new Date(), yymmdd=d.toISOString().slice(2,10).replaceAll('-','');
  const key='inv_seq_'+yymmdd; const run=(+localStorage.getItem(key)||0)+1; localStorage.setItem(key, run);
  return `AT${yymmdd}-${String(run).padStart(3,'0')}`;
}
function fillReceipt(out){
  $('#inv_no').value=genInvNo();
  const d=new Date(); $('#inv_date').value=d.toLocaleDateString('th-TH'); $('#inv_time').value=d.toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'});
  $('#inv_job').value=out.job; $('#rc_items').innerHTML='';
  addRow(`${out.job} — ระยะ ${out.km.toFixed(1)} กม.${out.stops?`, แวะ ${out.stops} จุด`:''}${out.waitMin?`, รอ ${ceil15(out.waitMin)} นาที`:''}`,1,'งาน',out.service);
  $('#rc_other').dataset.val=+($('#otherCost').value||0); $('#rc_other').textContent=THB($('#rc_other').dataset.val);
  $('#rc_discount').dataset.val=+($('#discount').value||0); $('#rc_discount').textContent=THB($('#rc_discount').dataset.val);
  $('#rc_vat').dataset.val=out.vat||0; $('#rc_vat').textContent=THB(out.vat||0);
  recomputeReceipt();
}
function saveBill(){
  const inv={
    inv_no:$('#inv_no').value, date:$('#inv_date').value, time:$('#inv_time').value,
    cust_name:$('#cust_name').value, cust_phone:$('#cust_phone').value, cust_addr:$('#cust_addr').value, cust_taxid:$('#cust_taxid').value,
    job:$('#inv_job').value, note:$('#inv_note').value,
    items: $$('#rc_items tr').map(tr=>({name:tr.querySelector('.item-name')?.value||'', qty:+(tr.querySelector('.item-qty')?.value||1), unit:tr.querySelector('.item-unit')?.value||'งาน', price:+(tr.querySelector('.item-price')?.value||0)})),
    other:+($('#rc_other').dataset.val||0), discount:+($('#rc_discount').dataset.val||0), vat:+($('#rc_vat').dataset.val||0),
    pay_method:$('#pay_method').value, pay_status:$('#pay_status').value, pay_ref:$('#pay_ref').value, pay_due:$('#pay_due').value
  };
  let list=JSON.parse(localStorage.getItem('invoices')||'[]');
  const i=list.findIndex(x=>x.inv_no===inv.inv_no); if(i>=0) list[i]=inv; else list.unshift(inv);
  localStorage.setItem('invoices', JSON.stringify(list));
  renderInvList(); alert('บันทึกบิลแล้ว');
}
function openInvoice(id){
  const list=JSON.parse(localStorage.getItem('invoices')||'[]'); const inv=list.find(x=>x.inv_no===id); if(!inv) return;
  $('#inv_no').value=inv.inv_no; $('#inv_date').value=inv.date; $('#inv_time').value=inv.time;
  $('#cust_name').value=inv.cust_name||''; $('#cust_phone').value=inv.cust_phone||''; $('#cust_addr').value=inv.cust_addr||''; $('#cust_taxid').value=inv.cust_taxid||'';
  $('#inv_job').value=inv.job||''; $('#inv_note').value=inv.note||''; $('#rc_items').innerHTML='';
  (inv.items||[]).forEach(it=>addRow(it.name,it.qty,it.unit,it.price));
  $('#rc_other').dataset.val=inv.other||0; $('#rc_other').textContent=THB(inv.other||0);
  $('#rc_discount').dataset.val=inv.discount||0; $('#rc_discount').textContent=THB(inv.discount||0);
  $('#rc_vat').dataset.val=inv.vat||0; $('#rc_vat').textContent=THB(inv.vat||0); recomputeReceipt();
}
function deleteInvoice(id){
  if(!confirm('ลบบิลนี้แน่ใจหรือไม่?')) return;
  let list=JSON.parse(localStorage.getItem('invoices')||'[]'); list=list.filter(x=>x.inv_no!==id);
  localStorage.setItem('invoices', JSON.stringify(list)); renderInvList();
}

// ===== invoice list + pager =====
let invPage=1; const perPage=10;
function renderInvList(){
  const q=($('#invSearch').value||'').toLowerCase().trim(); const f=$('#invFilter').value;
  const all=(JSON.parse(localStorage.getItem('invoices')||'[]')).filter(x=>{
    const text=(x.inv_no+' '+(x.cust_name||'')+' '+(x.job||'')).toLowerCase();
    const okQ=!q||text.includes(q);
    const okF=f==='all'?true:(f==='paid'?x.pay_status==='ชำระแล้ว':x.pay_status!=='ชำระแล้ว');
    return okQ&&okF;
  });
  const pages=Math.max(1,Math.ceil(all.length/perPage)); invPage=Math.min(invPage,pages);
  const list=all.slice((invPage-1)*perPage, (invPage-1)*perPage+perPage);
  $('#invList').innerHTML=list.map(x=>`
    <div class="border rounded p-2 d-flex justify-content-between align-items-center">
      <div><div class="fw-semibold">${x.inv_no} — ${x.cust_name||'-'}</div><div class="small text-secondary">${x.date} ${x.time} • ${x.job||'-'}</div></div>
      <div class="d-flex gap-1">
        <button class="btn btn-sm btn-outline-primary btn-open" data-id="${x.inv_no}">เปิด</button>
        <button class="btn btn-sm btn-outline-danger btn-del" data-id="${x.inv_no}">ลบ</button>
      </div>
    </div>`).join('') || '<div class="text-center text-secondary">— ยังไม่มีบิล —</div>';

  const pager=[];
  pager.push(`<li class="page-item ${invPage===1?'disabled':''}"><a class="page-link" href="#" data-p="${invPage-1}">ก่อนหน้า</a></li>`);
  for(let p=1;p<=pages;p++){ if(p===1||p===pages||Math.abs(p-invPage)<=1){ pager.push(`<li class="page-item ${p===invPage?'active':''}"><a class="page-link" href="#" data-p="${p}">${p}</a></li>`); }
    else if(Math.abs(p-invPage)===2){ pager.push('<li class="page-item disabled"><span class="page-link">…</span></li>'); } }
  pager.push(`<li class="page-item ${invPage===pages?'disabled':''}"><a class="page-link" href="#" data-p="${invPage+1}">ถัดไป</a></li>`);
  $('#invPager').innerHTML=pager.join('');
}

// ===== biz preview/persist =====
function applyBiz(){
  $('#bizNameView').textContent=$('#biz_name').value||'';
  $('#bizContactView').textContent='โทร '+($('#biz_phone').value||'')+' • LINE '+($('#biz_line').value||'');
  $('#bizAddrView').textContent=$('#biz_addr').value||'';
}
function saveBiz(){
  const b={name:$('#biz_name').value, phone:$('#biz_phone').value, line:$('#biz_line').value, addr:$('#biz_addr').value, pay:$('#biz_pay').value, note:$('#biz_note').value, logo:$('#biz_logo').value, qr:$('#biz_qr').value};
  localStorage.setItem('bizInfoPlus', JSON.stringify(b)); applyBiz(); alert('บันทึกข้อมูลร้านแล้ว');
}
function loadBiz(){
  const b=JSON.parse(localStorage.getItem('bizInfoPlus')||'{}'); if(Object.keys(b).length){ $('#biz_name').value=b.name||''; $('#biz_phone').value=b.phone||''; $('#biz_line').value=b.line||''; $('#biz_addr').value=b.addr||''; $('#biz_pay').value=b.pay||'เงินสด'; $('#biz_note').value=b.note||''; $('#biz_logo').value=b.logo||''; $('#biz_qr').value=b.qr||''; }
  applyBiz();
}

// ===== init & events =====
document.addEventListener('DOMContentLoaded', ()=>{
  // load saved cfg
  const saved=JSON.parse(localStorage.getItem('pricingCfgPlus')||'null'); if(saved) writeCfg(saved);
  loadBiz(); renderInvList(); compute(true);

  // calc listeners
  ['jobName','km','roundtrip','stops','wait','size','workers','night','rain','weekend','otherCost','discount','vat']
    .forEach(id=>{ const el=document.getElementById(id); el && el.addEventListener((el.type==='checkbox'||el.tagName==='SELECT')?'change':'input', ()=>compute(true)); });
  $('#btnClear').addEventListener('click',()=>{ ['jobName','km','stops','wait','otherCost','discount'].forEach(id=>$('#'+id).value=''); $('#size').value='small'; $('#workers').value='1'; ['night','rain','weekend'].forEach(id=>$('#'+id).checked=false); $('#vat').value='no'; $('#roundtrip').value='no'; compute(true); });

  // cfg
  $('#btnSaveCfg').addEventListener('click',()=>{ localStorage.setItem('pricingCfgPlus', JSON.stringify(readCfg())); alert('บันทึกสูตรแล้ว'); });
  $('#btnResetCfg').addEventListener('click',()=>{ writeCfg({base:59,incKm:3,perKm1:8,tier2Start:15,perKm2:6,minCharge:49,stop:10,wait:100,night:10,rain:8,weekend:10,roundTo:1,multSize:1.05,multLabor:1.3,maxKm:25,maxW:12}); compute(true); });

  // biz
  $('#btnSaveBiz').addEventListener('click', saveBiz);
  ['biz_name','biz_phone','biz_line','biz_addr','biz_note','biz_logo','biz_qr'].forEach(id=>{ const el=$('#'+id); el && el.addEventListener('input', applyBiz); });

  // actions
  $('#btnCopySummary').addEventListener('click',()=>{ const t=$('#breakdownBox').innerText+'\nรวม: '+$('#grandLabel').innerText; navigator.clipboard.writeText(t).then(()=>alert('คัดลอกแล้ว')).catch(()=>alert('คัดลอกไม่สำเร็จ')); });
  $('#openMaps').addEventListener('click',e=>{ e.preventDefault(); window.open('https://www.google.com/maps/@?api=1&map_action=map','_blank'); });
  $('#btnCreateReceipt').addEventListener('click',()=>{ const out=compute(true); if(!out) return; fillReceipt(out); alert('สร้างใบเสร็จแล้ว'); });
  $('#summaryCreate').addEventListener('click',()=>$('#btnCreateReceipt').click());
  $('#summaryPrint').addEventListener('click',()=>window.print());
  $('#btnPrint').addEventListener('click',()=>window.print());
  $('#btnAddRow').addEventListener('click',()=>addRow('รายการเพิ่มเติม',1,'งาน',0));
  $('#btnNewBill').addEventListener('click',()=>{ $('#rc_items').innerHTML='<tr><td class="text-muted" colspan="5">— กด “สร้างใบเสร็จ” เพื่อใส่รายการอัตโนมัติ หรือ “เพิ่มบรรทัด” เพื่อใส่เอง —</td></tr>'; $('#rc_other').dataset.val=0; $('#rc_other').textContent='฿0'; $('#rc_discount').dataset.val=0; $('#rc_discount').textContent='฿0'; $('#rc_vat').dataset.val=0; $('#rc_vat').textContent='฿0'; $('#rc_total').textContent='฿0'; });
  $('#btnSaveBill').addEventListener('click', saveBill);

  // invoice list events
  $('#invSearch').addEventListener('input',()=>{ invPage=1; renderInvList(); });
  $('#invFilter').addEventListener('change',()=>{ invPage=1; renderInvList(); });
  $('#invPager').addEventListener('click',e=>{ const a=e.target.closest('a.page-link'); if(!a) return; e.preventDefault(); invPage=Math.max(1, +a.dataset.p||1); renderInvList(); });
  $('#invList').addEventListener('click',e=>{ const o=e.target.closest('.btn-open'); const d=e.target.closest('.btn-del'); if(o) openInvoice(o.dataset.id); if(d) deleteInvoice(d.dataset.id); });
});
