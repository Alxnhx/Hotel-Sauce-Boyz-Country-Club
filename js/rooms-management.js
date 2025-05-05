// js/rooms-management.js

import { getFirestore, collection, getDocs, addDoc,
    doc, getDoc, updateDoc, deleteDoc }
from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js';
import { auth } from './firebaseConfig.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js';

const db = getFirestore();
const ALLOWED_ADMINS = [
'alanva091104@gmail.com',
'otro.admin@example.com'
];

const form       = document.getElementById('room-form');
const titleEl    = document.getElementById('form-title');
const cancelBtn  = document.getElementById('cancel-edit');
const tableBody  = document.querySelector('#rooms-table tbody');

const inpId       = document.getElementById('roomId');
const inpName     = document.getElementById('roomName');
const inpType     = document.getElementById('roomType');
const inpPrice    = document.getElementById('roomPrice');
const inpFeatures = document.getElementById('roomFeatures');
const inpImages   = document.getElementById('roomImages');

// Control de acceso
onAuthStateChanged(auth, user => {
if(!user || !ALLOWED_ADMINS.includes(user.email)) {
return window.location.href = '../login.html';
}
document.getElementById('auth-status').innerHTML = `
<span class="navbar-text text-light me-3">${user.email}</span>
<button class="btn btn-sm btn-outline-light" onclick="auth.signOut()">
 Cerrar Sesión
</button>`;
initRooms();
});

async function initRooms() {
form.addEventListener('submit', onSaveRoom);
cancelBtn.addEventListener('click', resetForm);
await loadRooms();
}

// Carga y pinta la tabla
async function loadRooms() {
tableBody.innerHTML = '';
const snap = await getDocs(collection(db,'rooms'));
snap.forEach(docSnap => {
const r = docSnap.data();
const tr = document.createElement('tr');
tr.innerHTML = `
 <td>${r.name}</td>
 <td>${r.type}</td>
 <td>$${r.price}</td>
 <td>${r.features.join(', ')}</td>
 <td>
   ${r.images.map(url=>`<img src="${url.trim()}" width="50" class="me-1 mb-1">`).join('')}
 </td>
 <td>
   <button class="btn btn-sm btn-outline-primary me-1 edit-btn" data-id="${docSnap.id}">
     ✏️
   </button>
   <button class="btn btn-sm btn-outline-danger del-btn" data-id="${docSnap.id}">
     🗑️
   </button>
 </td>`;
tableBody.appendChild(tr);
});

// Eventos de Editar/Borrar
document.querySelectorAll('.edit-btn').forEach(btn=>{
btn.onclick = () => editRoom(btn.dataset.id);
});
document.querySelectorAll('.del-btn').forEach(btn=>{
btn.onclick = () => deleteRoom(btn.dataset.id);
});
}

// Crear o actualizar
async function onSaveRoom(evt) {
evt.preventDefault();
const data = {
name:       inpName.value.trim(),
type:       inpType.value,
price:      parseFloat(inpPrice.value),
features:   inpFeatures.value.split(',').map(s=>s.trim()).filter(Boolean),
images:     inpImages.value.split(',').map(s=>s.trim()).filter(Boolean)
};

if(inpId.value) {
// Update
await updateDoc(doc(db,'rooms',inpId.value), data);
alert('Habitación actualizada');
} else {
// Create
await addDoc(collection(db,'rooms'), data);
alert('Habitación creada');
}

resetForm();
await loadRooms();
}

// Rellena el formulario para editar
async function editRoom(id) {
const snap = await getDoc(doc(db,'rooms',id));
if(!snap.exists()) return;
const r = snap.data();
inpId.value       = id;
inpName.value     = r.name;
inpType.value     = r.type;
inpPrice.value    = r.price;
inpFeatures.value = r.features.join(', ');
inpImages.value   = r.images.join(', ');
titleEl.textContent    = 'Editar Habitación';
cancelBtn.style.display = 'inline-block';
}

// Borra la habitación
async function deleteRoom(id) {
if(!confirm('¿Eliminar esta habitación?')) return;
await deleteDoc(doc(db,'rooms',id));
alert('Habitación eliminada');
await loadRooms();
}

// Vuelve al estado “nueva”
function resetForm() {
form.reset();
inpId.value = '';
titleEl.textContent    = 'Nueva Habitación';
cancelBtn.style.display = 'none';
}
