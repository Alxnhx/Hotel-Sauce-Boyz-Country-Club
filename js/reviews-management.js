// js/reviews-management.js

import { auth } from './firebaseConfig.js';
import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
  doc
} from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js';

const db = getFirestore();
const ALLOWED_ADMINS = [
  'alanva091104@gmail.com',
  'otro.admin@example.com'
];

let allReviews = [];
let filteredReviews = [];

const spinner              = document.getElementById('reviewsSpinner');
const tableContainer       = document.getElementById('reviewsTableContainer');
const tbody                = document.querySelector('#reviewsTable tbody');
const searchInput          = document.getElementById('searchReviewInput');
const selectAllCb          = document.getElementById('selectAllReviews');
const deleteSelectedBtn    = document.getElementById('deleteSelectedReviews');

onAuthStateChanged(auth, async user => {
  if (!user || !ALLOWED_ADMINS.includes(user.email)) {
    return window.location.href = '../login.html';
  }
  document.getElementById('auth-status').innerHTML = `
    <span class="navbar-text text-light me-3">${user.email}</span>
    <button class="btn btn-sm btn-outline-light" onclick="auth.signOut()">
      Cerrar Sesión
    </button>`;
  await loadReviews();
});

async function loadReviews() {
  spinner.style.display = 'block';
  tableContainer.style.display = 'none';

  const snap = await getDocs(collection(db, 'resenas'));
  allReviews = snap.docs.map(ds => {
    const r = ds.data();
    // Si no tienes createdAt, usa fecha actual o epoch
    let createdDate;
    if (r.createdAt instanceof Date) {
      createdDate = r.createdAt;
    } else if (r.createdAt && typeof r.createdAt.toDate === 'function') {
      createdDate = r.createdAt.toDate();
    } else {
      createdDate = new Date(); 
    }
    return {
      id: ds.id,
      ...r,
      created: createdDate
    };
  });

  filteredReviews = [...allReviews];
  renderTable();
  spinner.style.display      = 'none';
  tableContainer.style.display = 'block';
}

function renderTable() {
  tbody.innerHTML = '';
  filteredReviews.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="checkbox" class="reviewCheckbox" data-id="${r.id}" /></td>
      <td>${r.id}</td>
      <td>${r.userId}</td>
      <td>${r.rating} ⭐</td>
      <td>${r.texto}</td>
      <td>${r.created.toLocaleDateString()}</td>
      <td>
        <button class="btn btn-sm btn-outline-danger deleteBtn" data-id="${r.id}">
          🗑️
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // listeners
  document.querySelectorAll('.deleteBtn').forEach(btn => {
    btn.onclick = () => deleteReview(btn.dataset.id);
  });
  document.querySelectorAll('.reviewCheckbox').forEach(cb => {
    cb.onchange = updateDeleteSelectedBtn;
  });
}

async function deleteReview(id) {
  if (!confirm('¿Eliminar esta reseña?')) return;
  await deleteDoc(doc(db, 'resenas', id));
  allReviews = allReviews.filter(r => r.id !== id);
  applyFilterAndRefresh();
}

deleteSelectedBtn.onclick = async () => {
  const toDelete = [...document.querySelectorAll('.reviewCheckbox')]
    .filter(cb => cb.checked)
    .map(cb => cb.dataset.id);
  if (!toDelete.length) return;
  if (!confirm(`Eliminar ${toDelete.length} reseñas?`)) return;
  for (let id of toDelete) {
    await deleteDoc(doc(db, 'resenas', id));
  }
  allReviews = allReviews.filter(r => !toDelete.includes(r.id));
  applyFilterAndRefresh();
};

function updateDeleteSelectedBtn() {
  const any = [...document.querySelectorAll('.reviewCheckbox')]
    .some(cb => cb.checked);
  deleteSelectedBtn.disabled = !any;
}

searchInput.oninput = () => applyFilterAndRefresh();

function applyFilterAndRefresh() {
  const q = searchInput.value.toLowerCase().trim();
  filteredReviews = allReviews.filter(r =>
    (r.userId || '').toLowerCase().includes(q) ||
    (r.texto  || '').toLowerCase().includes(q)
  );
  renderTable();
  selectAllCb.checked = false;
  updateDeleteSelectedBtn();
}

selectAllCb.onchange = e => {
  document.querySelectorAll('.reviewCheckbox')
    .forEach(cb => cb.checked = e.target.checked);
  updateDeleteSelectedBtn();
};
