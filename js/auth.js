// js/auth.js
import { auth, db } from './firebaseConfig.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  onAuthStateChanged,
  GoogleAuthProvider,
  FacebookAuthProvider,
  GithubAuthProvider,
  updateProfile
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";

// Proveedores
const googleProvider   = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();
const githubProvider   = new GithubAuthProvider();

// Elementos del DOM
const registerBtn = document.getElementById('register-btn');
const loginBtn    = document.getElementById('login-btn');
const resetLink   = document.querySelector('.sign-in a');

// — REGISTRO —
registerBtn.addEventListener('click', async e => {
  e.preventDefault();
  const nombre   = document.getElementById('nombre').value.trim();
  const email    = document.getElementById('emailr').value.trim();
  const password = document.getElementById('passr').value;
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    // 1) Actualizar displayName en Auth
    await updateProfile(user, { displayName: nombre });
    // 2) Guardar en Firestore (colección 'users', id = uid)
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      displayName: nombre,
      email: user.email,
      role: 'user',
      createdAt: new Date().toISOString()
    });
    alert(`Registro exitoso. ¡Bienvenido, ${nombre}!`);
  } catch (err) {
    console.error(err);
    alert(`Error al registrar: ${err.message}`);
  }
});

// — LOGIN CON EMAIL/CONTRASEÑA —
loginBtn.addEventListener('click', async e => {
  e.preventDefault();
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('pass').value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged se encargará de redirigir
  } catch (err) {
    console.error(err);
    alert(`Error al iniciar sesión: ${err.message}`);
  }
});

// — LOGIN CON PROVEEDORES —
function setupSocialLogin(buttonSelector, provider, mensaje) {
  document.querySelectorAll(buttonSelector).forEach(btn => {
    btn.addEventListener('click', async e => {
      e.preventDefault();
      try {
        const { user } = await signInWithPopup(auth, provider);
        // Guardar o merge de datos en Firestore
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          role: 'user',
          lastLogin: new Date().toISOString()
        }, { merge: true });
        alert(`${mensaje}: ${user.email}`);
      } catch (err) {
        console.error(err);
        alert(`Error con ${mensaje}: ${err.message}`);
      }
    });
  });
}

setupSocialLogin('.btnGoogle', googleProvider,   'Inicio con Google');
setupSocialLogin('.btnFacebook', facebookProvider, 'Inicio con Facebook');
setupSocialLogin('.btnGitHub', githubProvider,    'Inicio con GitHub');

// — RECUPERAR CONTRASEÑA —
resetLink.addEventListener('click', async e => {
  e.preventDefault();
  const email = prompt('Ingresa tu correo para recuperar contraseña:').trim();
  if (!email) return;
  try {
    await sendPasswordResetEmail(auth, email);
    alert(`Email de recuperación enviado a ${email}`);
  } catch (err) {
    console.error(err);
    alert(`Error al enviar email: ${err.message}`);
  }
});

// — ESTADO DE AUTENTICACIÓN —
onAuthStateChanged(auth, user => {
  if (user) {
    // Si estamos en login.html, redirige al home
    if (window.location.pathname.includes('login.html')) {
      window.location.href = 'index.html';
    }
  } else {
    // Si estamos en index.html o páginas protegidas, redirige a login
    if (!window.location.pathname.includes('login.html')) {
      window.location.href = 'login.html';
    }
  }
});
