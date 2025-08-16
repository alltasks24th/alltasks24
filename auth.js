
// auth.js
import { auth, db } from './firebase-init.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

export async function loginWithEmail(email, password){
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const roleDoc = await getDoc(doc(db, 'roles', cred.user.uid));
  const role = roleDoc.exists()? roleDoc.data()?.role : 'viewer';
  localStorage.setItem('role', role);
  return { user: cred.user, role };
}

export async function logout(){
  localStorage.removeItem('role');
  await signOut(auth);
}

export function requireAdmin(onReady){
  onAuthStateChanged(auth, async (u)=>{
    if(!u){ window.location.href = 'login.html'; return; }
    const roleSnap = await getDoc(doc(db,'roles', u.uid));
    const role = roleSnap.exists()? roleSnap.data().role : 'viewer';
    localStorage.setItem('role', role);
    if(role==='owner' || role==='admin'){ onReady(u, role); }
    else{
      alert('บัญชีนี้ไม่มีสิทธิ์เข้าถึงหลังบ้าน');
      window.location.href = 'index.html';
    }
  });
}
