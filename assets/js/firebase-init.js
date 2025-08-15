// firebase-init.js — Firebase v9 modular
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-analytics.js';
import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence, signInAnonymously, signOut } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { getFirestore, serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyCTaUmv6VZNczMFvznNm01M__g7k2v6a3E",
  authDomain: "alltasks24-f75ec.firebaseapp.com",
  projectId: "alltasks24-f75ec",
  storageBucket: "alltasks24-f75ec.firebasestorage.app",
  messagingSenderId: "366678839094",
  appId: "1:366678839094:web:8a67bf6690e2f1f80a2d97",
  measurementId: "G-RBZ1Y0P6E0"
};

export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const ts = serverTimestamp;

export async function ensureAnonAuth(){
  await setPersistence(auth, browserLocalPersistence);
  if(!auth.currentUser){
    try{ await signInAnonymously(auth); }catch(e){ console.error(e); }
  }
  return new Promise(res=>onAuthStateChanged(auth, u=>res(u)));
}
export async function logout(){ try{ await signOut(auth); }catch(e){ console.error(e); } }
