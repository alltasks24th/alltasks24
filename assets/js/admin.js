// assets/js/admin.js — realtime admin panel + chat unread badge
import { auth, db } from './firebase-init.js';
import {
  collection, doc, getDoc, getDocs, addDoc, onSnapshot, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, increment
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

// ===== Realtime tables =====
function bindRealtimeCounts(){
  // รีวิวรออนุมัติ
  onSnapshot(query(collection(db,'reviews'), where('approved','==', false)), snap=>{
    const el = document.getElementById('badgeReviewsPending');
    if(el){ el.textContent = snap.size || ''; el.style.display = snap.size ? 'inline-block' : 'none'; }
  });
  // แชท: ข้อความค้างอ่านจากลูกค้า
  onSnapshot(collection(db,'chatThreads'), snap=>{
    let total = 0;
    snap.forEach(d=>{ const v=d.data(); total += Number(v.unreadAdmin||0); });
    const b1 = document.getElementById('badgeChatTotal');
    if(b1){ b1.textContent = total || ''; b1.style.display = total ? 'inline-block' : 'none'; }
  });
}

function bindRealtimeReviews(){
  onSnapshot(query(collection(db,'reviews'), orderBy('createdAt','desc')), snap=>{
    const tbody = document.getElementById('tblReviewsBody'); if(!tbody) return;
    tbody.innerHTML='';
    snap.forEach(d=>{
      const r=d.data();
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.name||''}</td>
        <td>${r.rating||''}</td>
        <td>${r.text||''}</td>
        <td>${r.approved?'<span class="badge text-bg-success">อนุมัติแล้ว</span>':'<span class="badge text-bg-secondary">รออนุมัติ</span>'}</td>
        <td class="text-end">
          ${!r.approved? `<button class="btn btn-sm btn-primary btn-approve" data-id="${d.id}">อนุมัติ</button>`:''}
          <button class="btn btn-sm btn-outline-danger btn-delete" data-id="${d.id}">ลบ</button>
        </td>`;
      tbody.appendChild(tr);
    });

    // bind actions
    tbody.querySelectorAll('.btn-approve').forEach(btn=>{
      btn.addEventListener('click', async (e)=>{
        const id = e.currentTarget.getAttribute('data-id');
        await updateDoc(doc(db,'reviews', id), { approved: true });
      });
    });
    tbody.querySelectorAll('.btn-delete').forEach(btn=>{
      btn.addEventListener('click', async (e)=>{
        const id = e.currentTarget.getAttribute('data-id');
        if(confirm('ลบรีวิวนี้?')) await deleteDoc(doc(db,'reviews', id));
      });
    });
  });
}

function bindRealtimeChat(){
  // รายการเธรด
  onSnapshot(query(collection(db,'chatThreads'), orderBy('createdAt','desc')), snap=>{
    const list = document.getElementById('chatThreadList'); if(!list) return;
    list.innerHTML='';
    snap.forEach(d=>{
      const t=d.data();
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-center';
      li.innerHTML = `
        <span>${t.sessionId || t.uid || d.id}</span>
        <span>
          ${t.unreadAdmin? `<span class="badge text-bg-danger me-2">${t.unreadAdmin}</span>`:''}
          <button class="btn btn-sm btn-outline-primary btn-open" data-id="${d.id}">เปิด</button>
        </span>`;
      list.appendChild(li);
    });

    list.querySelectorAll('.btn-open').forEach(btn=>{
      btn.addEventListener('click', (e)=>{
        const id = e.currentTarget.getAttribute('data-id');
        openThread(id);
      });
    });
  });
}

let unsubMsg = null;
async function openThread(threadId){
  // reset unreadAdmin เมื่อเปิดห้อง
  await updateDoc(doc(db,'chatThreads', threadId), { unreadAdmin: 0 });

  const pane = document.getElementById('chatPane'); if(!pane) return;
  pane.dataset.threadId = threadId;
  const body = document.getElementById('chatMessagesAdmin');
  const input = document.getElementById('chatInputAdmin');
  const send  = document.getElementById('chatSendAdmin');
  body.innerHTML='';

  if(unsubMsg) unsubMsg(); // unsubscribe ก่อนหน้า

  unsubMsg = onSnapshot(query(collection(db,'chatThreads', threadId, 'messages'), orderBy('createdAt','asc')), snap=>{
    body.innerHTML='';
    snap.forEach(m=>{
      const d=m.data();
      const div = document.createElement('div');
      div.className = 'chat-msg ' + (d.sender==='user' ? 'user':'agent');
      div.textContent = d.text;
      body.appendChild(div);
    });
    body.scrollTop = body.scrollHeight;
  });

  // bind send
  send.onclick = async ()=>{
    const text = input.value.trim(); if(!text) return;
    await addDoc(collection(db,'chatThreads', threadId, 'messages'), { sender:'agent', text, createdAt: serverTimestamp() });
    await updateDoc(doc(db,'chatThreads', threadId), { lastMessage: text, unreadUser: increment(1) });
    input.value='';
  }
}

export function initAdmin(){
  bindRealtimeCounts();
  bindRealtimeReviews();
  bindRealtimeChat();
}
