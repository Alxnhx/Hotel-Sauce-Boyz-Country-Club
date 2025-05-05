// js/reservations.js
import { db, auth } from './firebaseConfig.js';
import {
  collection, query, where, getDocs,
  doc, getDoc, updateDoc
} from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js';

onAuthStateChanged(auth, user => {
  if (!user) window.location.href = '../login.html';
  else loadMyReservations(user.uid);
});

async function loadMyReservations(uid) {
  const tbody = document.getElementById('reservations-body');
  tbody.innerHTML = '';

  const q = query(collection(db, 'reservations'), where('userId', '==', uid));
  const snaps = await getDocs(q);

  for (const res of snaps.docs) {
    const { roomId, startDate, endDate, status } = res.data();
    const roomSnap = await getDoc(doc(db, 'rooms', roomId));
    const roomName = roomSnap.exists() ? roomSnap.data().name : roomId;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${roomName}</td>
      <td>${new Date(startDate.toDate()).toLocaleDateString()}</td>
      <td>${new Date(endDate.toDate()).toLocaleDateString()}</td>
      <td>${status}</td>
      <td>
        ${status==='active' ? `<button class="btn btn-sm btn-danger" id="cancel-${res.id}">Cancelar</button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);

    if (status==='active') {
      document.getElementById(`cancel-${res.id}`).addEventListener('click', async () => {
        await updateDoc(doc(db, 'reservations', res.id), { status: 'cancelled' });
        loadMyReservations(uid);
      });
    }
  }
}