// assets/js/firebase-init.js — robust anon auth
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// >>> ใส่ config ของโปรเจกต์คุณเอง (เวอร์ชันที่คุณให้ไว้) <<<
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
// คงสถานะไว้ใน localStorage เพื่อให้ incognito (แต่ยังเปิด local storage) ใช้ได้
setPersistence(auth, browserLocalPersistence).catch(()=>{});

const db = getFirestore(app);

// เรียกใช้เพื่อให้ผู้ใช้ทั่วไป sign-in แบบ Anonymous อัตโนมัติ
export function ensureAnonAuth(){
  return new Promise((resolve) => {
    try{
      onAuthStateChanged(auth, async (user) => {
        if (user) return resolve(user);
        try {
          const cred = await signInAnonymously(auth);
          resolve(cred.user);
        } catch (e) {
          console.warn('Anonymous Sign-in is disabled or failed:', e?.message || e);
          // ยัง resolve(null) เพื่อให้ส่วนอ่านสาธารณะทำงานได้
          resolve(null);
        }
      });
    }catch(e){
      console.error('Auth init error:', e);
      resolve(null);
    }
  });
}

export { app, auth, db };
