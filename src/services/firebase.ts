import { initializeApp } from "firebase/app";
import {
  browserSessionPersistence,
  getAuth,
  GoogleAuthProvider,
  setPersistence,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCmdHwniYNiUIPc72xcb0yHekC4SGuLfh4",
  authDomain: "trinity-web-9531a.firebaseapp.com",
  projectId: "trinity-web-9531a",
  storageBucket: "trinity-web-9531a.firebasestorage.app",
  messagingSenderId: "1049870642352",
  appId: "1:1049870642352:web:5c16fea98be8d8870a5f75",
};

console.log("Firebase project:", firebaseConfig.projectId);
console.log("Firebase API key ending:", firebaseConfig.apiKey.slice(-6));

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account",
});

void setPersistence(auth, browserSessionPersistence);