import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCdyzX_mGlCSj-H2HXKoTB-Rw1hnh2XJa8",
  authDomain: "evoting-c9c9f.firebaseapp.com",
  projectId: "evoting-c9c9f",
  storageBucket: "evoting-c9c9f.firebasestorage.app",
  messagingSenderId: "221004810319",
  appId: "1:221004810319:web:0801a12fa13cd43edb023a"
};
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;