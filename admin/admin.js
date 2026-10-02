// ATLAS HORIZON Admin Dashboard Application Engine

document.addEventListener('DOMContentLoaded', () => {
  // Check Authentication Protection
  const session = ReservationStore.getAuth();
  if (!session) {
    window.location.replace('login.html');
    return;
  }

  // Display admin username
  const userElem = document.getElementById('admin-username-display');
  if (userElem) {
    userElem.textContent = session.username || 'Admin Atlas Horizon';
  }

  // Initialize UI navigation tabs
  initTabs();

  // Fetch latest SQLite database data on load
  ReservationStore.fetchFromDatabase().then(() => {
    refreshAllViews();
  });

  // Listen to live data changes
  window.addEventListener('storage', () => {
    refreshAllViews();
  });
  window.addEventListener('atlas_reservation_updated', () => {
    refreshAllViews();
  });
});

function refreshAllViews() {
  renderDashboard();
  renderReservationsTable();
  renderClientsList();
  lucide.createIcons();
}

// Navigation Tabs Manager
function initTabs() {
  const navLinks = document.querySelectorAll('.admin-nav-link');
  const tabViews = document.querySelectorAll('.tab-view');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = link.getAttribute('data-tab');

      // Update Nav active states
      navLinks.forEach(nl => {
        nl.classList.remove('bg-brand-copper/10', 'text-brand-copper', 'border-brand-copper');
        nl.classList.add('text-brand-whiteMuted', 'hover:text-brand-white', 'hover:bg-white/5', 'border-transparent');
      });
      link.classList.remove('text-brand-whiteMuted', 'hover:text-brand-white', 'hover:bg-white/5', 'border-transparent');
      link.classList.add('bg-brand-copper/10', 'text-brand-copper', 'border-brand-copper');

      // Show target tab
      tabViews.forEach(view => {
        if (view.id === `tab-${targetTab}`) {
          view.classList.remove('hidden');
        } else {
          view.classList.add('hidden');
        }
      });
    });
  });
}

// Render Dashboard Overview Cards & Recent Table
function renderDashboard() {
  const stats = ReservationStore.getStats();

  const totalElem = document.getElementById('stat-total');
  const pendingElem = document.getElementById('stat-pending');
  const confirmedElem = document.getElementById('stat-confirmed');
  const refusedElem = document.getElementById('stat-refused');

  if (totalElem) totalElem.textContent = stats.total;
  if (pendingElem) pendingElem.textContent = stats.pending;
  if (confirmedElem) confirmedElem.textContent = stats.confirmed;
  if (refusedElem) refusedElem.textContent = stats.refused + stats.cancelled;

  // Render recent 5 reservations
  const list = ReservationStore.getReservations().slice(0, 5);
  const container = document.getElementById('dashboard-recent-table-body');
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-8 text-brand-grey font-mono text-xs">
          Aucune réservation trouvée.
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = list.map(res => `
    <tr class="transition-colors hover:bg-white/[0.02]">
      <td class="font-mono text-xs text-brand-copper font-bold">${res.id}</td>
      <td>
        <div class="font-medium text-brand-white">${escapeHtml(res.clientName)}</div>
        <div class="text-xs text-brand-grey">${escapeHtml(res.phone || res.email)}</div>
      </td>
      <td>
        <span class="inline-block px-2.5 py-1 bg-white/5 text-brand-white text-xs rounded border border-white/10">
          ${escapeHtml(res.service)}
        </span>
      </td>
      <td class="font-mono text-xs text-brand-whiteMuted">${escapeHtml(res.desiredDate)}</td>
      <td>${getStatusBadge(res.status)}</td>
      <td class="text-right">
        <button onclick="openDetailsModal('${res.id}')" class="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-brand-white text-xs font-mono rounded transition-colors inline-flex items-center gap-1">
          <i data-lucide="eye" class="w-3.5 h-3.5"></i>
          <span>Détails</span>
        </button>
      </td>
    </tr>
  `).join('');
}

// Render Main Reservations Table with Search & Filter
let currentStatusFilter = 'ALL';

function renderReservationsTable() {
  const searchInput = document.getElementById('reservation-search');
  const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
  
  let list = ReservationStore.getReservations();

  // Apply status filter
  if (currentStatusFilter !== 'ALL') {
    list = list.filter(r => r.status === currentStatusFilter);
  }

  // Apply search query
  if (query) {
    list = list.filter(r => 
      (r.clientName && r.clientName.toLowerCase().includes(query)) ||
      (r.email && r.email.toLowerCase().includes(query)) ||
      (r.phone && r.phone.toLowerCase().includes(query)) ||
      (r.service && r.service.toLowerCase().includes(query)) ||
      (r.id && r.id.toLowerCase().includes(query)) ||
      (r.location && r.location.toLowerCase().includes(query))
    );
  }

  const container = document.getElementById('reservations-table-body');
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-12 text-brand-grey font-mono text-xs">
          Aucune réservation trouvée pour les critères sélectionnés.
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = list.map(res => `
    <tr class="transition-colors hover:bg-white/[0.02]">
      <td class="font-mono text-xs">
        <div class="text-brand-copper font-bold">${res.id}</div>
        <div class="text-[11px] text-brand-grey">${escapeHtml(res.createdAt)}</div>
      </td>
      <td>
        <div class="flex items-center gap-2">
          <span class="font-bold text-brand-white">${escapeHtml(res.clientName)}</span>
          <span class="px-1.5 py-0.5 bg-brand-copper/15 text-brand-copper font-mono text-[10px] rounded border border-brand-copper/30 font-bold uppercase">${escapeHtml((res.lang || 'fr').toUpperCase())}</span>
        </div>
        <div class="text-xs text-brand-whiteMuted">${escapeHtml(res.email)}</div>
        <div class="text-xs text-brand-grey font-mono">${escapeHtml(res.phone)}</div>
      </td>
      <td>
        <div class="font-medium text-brand-white text-xs">${escapeHtml(res.service)}</div>
        <div class="text-[11px] text-brand-grey">${escapeHtml(res.location)} (${escapeHtml(res.area)} m²)</div>
      </td>
      <td class="font-mono text-xs">
        <div class="text-brand-white">${escapeHtml(res.desiredDate)}</div>
        <div class="text-brand-copper text-[11px]">${escapeHtml(res.desiredTime)}</div>
      </td>
      <td>${getStatusBadge(res.status)}</td>
      <td>
        <div class="flex items-center gap-1.5 justify-end">
          
          <!-- View Details -->
          <button onclick="openDetailsModal('${res.id}')" title="Voir détails" class="p-2 bg-white/5 hover:bg-white/10 text-brand-white border border-white/10 rounded transition-colors">
            <i data-lucide="eye" class="w-4 h-4"></i>
          </button>

          <!-- Confirm -->
          <button onclick="updateReservationStatus('${res.id}', 'Confirmée')" title="Confirmer la réservation" class="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded transition-colors">
            <i data-lucide="check-circle" class="w-4 h-4"></i>
          </button>

          <!-- Refuse -->
          <button onclick="openRefuseModal('${res.id}')" title="Refuser la réservation" class="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded transition-colors">
            <i data-lucide="x-circle" class="w-4 h-4"></i>
          </button>

          <!-- Cancel -->
          <button onclick="updateReservationStatus('${res.id}', 'Annulée')" title="Annuler la réservation" class="p-2 bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 border border-slate-500/30 rounded transition-colors">
            <i data-lucide="ban" class="w-4 h-4"></i>
          </button>

          <!-- WhatsApp -->
          <button onclick="openWhatsApp('${res.id}')" title="Contacter sur WhatsApp" class="p-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded transition-colors">
            <i data-lucide="message-square" class="w-4 h-4"></i>
          </button>

          <!-- Email -->
          <button onclick="sendEmail('${res.id}')" title="Envoyer un email" class="p-2 bg-brand-copper/20 hover:bg-brand-copper/30 text-brand-copper border border-brand-copper/30 rounded transition-colors">
            <i data-lucide="mail" class="w-4 h-4"></i>
          </button>

          <!-- Delete -->
          <button onclick="deleteReservationPrompt('${res.id}')" title="Supprimer définitivement" class="p-2 bg-rose-900/30 hover:bg-rose-800/50 text-rose-300 border border-rose-700/50 rounded transition-colors">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>

        </div>
      </td>
    </tr>
  `).join('');

  lucide.createIcons();
}

function filterByStatus(status) {
  currentStatusFilter = status;
  
  // Update button active UI
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    if (btn.getAttribute('data-status') === status) {
      btn.classList.remove('bg-brand-surface', 'text-brand-whiteMuted', 'border-white/10');
      btn.classList.add('bg-brand-copper', 'text-white', 'border-brand-copper');
    } else {
      btn.classList.remove('bg-brand-copper', 'text-white', 'border-brand-copper');
      btn.classList.add('bg-brand-surface', 'text-brand-whiteMuted', 'border-white/10');
    }
  });

  renderReservationsTable();
}

// Status Badges Generator
function getStatusBadge(status) {
  switch (status) {
    case 'Confirmée':
      return `<span class="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded badge-confirmed"><span class="w-2 h-2 rounded-full bg-emerald-400"></span> 🟢 Confirmée</span>`;
    case 'Refusée':
      return `<span class="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded badge-refused"><span class="w-2 h-2 rounded-full bg-rose-400"></span> 🔴 Refusée</span>`;
    case 'Annulée':
      return `<span class="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded badge-cancelled"><span class="w-2 h-2 rounded-full bg-slate-400"></span> ⚫ Annulée</span>`;
    case 'En attente':
    default:
      return `<span class="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded badge-pending"><span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span> 🟠 En attente</span>`;
  }
}

// Actions
function updateReservationStatus(id, newStatus, note = '') {
  ReservationStore.updateStatus(id, newStatus, note);
  refreshAllViews();
}

let currentWaReservation = null;
let currentWaDetails = null;

function openWhatsApp(id) {
  const list = ReservationStore.getReservations();
  const res = list.find(r => r.id === id);
  if (!res) return;

  currentWaReservation = res;
  const clientLang = (res.lang || 'fr').toLowerCase();
  
  const selectElem = document.getElementById('wa-lang-select');
  if (selectElem) {
    selectElem.value = clientLang;
  }

  updateWaModalLang(clientLang);

  const modal = document.getElementById('whatsapp-modal');
  if (modal) modal.classList.remove('hidden-modal');
  lucide.createIcons();
}

function updateWaModalLang(newLang) {
  if (!currentWaReservation) return;

  const res = currentWaReservation;
  const details = ReservationStore.generateWhatsAppDetails(res.phone, res.clientName, res.service, res.status, res.desiredDate, newLang);
  currentWaDetails = details;

  document.getElementById('wa-modal-client').textContent = res.clientName;
  document.getElementById('wa-modal-phone').textContent = details.formattedPhone;
  document.getElementById('wa-modal-message').value = details.message;
  
  const copyBtn = document.getElementById('copy-btn-text');
  if (copyBtn) copyBtn.textContent = 'Copier le message';
}

function closeWhatsAppModal() {
  const modal = document.getElementById('whatsapp-modal');
  if (modal) modal.classList.add('hidden-modal');
  currentWaDetails = null;
}

function copyWaMessage() {
  const msgInput = document.getElementById('wa-modal-message');
  if (msgInput) {
    msgInput.select();
    navigator.clipboard.writeText(msgInput.value);
    const copyBtn = document.getElementById('copy-btn-text');
    if (copyBtn) copyBtn.textContent = '✓ Copié !';
    setTimeout(() => {
      if (copyBtn) copyBtn.textContent = 'Copier le message';
    }, 2500);
  }
}

function launchWaWeb() {
  if (currentWaDetails && currentWaDetails.webUrl) {
    window.open(currentWaDetails.webUrl, '_blank');
  }
}

function launchWaApp() {
  if (currentWaDetails && currentWaDetails.apiUrl) {
    window.open(currentWaDetails.apiUrl, '_blank');
  }
}

function sendEmail(id) {
  const list = ReservationStore.getReservations();
  const res = list.find(r => r.id === id);
  if (res) {
    const link = ReservationStore.generateEmailLink(res.email, res.clientName, res.service, res.status, res.desiredDate, res.lang || 'fr');
    window.location.href = link;
  }
}

// Refusal Note Modal
let activeRefuseId = null;

function openRefuseModal(id) {
  activeRefuseId = id;
  const modal = document.getElementById('refuse-modal');
  const input = document.getElementById('refuse-reason-input');
  if (input) input.value = '';
  if (modal) {
    modal.classList.remove('hidden-modal');
  }
}

function closeRefuseModal() {
  const modal = document.getElementById('refuse-modal');
  if (modal) {
    modal.classList.add('hidden-modal');
  }
  activeRefuseId = null;
}

function confirmRefusal() {
  if (!activeRefuseId) return;
  const reason = document.getElementById('refuse-reason-input').value;
  updateReservationStatus(activeRefuseId, 'Refusée', reason);
  closeRefuseModal();
  closeDetailsModal();
}

// Details Modal Manager
let activeDetailId = null;

function openDetailsModal(id) {
  activeDetailId = id;
  const list = ReservationStore.getReservations();
  const res = list.find(r => r.id === id);
  if (!res) return;

  const modal = document.getElementById('details-modal');
  const body = document.getElementById('details-modal-body');

  body.innerHTML = `
    <div class="space-y-6">
      
      <!-- Top Banner -->
      <div class="flex items-center justify-between pb-6 border-b border-white/10">
        <div>
          <span class="font-mono text-xs text-brand-copper font-bold block">${res.id}</span>
          <h3 class="font-syne font-bold text-2xl text-brand-white mt-1">${escapeHtml(res.clientName)}</h3>
          <p class="text-xs font-mono text-brand-grey mt-0.5">Demande reçue le: ${escapeHtml(res.createdAt)}</p>
        </div>
        <div>
          ${getStatusBadge(res.status)}
        </div>
      </div>

      <!-- Grid Information -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
        
        <div class="p-4 bg-brand-charcoal border border-white/10 space-y-3">
          <span class="text-brand-copper uppercase tracking-wider block font-bold">INFORMATIONS CLIENT</span>
          <div>
            <span class="text-brand-grey block">Nom & Prénom:</span>
            <span class="text-brand-white font-bold text-sm">${escapeHtml(res.clientName)}</span>
          </div>
          <div>
            <span class="text-brand-grey block">Langue de Préférence:</span>
            <span class="text-brand-copper font-bold text-xs uppercase font-mono px-2 py-0.5 bg-brand-copper/10 border border-brand-copper/30 rounded inline-block mt-0.5">${(res.lang || 'fr').toUpperCase()} (${res.lang === 'pt' ? 'Português' : (res.lang === 'en' ? 'English' : 'Français')})</span>
          </div>
          <div>
            <span class="text-brand-grey block">Téléphone:</span>
            <span class="text-brand-white">${escapeHtml(res.phone || 'Non renseigné')}</span>
          </div>
          <div>
            <span class="text-brand-grey block">Email:</span>
            <span class="text-brand-white">${escapeHtml(res.email || 'Non renseigné')}</span>
          </div>
        </div>

        <div class="p-4 bg-brand-charcoal border border-white/10 space-y-3">
          <span class="text-brand-copper uppercase tracking-wider block font-bold">PARAMÈTRES PROJET</span>
          <div>
            <span class="text-brand-grey block">Service Requis:</span>
            <span class="text-brand-white font-bold">${escapeHtml(res.service)}</span>
          </div>
          <div>
            <span class="text-brand-grey block">Date Souhaitée:</span>
            <span class="text-brand-white">${escapeHtml(res.desiredDate)} (${escapeHtml(res.desiredTime)})</span>
          </div>
          <div>
            <span class="text-brand-grey block">Localisation & Surface:</span>
            <span class="text-brand-white">${escapeHtml(res.location)} (${escapeHtml(res.area)} m²)</span>
          </div>
        </div>

      </div>

      <!-- Full Message / Details -->
      <div class="p-4 bg-brand-charcoal border border-white/10 space-y-2">
        <span class="font-mono text-xs text-brand-copper uppercase tracking-wider block font-bold">MESSAGE & DÉTAILS DU PROJET</span>
        <p class="text-sm font-light text-brand-whiteMuted leading-relaxed whitespace-pre-line">${escapeHtml(res.message || 'Aucun détail supplémentaire fourni.')}</p>
      </div>

      <!-- History & Admin Notes -->
      <div class="p-4 bg-brand-charcoal border border-white/10 space-y-3">
        <span class="font-mono text-xs text-brand-copper uppercase tracking-wider block font-bold">NOTES D'ADMINISTRATION & HISTORIQUE</span>
        <div class="text-xs font-mono text-brand-whiteMuted whitespace-pre-line bg-black/30 p-3 border border-white/5 rounded min-h-[60px]">
          ${escapeHtml(res.notes || 'Aucune note enregistrée pour le moment.')}
        </div>
        
        <div class="pt-2 flex items-center gap-2">
          <input type="text" id="add-note-input" placeholder="Ajouter une note de suivi..." class="flex-1 bg-brand-surface border border-white/10 p-2.5 text-xs text-brand-white focus:border-brand-copper focus:outline-none">
          <button onclick="submitNewNote('${res.id}')" class="px-4 py-2.5 bg-brand-copper text-white font-mono text-xs uppercase tracking-wider hover:bg-brand-copperHover transition-colors">
            Ajouter Note
          </button>
        </div>
      </div>

      <!-- Quick Action Buttons -->
      <div class="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
        
        <div class="flex flex-wrap items-center gap-2">
          <button onclick="updateReservationStatus('${res.id}', 'Confirmée'); openDetailsModal('${res.id}');" class="px-4 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
            <i data-lucide="check-circle" class="w-4 h-4"></i>
            <span>Confirmer</span>
          </button>
          
          <button onclick="openRefuseModal('${res.id}')" class="px-4 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
            <i data-lucide="x-circle" class="w-4 h-4"></i>
            <span>Refuser</span>
          </button>

          <button onclick="updateReservationStatus('${res.id}', 'Annulée'); openDetailsModal('${res.id}');" class="px-4 py-2.5 bg-slate-500/20 hover:bg-slate-500/30 text-slate-400 border border-slate-500/40 text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
            <i data-lucide="ban" class="w-4 h-4"></i>
            <span>Annuler</span>
          </button>

          <button onclick="deleteReservationPrompt('${res.id}')" class="px-4 py-2.5 bg-rose-900/40 hover:bg-rose-900/60 text-rose-300 border border-rose-700/50 text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
            <span>Supprimer</span>
          </button>
        </div>

        <div class="flex items-center gap-2">
          <button onclick="openWhatsApp('${res.id}')" class="px-4 py-2.5 bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
            <i data-lucide="message-square" class="w-4 h-4"></i>
            <span>WhatsApp</span>
          </button>

          <button onclick="sendEmail('${res.id}')" class="px-4 py-2.5 bg-brand-copper/30 hover:bg-brand-copper/40 text-brand-white border border-brand-copper/40 text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
            <i data-lucide="mail" class="w-4 h-4"></i>
            <span>Email</span>
          </button>
        </div>

      </div>

    </div>
  `;

  modal.classList.remove('hidden-modal');
  lucide.createIcons();
}

function closeDetailsModal() {
  const modal = document.getElementById('details-modal');
  if (modal) {
    modal.classList.add('hidden-modal');
  }
  activeDetailId = null;
}

function submitNewNote(id) {
  const input = document.getElementById('add-note-input');
  if (input && input.value.trim() !== '') {
    ReservationStore.addNote(id, input.value.trim());
    openDetailsModal(id);
    refreshAllViews();
  }
}

// Render Clients View
function renderClientsList() {
  const list = ReservationStore.getReservations();
  const clientsMap = {};

  list.forEach(res => {
    const key = (res.email || res.phone || res.clientName).toLowerCase();
    if (!clientsMap[key]) {
      clientsMap[key] = {
        name: res.clientName,
        email: res.email,
        phone: res.phone,
        location: res.location,
        totalRequests: 0,
        lastRequestDate: res.createdAt,
        reservations: []
      };
    }
    clientsMap[key].totalRequests++;
    clientsMap[key].reservations.push(res);
  });

  const clientsArray = Object.values(clientsMap);
  const container = document.getElementById('clients-table-body');
  if (!container) return;

  if (clientsArray.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-8 text-brand-grey font-mono text-xs">
          Aucun client enregistré.
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = clientsArray.map(c => `
    <tr class="transition-colors hover:bg-white/[0.02]">
      <td>
        <div class="font-bold text-brand-white">${escapeHtml(c.name)}</div>
        <div class="text-xs text-brand-grey">${escapeHtml(c.location)}</div>
      </td>
      <td class="font-mono text-xs text-brand-whiteMuted">${escapeHtml(c.email)}</td>
      <td class="font-mono text-xs text-brand-grey">${escapeHtml(c.phone)}</td>
      <td class="font-mono text-xs text-center">
        <span class="px-2.5 py-1 bg-brand-copper/10 text-brand-copper font-bold rounded border border-brand-copper/20">
          ${c.totalRequests} demande(s)
        </span>
      </td>
      <td class="text-right">
        <button onclick="openWhatsAppDirect('${c.phone}', '${c.name}')" class="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono rounded hover:bg-emerald-600/30">
          WhatsApp
        </button>
      </td>
    </tr>
  `).join('');

  lucide.createIcons();
}

function openWhatsAppDirect(phone, name) {
  currentWaReservation = {
    clientName: name,
    phone: phone,
    service: 'Consultation',
    status: 'En attente',
    desiredDate: '',
    lang: 'fr'
  };
  updateWaModalLang('fr');

  const selectElem = document.getElementById('wa-lang-select');
  if (selectElem) {
    selectElem.value = 'fr';
  }

  const modal = document.getElementById('whatsapp-modal');
  if (modal) modal.classList.remove('hidden-modal');
  lucide.createIcons();
}

// Settings Handlers
function handlePasswordChange(e) {
  e.preventDefault();
  alert('Mot de passe administrateur mis à jour avec succès.');
  e.target.reset();
}

function exportReservationsCSV() {
  const list = ReservationStore.getReservations();
  if (list.length === 0) {
    alert('Aucune donnée à exporter.');
    return;
  }

  // Semicolon separator for European Excel compatibility
  const delimiter = ';';

  const headers = [
    'ID',
    'Nom Client',
    'Email',
    'Téléphone',
    'Service',
    'Date Souhaitée',
    'Heure Souhaitée',
    'Localisation',
    'Surface (m²)',
    'Langue Client',
    'Statut',
    'Date Demande',
    'Notes & Historique'
  ];

  function cleanField(val) {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""').replace(/\r?\n/g, ' | ');
    return `"${str}"`;
  }

  const rows = list.map(r => [
    cleanField(r.id),
    cleanField(r.clientName),
    cleanField(r.email),
    cleanField(r.phone),
    cleanField(r.service),
    cleanField(r.desiredDate),
    cleanField(r.desiredTime),
    cleanField(r.location),
    cleanField(r.area),
    cleanField((r.lang || 'fr').toUpperCase()),
    cleanField(r.status),
    cleanField(r.createdAt),
    cleanField(r.notes)
  ]);

  // 'sep=;\n' forces Excel to split columns cleanly by semicolon
  const csvText = 'sep=;\n' + [headers.map(cleanField).join(delimiter), ...rows.map(row => row.join(delimiter))].join('\r\n');

  // UTF-8 Byte Order Mark (\uFEFF) ensures clean accents (é, è, ç) in Excel
  const blob = new Blob(['\uFEFF' + csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Reservations_Atlas_Horizon_${new Date().toISOString().substring(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function resetAllData() {
  if (confirm('Êtes-vous sûr de vouloir réinitialiser les données aux réservations de démonstration ?')) {
    localStorage.removeItem('atlas_horizon_reservations');
    refreshAllViews();
    alert('Données réinitialisées.');
  }
}

let pendingDeleteId = null;

function deleteReservationPrompt(id) {
  pendingDeleteId = id;
  const targetElem = document.getElementById('delete-modal-target');
  const idElem = document.getElementById('delete-modal-id');
  if (targetElem) targetElem.textContent = id;
  if (idElem) idElem.textContent = id;
  
  const modal = document.getElementById('delete-modal');
  if (modal) modal.classList.remove('hidden-modal');
  lucide.createIcons();
}

function closeDeleteModal() {
  const modal = document.getElementById('delete-modal');
  if (modal) modal.classList.add('hidden-modal');
  pendingDeleteId = null;
}

async function executeDeleteReservation() {
  if (pendingDeleteId) {
    const idToDelete = pendingDeleteId;
    closeDeleteModal();
    closeDetailsModal();
    await ReservationStore.deleteReservation(idToDelete);
    refreshAllViews();
  }
}

// Logout Manager Modal
function handleLogout() {
  const modal = document.getElementById('logout-modal');
  if (modal) modal.classList.remove('hidden-modal');
  lucide.createIcons();
}

function closeLogoutModal() {
  const modal = document.getElementById('logout-modal');
  if (modal) modal.classList.add('hidden-modal');
}

function confirmLogoutAction() {
  ReservationStore.logout();
  window.location.replace('login.html');
}

// Utility: HTML Escaper
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
