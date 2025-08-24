
// firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { indexedDBLocalPersistence } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

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
export const auth = getAuth(app);
export const db = getFirestore(app);

setPersistence(auth, indexedDBLocalPersistence).catch(()=> setPersistence(auth, browserLocalPersistence));

export async function ensureAnonAuth(){
  if(!auth.currentUser){
    await signInAnonymously(auth);
  }
  return new Promise(res=> onAuthStateChanged(auth, u=> u && res(u)));
}

// persistence fallback patch applied
