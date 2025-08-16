// assets/js/auth.js — login page
import { adminSignIn } from './firebase-init.js';
const email = document.getElementById('email');
const password = document.getElementById('password');
const loginMsg = document.getElementById('loginMsg');
document.getElementById('btnLogin').addEventListener('click', async ()=>{
  loginMsg.textContent = '';
  try{
    await adminSignIn(email.value.trim(), password.value.trim());
    window.location.href = 'admin.html';
  }catch(e){
    loginMsg.textContent = e?.message || 'เข้าสู่ระบบไม่สำเร็จ';
  }
});
