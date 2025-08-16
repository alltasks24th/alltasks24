// assets/js/firebase-init.js — init + helper
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously, setPersistence, browserLocalPersistence, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCTaUmv6VZNczMFvznNm01M__g7k2v6a3E",
  authDomain: "alltasks24-f75ec.firebaseapp.com",
  projectId: "alltasks24-f75ec",
  storageBucket: "alltasks24-f75ec.firebasestorage.app",
  messagingSenderId: "366678839094",
  appId: "1:366678839094:web:8a67bf6690e2f1f80a2d97",
  measurementId: "G-RBZ1Y0P6E0"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(()=>{});
const db = getFirestore(app);

export function ensureAnonAuth(){
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) return resolve(user);
      try { const cred = await signInAnonymously(auth); resolve(cred.user); }
      catch(e){ console.warn('Anonymous sign-in disabled or failed', e?.message||e); resolve(null); }
    });
  });
}

export async function isAdmin(uid){
  try{
    const acl = await getDoc(doc(db,'settings','acl'));
    const arr = acl.exists()? (acl.data().admins||[]) : [];
    return Array.isArray(arr) && arr.includes(uid);
  }catch(e){ return false; }
}

export async function adminSignIn(email, password){
  const userCred = await signInWithEmailAndPassword(auth, email, password);
  const ok = await isAdmin(userCred.user.uid);
  if(!ok){ await signOut(auth); throw new Error('สิทธิ์ไม่เพียงพอ: ไม่ใช่ผู้ดูแลระบบ'); }
  return userCred.user;
}
export { app, auth, db };
