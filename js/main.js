// js/main.js

import { db, auth } from './firebaseConfig.js';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit
} from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js';

document.addEventListener('DOMContentLoaded', () => {
  setupHeroButton();
  setupSearchForm();
  loadReviews();
});

function setupHeroButton() {
  const btn = document.getElementById('btn-hero-reserve');
  if (!btn) return;
  btn.addEventListener('click', () => {
    onAuthStateChanged(auth, user => {
      if (user) {
        window.location.href = 'rooms.html';
      } else {
        const modalEl = document.getElementById('loginModal');
        if (modalEl) new bootstrap.Modal(modalEl).show();
      }
    });
  });
}

function setupSearchForm() {
  const form = document.getElementById('search-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const [arrivalInput, departureInput] = form.querySelectorAll('input[type=date]');
    const [adultsSelect, kidsSelect]     = form.querySelectorAll('select');
    const params = new URLSearchParams({
      arrival:   arrivalInput.value,
      departure: departureInput.value,
      adults:    adultsSelect.value,
      kids:      kidsSelect.value
    });
    window.location.href = `rooms.html?${params}`;
  });
}

async function loadReviews() {
  const container = document.getElementById('reviews-list');
  if (!container) return;
  container.innerHTML = '';

  try {
    // Traemos las 3 reseñas más recientes
    const q = query(
      collection(db, 'resenas'),
      orderBy('createdAt', 'desc'),
      limit(3)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      container.innerHTML = `
        <div class="col-12 text-center">
          <p>No hay reseñas disponibles aún.</p>
        </div>`;
      return;
    }

    snap.forEach(docSnap => {
      const r = docSnap.data();
      const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
      const div = document.createElement('div');
      div.className = 'col-md-4 mb-4';
      div.innerHTML = `
        <div class="card review-card h-100 p-4">
          <div class="d-flex align-items-center mb-3">
            <img src="assets/img/user-placeholder.jpg"
                 class="rounded-circle me-3"
                 width="50" height="50"
                 alt="Usuario">
            <div>
              <h6 class="mb-0">${r.fullName || 'Anónimo'}</h6>
              <div class="star-rating text-warning">${stars}</div>
            </div>
          </div>
          <p class="card-text">${r.texto}</p>
        </div>`;
      container.appendChild(div);
    });

  } catch (err) {
    console.error('Error cargando reseñas:', err);
    container.innerHTML = `
      <div class="col-12">
        <div class="alert alert-danger">
          No se pudieron cargar las reseñas.
        </div>
      </div>`;
  }
}

