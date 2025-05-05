// js/rooms.js
import { db } from './firebaseConfig.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', loadRooms);

async function loadRooms() {
  const container = document.getElementById('rooms-list');
  container.innerHTML = ''; // Limpia contenido anterior

  try {
    const snapshot = await getDocs(collection(db, 'rooms'));
    snapshot.forEach(doc => {
      const data = doc.data();
      const {
        name,
        type,
        price,
        features = [],
        images = []
      } = data;

      // Usar la primera imagen o el placeholder si no hay
      const preview = images[0] || 'placeholder.jpg';

      const col = document.createElement('div');
      col.className = 'col-md-4 mb-4';
      col.innerHTML = `
        <div class="card h-100">
          <img src="assets/img/${preview}" class="card-img-top" alt="${name}">
          <div class="card-body d-flex flex-column">
            <span class="badge bg-success mb-2">${type}</span>
            <h5 class="card-title">${name}</h5>
            <p class="card-text flex-grow-1">Ideal para tu estancia.</p>
            <ul class="list-unstyled mb-3">
              ${features.map(f => `<li><i class="fas fa-check me-2"></i>${f}</li>`).join('')}
            </ul>
            <div class="d-flex justify-content-between align-items-center mt-auto">
              <strong>$${price} / noche</strong>
              <a href="room-detail.html?room=${doc.id}" class="btn btn-outline-primary btn-sm">
                Ver detalles
              </a>
            </div>
          </div>
        </div>`;
      container.appendChild(col);
    });
  } catch (err) {
    console.error('Error cargando habitaciones:', err);
    container.innerHTML = '<p class="text-danger">No se pudieron cargar las habitaciones.</p>';
  }
}

// Placeholder hasta el paso 4
window.reserveRoom = function(roomId) {
  console.log('Reservar habitación:', roomId);
};
