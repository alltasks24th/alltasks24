// auth.js — เข้าสู่ระบบหลังบ้าน
import { auth } from './firebase-init.js';
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';

const form = document.getElementById('loginForm');
const msg = document.getElementById('loginMsg');

form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  try{
    await setPersistence(auth, browserLocalPersistence);
    await signInWithEmailAndPassword(auth, data.email, data.password);
    location.href = 'admin.html';
  }catch(err){
    msg.textContent = 'เข้าสู่ระบบไม่สำเร็จ: ' + (err.code||err.message);
  }
});
