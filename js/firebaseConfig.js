// js/firebaseConfig.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-analytics.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  FacebookAuthProvider,
  GithubAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyC-aNVuzglJo_BXaFf9vPciPe9FkXwhnZQ",
    authDomain: "alxnhx-87f0f.firebaseapp.com",
    projectId: "alxnhx-87f0f",
    storageBucket: "alxnhx-87f0f.firebasestorage.app",
    messagingSenderId: "292560467644",
    appId: "1:292560467644:web:dc0f4847e499b6cf2682b9",
    measurementId: "G-KWTRMWWTWN"
  };

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
// Exports
export const auth = getAuth(app);
export const db   = getFirestore(app);
