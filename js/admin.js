// js/admin.js

import { auth }   from './firebaseConfig.js';
import {
  getFirestore, collection, getDocs,
  doc, updateDoc
} from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js';

const db = getFirestore();
const ALLOWED_ADMINS = [
  'alanva091104@gmail.com',
  'otro.admin@example.com'
];

let allReservations = [];
let filteredReservations = [];
let activityLogs = [];
let currentPage = 1;
const rowsPerPage = 10;
let revenueChartInstance = null;

// Añade un log
function addLog(msg) {
  const time = new Date().toLocaleString();
  activityLogs.unshift({ time, msg });
  renderLogs();
}

// Renderiza logs
function renderLogs() {
  const ul = document.getElementById('logList');
  ul.innerHTML = '';
  activityLogs.slice(0,20).forEach(log => {
    const li = document.createElement('li');
    li.className = 'list-group-item';
    li.textContent = `[${log.time}] ${log.msg}`;
    ul.appendChild(li);
  });
  document.getElementById('activityLog').style.display = 'block';
}

// Control de acceso y setup inicial
onAuthStateChanged(auth, async user => {
  // Navbar: (en otras páginas) mostrar adminLink
  const adminLink = document.getElementById('adminLink');
  if (adminLink) {
    adminLink.style.display = user && ALLOWED_ADMINS.includes(user.email)
      ? 'block' : 'none';
  }

  // Si no estamos en admin.html, salimos
  if (!document.getElementById('reservations-table')) return;

  // Redirigir si no es admin
  if (!user || !ALLOWED_ADMINS.includes(user.email)) {
    return window.location.href = '../login.html';
  }

  // Mostrar usuario y botón logout
  const statusEl = document.getElementById('auth-status');
  statusEl.innerHTML = `
    <span class="navbar-text text-light me-3">Admin: ${user.email}</span>
    <button class="btn btn-sm btn-outline-light" id="logoutBtn">Cerrar Sesión</button>
  `;
  document.getElementById('logoutBtn').onclick = () => auth.signOut();

  // Eventos de búsqueda, select all y bulk cancel
  document.getElementById('searchInput').oninput = () => {
    currentPage = 1; applyFilters();
  };
  document.getElementById('selectAll').onchange = e => {
    document.querySelectorAll('.rowCheckbox')
      .forEach(cb => cb.checked = e.target.checked);
    updateBulkActions();
  };
  document.getElementById('cancelSelected').onclick = cancelSelected;

  // Carga datos
  await loadAdminData();
});

// Carga desde Firestore
async function loadAdminData() {
  showSpinner(true);

  const snap = await getDocs(collection(db,'reservations'));
  allReservations = snap.docs.map(ds => {
    const r = ds.data();
    return {
      id: ds.id,
      ...r,
      startDate:  r.startDate.toDate(),
      endDate:    r.endDate.toDate(),
      createdAt:  r.createdAt.toDate()
    };
  });
  filteredReservations = [...allReservations];

  renderAnalytics();
  renderChart();
  renderTable();
  renderPagination();
  showSpinner(false);
}

// Muestra/oculta spinner y contenedores
function showSpinner(loading) {
  document.getElementById('loadingSpinner').style.display = loading?'block':'none';
  ['analytics','chartContainer','bulkActions','csvContainer','tableContainer']
    .forEach(id => {
      const el = document.getElementById(id);
      if(el) el.style.display = loading?'none':'block';
    });
}

// Estadísticas
function renderAnalytics() {
  const totalRes = allReservations.length;
  const totalRev = allReservations.reduce((sum,r)=>sum+r.total,0);
  const activeRes= allReservations.filter(r=>r.status==='active').length;
  document.getElementById('total-reservations').textContent = totalRes;
  document.getElementById('total-revenue').textContent      = `$${totalRev.toFixed(2)}`;
  document.getElementById('active-reservations').textContent= activeRes;
}

// Gráfico de barras (límite Y=100000)
function renderChart() {
  const ctx = document.getElementById('revenueChart').getContext('2d');
  if (revenueChartInstance) revenueChartInstance.destroy();

  const months = [], data = [];
  const now = new Date();
  for (let i=5; i>=0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    months.push(d.toLocaleString('default',{month:'short',year:'numeric'}));
    const sum = allReservations
      .filter(r=> r.startDate>=new Date(d.getFullYear(),d.getMonth(),1) &&
                  r.startDate< new Date(d.getFullYear(),d.getMonth()+1,1))
      .reduce((s,r)=>s+r.total,0);
    data.push(sum.toFixed(2));
  }

  revenueChartInstance = new Chart(ctx, {
    type: 'bar',
    data: { labels: months, datasets: [{
      label: 'Ingresos (MXN)',
      data,
      backgroundColor: 'rgba(70,133,0,0.6)'
    }]},
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero:true, max:100000 }
      }
    }
  });
}

// Filtrado
function applyFilters() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  filteredReservations = allReservations.filter(r=>
    r.fullName.toLowerCase().includes(q) ||
    r.email.toLowerCase().includes(q) ||
    r.roomId.toLowerCase().includes(q)
  );
  currentPage = 1;
  renderTable();
  renderPagination();
}

// Renderiza tabla de la página actual
function renderTable() {
  const tbody = document.querySelector('#reservations-table tbody');
  tbody.innerHTML = '';
  const start = (currentPage-1)*rowsPerPage;
  const items = filteredReservations.slice(start, start+rowsPerPage);

  items.forEach(r=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="checkbox" class="rowCheckbox" data-id="${r.id}"></td>
      <td>${r.id}</td>
      <td>${r.fullName}</td>
      <td>${r.email}</td>
      <td>${r.roomId}</td>
      <td>${r.startDate.toLocaleDateString()}</td>
      <td>${r.endDate.toLocaleDateString()}</td>
      <td>${r.nights}</td>
      <td>$${r.total.toFixed(2)}</td>
      <td>${r.status}</td>
      <td>${r.createdAt.toLocaleString()}</td>
      <td><button class="btn btn-sm btn-outline-primary resend-email" data-id="${r.id}">✉️</button></td>
    `;
    tbody.appendChild(tr);
  });

  document.querySelectorAll('.rowCheckbox').forEach(cb=>cb.onchange=updateBulkActions);
  document.querySelectorAll('.resend-email').forEach(btn=>btn.onclick=()=>{
    const id = btn.dataset.id;
    const r = allReservations.find(x=>x.id===id);
    emailjs.send('service_wpy0okh','template_mo7jbxe',{
      to_email:      r.email,
      fullName:      r.fullName,
      reservationId: r.id,
      room:          r.roomId,
      startDate:     r.startDate.toLocaleDateString(),
      endDate:       r.endDate.toLocaleDateString(),
      nights:        r.nights,
      total:         r.total.toFixed(2)
    }).then(()=>{
      addLog(`Reenvío de email para reserva ${r.id}`);
      btn.textContent='✅';
    }).catch(console.error);
  });

  // Mostrar contenedores
  ['csvContainer','bulkActions','tableContainer'].forEach(id=>{
    document.getElementById(id).style.display='block';
  });
}

// Actualiza el botón de acciones masivas
function updateBulkActions() {
  const any = [...document.querySelectorAll('.rowCheckbox')].some(cb=>cb.checked);
  document.getElementById('cancelSelected').disabled = !any;
  document.getElementById('bulkActions').style.display = any?'block':'none';
}

// Paginación
function renderPagination() {
  const totalPages = Math.ceil(filteredReservations.length/rowsPerPage);
  const ul = document.getElementById('pagination');
  ul.innerHTML = '';
  for (let i=1;i<=totalPages;i++){
    const li = document.createElement('li');
    li.className = `page-item ${i===currentPage?'active':''}`;
    li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
    li.onclick = e=>{
      e.preventDefault();
      currentPage = i;
      renderTable();
      renderPagination();
    };
    ul.appendChild(li);
  }
}

// Cancela reservas seleccionadas
async function cancelSelected(){
  const checked = [...document.querySelectorAll('.rowCheckbox')]
    .filter(cb=>cb.checked).map(cb=>cb.dataset.id);
  for (let id of checked){
    await updateDoc(doc(db,'reservations',id),{status:'cancelled'});
    addLog(`Reserva ${id} cancelada`);
  }
  alert('Reservas seleccionadas canceladas.');
  await loadAdminData();
}

// Descargar CSV
document.getElementById('download-csv').onclick = ()=>{
  const rows=[['ID','Usuario','Email','Habitación','Desde','Hasta','Noches','Total','Estado','Creado']];
  allReservations.forEach(r=>{
    rows.push([
      r.id,
      r.fullName,
      r.email,
      r.roomId,
      r.startDate.toLocaleDateString(),
      r.endDate.toLocaleDateString(),
      r.nights,
      r.total.toFixed(2),
      r.status,
      r.createdAt.toLocaleString()
    ]);
  });
  const csv = 'data:text/csv;charset=utf-8,'+rows.map(r=>r.join(',')).join('\n');
  const link=document.createElement('a');
  link.href=encodeURI(csv);
  link.download='reservations_report.csv';
  link.click();
};
