// js/reviews.js

import { db } from './firebaseConfig.js';
import {
  collection,
  getDocs,
  query,
  orderBy
} from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js';

async function loadAllReviews() {
  const container = document.getElementById('reviews-list');
  if (!container) return;

  container.innerHTML = `<div class="col-12 text-center py-5">
    <div class="spinner-border text-success" role="status"></div>
    <p class="mt-2">Cargando reseñas…</p>
  </div>`;

  try {
    const q = query(
      collection(db, 'resenas'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      container.innerHTML = `<div class="col-12 text-center">
        <p>No hay reseñas disponibles aún.</p>
      </div>`;
      return;
    }

    // Renderizamos cada reseña como una tarjeta
    container.innerHTML = '';
    snap.forEach(docSnap => {
      const r = docSnap.data();
      const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
      const div = document.createElement('div');
      div.className = 'col-md-4 mb-4';
      div.innerHTML = `
        <div class="card review-card h-100 p-4">
          <div class="d-flex align-items-center mb-3">
            <img
              src="assets/img/user-placeholder.png"
              class="rounded-circle me-3"
              width="50" height="50"
              alt="Usuario">
            <div>
              <h6 class="mb-0">${r.fullName || 'Anónimo'}</h6>
              <div class="star-rating text-warning">${stars}</div>
            </div>
          </div>
          <p class="card-text">${r.texto}</p>
          <small class="text-muted">
            ${r.createdAt.toDate().toLocaleDateString()}
          </small>
        </div>`;
      container.appendChild(div);
    });

  } catch (err) {
    console.error('Error cargando todas las reseñas:', err);
    container.innerHTML = `<div class="col-12">
      <div class="alert alert-danger text-center">
        No se pudieron cargar las reseñas.
      </div>
    </div>`;
  }
}

document.addEventListener('DOMContentLoaded', loadAllReviews);
