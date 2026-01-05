import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, getDocs, getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBGtAfhhhzy9w5V8Ht_YGMbn7a9_LrUAxs",
  authDomain: "three-whales-e29cc.firebaseapp.com",
  projectId: "three-whales-e29cc",
  storageBucket: "three-whales-e29cc.firebasestorage.app",
  messagingSenderId: "539637329312",
  appId: "1:539637329312:web:affa6df541921e437788c5",
  measurementId: "G-VZ20NRRJGB"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

async function login(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  }
  catch(error) {
    console.error("Login error:", error);
  }
}

async function logout() {
  try {
    await signOut(auth);
  }
  catch(error) {
    console.error("Logout error", error);
    throw error;
  }
}

async function getAllWhales() {
  const snap = await getDocs(collection(db, "whales"));
  return snap.docs.map(doc => doc.data());
}

export {
  app,
  auth,
  db,
  storage,

  login,
  logout,

  getAllWhales,
}