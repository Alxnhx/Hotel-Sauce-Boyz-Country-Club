// js/booking.js

import { db, auth } from './firebaseConfig.js';
import {
  doc, getDoc,
  collection, query, where, getDocs, addDoc
} from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js';

document.addEventListener('DOMContentLoaded', () => {
  onAuthStateChanged(auth, user => {
    if (!user) {
      window.location.href = 'login.html';
    } else {
      initBooking(user);
    }
  });
});

async function initBooking(user) {
  const container = document.getElementById('booking-container');
  if (!container) return console.error('No existe #booking-container');

  const roomId = new URLSearchParams(window.location.search).get('room');
  if (!roomId) {
    container.innerHTML = '<p class="text-danger">No se especificó habitación.</p>';
    return;
  }

  // 1) Carga datos de la habitación
  const roomSnap = await getDoc(doc(db, 'rooms', roomId));
  if (!roomSnap.exists()) {
    container.innerHTML = '<p class="text-danger">Habitación no encontrada.</p>';
    return;
  }
  const { name, price } = roomSnap.data();

  // 2) Inserta el formulario
  container.innerHTML = `
    <h2>Reserva: ${name}</h2>
    <p><strong>Precio por noche:</strong> $${price}</p>
    <form id="booking-form" class="row g-3">
      <div class="col-md-6">
        <label class="form-label">Nombre completo</label>
        <input type="text" id="fullName" class="form-control" required>
      </div>
      <div class="col-md-6">
        <label class="form-label">Correo electrónico</label>
        <input type="email" id="userEmail" class="form-control" readonly>
      </div>
      <div class="col-md-6">
        <label class="form-label">Teléfono</label>
        <input type="tel" id="phone" class="form-control" required>
      </div>
      <div class="col-md-6">
        <label class="form-label">Cantidad de habitaciones</label>
        <input type="number" id="roomCount" class="form-control" value="1" min="1" required>
      </div>
      <div class="col-md-4">
        <label class="form-label">Fecha de llegada</label>
        <input type="date" id="startDate" class="form-control" required>
      </div>
      <div class="col-md-4">
        <label class="form-label">Fecha de salida</label>
        <input type="date" id="endDate" class="form-control" required>
      </div>
      <div class="col-md-4 d-flex align-items-end">
        <button type="submit" class="btn btn-primary w-100">Confirmar y Enviar</button>
      </div>
    </form>
    <div class="mt-3">
      <p><strong>Total estimado: $<span id="totalCost">0</span></strong></p>
    </div>
    <div id="booking-msg" class="mt-3"></div>
  `;

  // 3) Prefill datos del usuario
  document.getElementById('fullName').value  = user.displayName || '';
  document.getElementById('userEmail').value = user.email || '';

  // 4) Cálculo dinámico del total
  const startInput = document.getElementById('startDate');
  const endInput   = document.getElementById('endDate');
  const countInput = document.getElementById('roomCount');
  const totalEl    = document.getElementById('totalCost');

  function recalcTotal() {
    const s   = startInput.value, e = endInput.value;
    const cnt = parseInt(countInput.value, 10) || 1;
    if (!s || !e) { totalEl.textContent = '0'; return; }
    const nights = Math.max(0, Math.round((new Date(e) - new Date(s)) / (1000*60*60*24)));
    totalEl.textContent = (price * nights * cnt).toFixed(2);
  }
  [startInput, endInput, countInput].forEach(el => el.addEventListener('change', recalcTotal));

  // 5) Manejar submit
  document.getElementById('booking-form').addEventListener('submit', async e => {
    e.preventDefault();

    const fullName  = document.getElementById('fullName').value.trim();
    const email     = document.getElementById('userEmail').value.trim();
    const phone     = document.getElementById('phone').value.trim();
    const roomCount = parseInt(countInput.value, 10);
    const startDate = new Date(startInput.value);
    const endDate   = new Date(endInput.value);
    const nights    = Math.max(0, Math.round((endDate - startDate)/(1000*60*60*24)));
    const total     = price * nights * roomCount;

    if (endDate <= startDate) {
      return showMsg('La fecha de salida debe ser posterior a la llegada.', 'danger');
    }

    // 6) Verificar solapamientos
    const q = query(
      collection(db, 'reservations'),
      where('roomId','==',roomId),
      where('status','==','active'),
      where('startDate','<=',endDate)
    );
    const snap      = await getDocs(q);
    const conflicts = snap.docs.filter(d => d.data().endDate.toDate() >= startDate);
    if (conflicts.length) {
      return showMsg('Ya existe una reserva en esas fechas.', 'warning');
    }

    // 7) Guardar reserva
    let reservationRef;
    try {
      reservationRef = await addDoc(collection(db, 'reservations'), {
        userId:    user.uid,
        fullName, email, phone,
        roomCount, roomId,
        startDate, endDate,
        nights, total,
        status:    'active',
        createdAt: new Date()
      });
    } catch (err) {
      console.error('Error guardando reserva:', err);
      return showMsg('Error al guardar reserva.', 'danger');
    }

    // 8) Enviar correo con EmailJS: asegúrate de usar las mismas claves de tu plantilla
    try {
      await emailjs.send(
        'service_wpy0okh',    // tu Service ID
        'template_mo7jbxe',   // tu Template ID
        {
          to_email:      email,                 // ← aquí la dirección del cliente
          fullName:      fullName,
          reservationId: reservationRef.id,
          room:          name,
          startDate:     startInput.value,
          endDate:       endInput.value,
          nights:        nights,
          total:         total.toFixed(2)
        }
      );
      showMsg('Reserva confirmada y correo enviado ✔️', 'success');
    } catch (err) {
      console.error('EmailJS error status:', err.status);
      if (typeof err.text === 'function') {
        err.text().then(text => console.error('EmailJS error body:', text));
      } else {
        console.error('EmailJS error:', err);
      }
      showMsg('Error al enviar correo. Revisa la consola para más detalles.', 'danger');
    }
  });
}

function showMsg(text, type) {
  document.getElementById('booking-msg').innerHTML =
    `<div class="alert alert-${type}">${text}</div>`;
}
