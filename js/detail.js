import { db, auth } from './firebaseConfig.js';
import {
  doc,
  getDoc,
  collection,
  addDoc
} from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js';
import {
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js';

let currentRoomId = null;

// 1) Carga y renderiza los datos de la habitación
async function loadDetail() {
  const params = new URLSearchParams(window.location.search);
  const roomId = params.get('room');
  currentRoomId = roomId;
  const el = document.getElementById('room-detail');
  el.innerHTML = '';

  if (!roomId) {
    el.innerHTML = '<p class="text-danger">ID de habitación no proporcionado.</p>';
    return;
  }

  try {
    const snap = await getDoc(doc(db, 'rooms', roomId));
    if (!snap.exists()) throw new Error('Habitación no encontrada');

    const { name, type, price, features = [], images = [] } = snap.data();

    el.innerHTML = `
      <h1>${name} <small class="text-muted">${type}</small></h1>

      <!-- Carrusel mejorado -->
      <div id="carouselRoom" class="carousel slide mb-4" data-bs-ride="carousel">
        <!-- Indicadores -->
        <div class="carousel-indicators">
          ${images.map((_, i) => `
            <button type="button"
                    data-bs-target="#carouselRoom"
                    data-bs-slide-to="${i}"
                    class="${i === 0 ? 'active' : ''}"
                    aria-current="${i === 0 ? 'true' : 'false'}"
                    aria-label="Slide ${i+1}"></button>
          `).join('')}
        </div>
        <!-- Slides -->
        <div class="carousel-inner rounded shadow-sm">
          ${images.map((img, i) => `
            <div class="carousel-item ${i === 0 ? 'active' : ''}">
              <img src="assets/img/${img}" class="d-block w-100" alt="${name}">
            </div>
          `).join('')}
        </div>
        <!-- Controles -->
        <button class="carousel-control-prev" type="button" data-bs-target="#carouselRoom" data-bs-slide="prev">
          <span class="carousel-control-prev-icon bg-dark rounded-circle p-2"></span>
          <span class="visually-hidden">Anterior</span>
        </button>
        <button class="carousel-control-next" type="button" data-bs-target="#carouselRoom" data-bs-slide="next">
          <span class="carousel-control-next-icon bg-dark rounded-circle p-2"></span>
          <span class="visually-hidden">Siguiente</span>
        </button>
      </div>
      <!-- Miniaturas -->
      <div class="d-flex justify-content-center mt-3 gap-2">
        ${images.map((img, i) => `
          <img src="assets/img/${img}"
               class="img-thumbnail thumbnail-thumb ${i===0?'border-primary':''}"
               data-bs-target="#carouselRoom"
               data-bs-slide-to="${i}"
               style="width: 80px; height: 60px; object-fit: cover; cursor: pointer;"
               alt="Miniatura ${i+1}">
        `).join('')}
      </div>

      <ul class="list-unstyled mb-4">
        ${features.map(f => `
          <li><i class="fas fa-check text-success me-2"></i>${f}</li>
        `).join('')}
      </ul>

      <p><strong>Precio:</strong> $${price} / noche</p>
      <button class="btn btn-primary mb-4" onclick="reserveRoom('${roomId}')">
        Reservar ahora
      </button>
    `;

    // Destacar miniatura activa al cambiar de slide
    const carouselEl = document.getElementById('carouselRoom');
    carouselEl.addEventListener('slid.bs.carousel', e => {
      const idx = e.to;
      document.querySelectorAll('.thumbnail-thumb').forEach((thumb, i) => {
        thumb.classList.toggle('border-primary', i === idx);
      });
    });

  } catch (err) {
    console.error(err);
    el.innerHTML = `<p class="text-danger">Error: ${err.message}</p>`;
  }
}

// 2) Redirige al flujo de reserva
window.reserveRoom = roomId => {
  window.location.href = `booking.html?room=${roomId}`;
};

// 3) Muestra el formulario de reseñas cuando el usuario esté autenticado
function renderReviewForm(user) {
  const sec = document.getElementById('review-section');
  sec.innerHTML = `
    <h3>Deja tu reseña</h3>
    <form id="review-form" class="row g-3 mb-4">
      <div class="col-md-4">
        <label class="form-label">Calificación</label>
        <select id="rating" class="form-select" required>
          <option value="">Selecciona...</option>
          <option value="1">★☆☆☆☆</option>
          <option value="2">★★☆☆☆</option>
          <option value="3">★★★☆☆</option>
          <option value="4">★★★★☆</option>
          <option value="5">★★★★★</option>
        </select>
      </div>
      <div class="col-md-8">
        <label class="form-label">Comentario</label>
        <textarea id="comment" class="form-control" rows="3" required></textarea>
      </div>
      <div class="col-12">
        <button type="submit" class="btn btn-success">Enviar Reseña</button>
      </div>
    </form>
    <div id="review-msg"></div>
  `;

  document.getElementById('review-form').addEventListener('submit', async e => {
    e.preventDefault();
    const rating = parseInt(document.getElementById('rating').value, 10);
    const texto  = document.getElementById('comment').value.trim();
    try {
      await addDoc(collection(db, 'resenas'), {
        userId:    user.uid,
        roomId:    currentRoomId,
        rating,
        texto,
        createdAt: new Date()
      });
      document.getElementById('review-msg').innerHTML =
        `<div class="alert alert-success">¡Gracias por tu reseña!</div>`;
      e.target.reset();
    } catch (err) {
      console.error(err);
      document.getElementById('review-msg').innerHTML =
        `<div class="alert alert-danger">Error al enviar la reseña.</div>`;
    }
  });
}

// 4) Inicialización: carga detalle y controla renderizado del formulario
window.addEventListener('DOMContentLoaded', () => {
  loadDetail();
  onAuthStateChanged(auth, user => {
    if (user && currentRoomId) {
      renderReviewForm(user);
    } else if (!user) {
      document.getElementById('review-section').innerHTML =
        `<p><a href="login.html">Inicia sesión</a> para dejar una reseña.</p>`;
    }
  });
});
