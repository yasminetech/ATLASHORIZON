// Shared SQLite Database Sync & Multi-Language Reservation Store Engine for ATLAS HORIZON

const ATLAS_STORAGE_KEY = 'atlas_horizon_reservations';
const ATLAS_AUTH_KEY = 'atlas_admin_session';
const ATLAS_SYNC_KEY = 'atlas_last_sync_timestamp';

// Dynamic API Base URL resolver: detects localhost:8085 when opened from other ports or file://
function getApiBaseUrl() {
  if (typeof window !== 'undefined' && window.location) {
    if (window.location.protocol === 'file:') {
      return 'http://localhost:8085';
    }
    const hostname = window.location.hostname;
    const port = window.location.port;
    if ((hostname === 'localhost' || hostname === '127.0.0.1') && port !== '8085') {
      return 'http://localhost:8085';
    }
  }
  return '';
}

// Initial benchmark seed reservations for offline / static first-time display
const INITIAL_BENCHMARK_RESERVATIONS = [
  {
    id: 'RES-2026-001',
    clientName: 'Ahmed Benali',
    email: 'ahmed.benali@gmail.com',
    phone: '+351 912 345 678',
    service: 'Construction',
    desiredDate: '2026-10-15',
    desiredTime: '10:00',
    location: 'Cascais, Lisboa',
    area: '450',
    message: "Construction d'une villa contemporaine avec structure en béton armé et grande baie vitrée.",
    status: 'En attente',
    createdAt: '2026-09-29 14:30',
    notes: '',
    lang: 'fr'
  },
  {
    id: 'RES-2026-002',
    clientName: 'Sophie Laurent',
    email: 'sophie.laurent@archidesign.be',
    phone: '+32 470 12 34 56',
    service: 'Commercial Projects',
    desiredDate: '2026-11-01',
    desiredTime: '14:30',
    location: 'Bruxelles, Belgique',
    area: '1200',
    message: "Rénovation lourde d'un immeuble tertiaire avec renforcement de charpente métallique.",
    status: 'Confirmée',
    createdAt: '2026-09-28 09:15',
    notes: "Visite de chantier planifiée avec l'ingénieur principal.",
    lang: 'fr'
  },
  {
    id: 'RES-2026-003',
    clientName: 'Carlos Silva',
    email: 'carlos.silva@construtora.pt',
    phone: '+351 937 131 260',
    service: 'Structural Works',
    desiredDate: '2026-10-20',
    desiredTime: '11:00',
    location: 'Porto, Portugal',
    area: '800',
    message: 'Coulage de radier haute densité et poutres précontraintes pour complexe industriel.',
    status: 'En attente',
    createdAt: '2026-09-29 18:20',
    notes: '',
    lang: 'pt'
  },
  {
    id: 'RES-2026-004',
    clientName: 'Marc Dupont',
    email: 'm.dupont@invest.be',
    phone: '+32 485 99 88 77',
    service: 'Renovation & Heritage',
    desiredDate: '2026-09-25',
    desiredTime: '09:00',
    location: 'Lisbonne, Portugal',
    area: '320',
    message: 'Restauration de façade historique et renforcement de plancher mixte bois-acier.',
    status: 'Refusée',
    createdAt: '2026-09-24 16:40',
    notes: 'Planning de livraison complet pour le trimestre IV.',
    lang: 'en'
  },
  {
    id: 'RES-2026-005',
    clientName: 'Elena Rostova',
    email: 'elena.rostova@luxuryhomes.pt',
    phone: '+351 926 930 272',
    service: 'Residential Projects',
    desiredDate: '2026-12-05',
    desiredTime: '15:00',
    location: 'Estoril, Portugal',
    area: '600',
    message: 'Projet de construction clé en main avec sous-sol technique et voiles en béton architectural.',
    status: 'Confirmée',
    createdAt: '2026-09-27 11:10',
    notes: 'Dossier technique validé. Permis de construire reçu.',
    lang: 'pt'
  }
];

// Mark demo records so they are never pushed to the real backend.
INITIAL_BENCHMARK_RESERVATIONS.forEach(r => { r.isDemo = true; });

// In-memory cache synced with SQLite Database
let cachedReservations = [];

function broadcastChange() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(ATLAS_SYNC_KEY, Date.now().toString());
    } catch (e) {}
    window.dispatchEvent(new CustomEvent('atlas_reservation_updated'));
  }
}

const ReservationStore = {
  // Sync with SQLite Database API with Offline Reconciliation
  async fetchFromDatabase() {
    const apiBase = getApiBaseUrl();
    try {
      const res = await fetch(`${apiBase}/api/reservations`);
      if (res.ok) {
        const dbData = await res.json();
        
        // RECONCILIATION: push only genuine offline records (never the demo seed data)
        const demoKeys = new Set(INITIAL_BENCHMARK_RESERVATIONS.map(r => `${r.id}|${r.clientName}`));
        const localRaw = localStorage.getItem(ATLAS_STORAGE_KEY);
        const localList = localRaw ? JSON.parse(localRaw) : [];
        const dbIds = new Set(dbData.map(r => r.id));

        const unsynced = localList.filter(r =>
          r && r.id && !dbIds.has(r.id) &&
          !r.isDemo && !demoKeys.has(`${r.id}|${r.clientName}`)
        );
        const stillUnsynced = [];
        for (const item of unsynced) {
          try {
            const pushRes = await fetch(`${apiBase}/api/reservations`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item)
            });
            if (!pushRes.ok) stillUnsynced.push(item);
          } catch (err) {
            console.warn('[ReservationStore] Error syncing item:', item.id, err);
            stillUnsynced.push(item);
          }
        }

        // Re-fetch after syncing so list is completely unified
        let merged = dbData;
        try {
          const reRes = await fetch(`${apiBase}/api/reservations`);
          if (reRes.ok) merged = await reRes.json();
        } catch (e) {}
        const mergedIds = new Set(merged.map(r => r.id));
        const mergedList = [...stillUnsynced.filter(r => !mergedIds.has(r.id)), ...merged];

        cachedReservations = mergedList;
        localStorage.setItem(ATLAS_STORAGE_KEY, JSON.stringify(mergedList));
        if (unsynced.length > 0) broadcastChange();
        return mergedList;
      }
    } catch (e) {
      console.warn('[ReservationStore] SQLite backend offline or unreachable, using local storage fallback.', e);
    }

    // Local Storage Fallback
    const local = localStorage.getItem(ATLAS_STORAGE_KEY);
    if (local) {
      try {
        cachedReservations = JSON.parse(local);
      } catch (err) {
        cachedReservations = [...INITIAL_BENCHMARK_RESERVATIONS];
      }
    } else {
      cachedReservations = [...INITIAL_BENCHMARK_RESERVATIONS];
      try {
        localStorage.setItem(ATLAS_STORAGE_KEY, JSON.stringify(cachedReservations));
      } catch (e) {}
    }
    return cachedReservations;
  },

  getReservations() {
    if (cachedReservations.length === 0) {
      const local = localStorage.getItem(ATLAS_STORAGE_KEY);
      if (local) {
        try {
          cachedReservations = JSON.parse(local);
        } catch (e) {
          cachedReservations = [...INITIAL_BENCHMARK_RESERVATIONS];
        }
      } else {
        cachedReservations = [...INITIAL_BENCHMARK_RESERVATIONS];
      }
    }
    return cachedReservations;
  },

  async addReservation(data) {
    const userLang = data.lang || (window.currentLang ? window.currentLang : 'fr');
    const list = this.getReservations();
    
    // Generate sequential ID that doesn't collide
    const year = new Date().getFullYear();
    let maxNum = 0;
    for (const r of list) {
      if (r && r.id) {
        const parts = r.id.split('-');
        if (parts.length >= 3 && !isNaN(parseInt(parts[parts.length - 1]))) {
          const num = parseInt(parts[parts.length - 1]);
          if (num > maxNum) maxNum = num;
        }
      }
    }
    const newId = `RES-${year}-${String(maxNum + 1).padStart(3, '0')}`;
    
    const now = new Date();
    const formattedNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const record = {
      id: newId,
      clientName: data.clientName || 'Client Horizon',
      email: data.email || 'contact@atlashorizon.eu',
      phone: data.phone || '+351 926 930 272',
      service: data.service || 'General Construction',
      desiredDate: data.desiredDate || `${year}-10-15`,
      desiredTime: data.desiredTime || '10:00',
      location: data.location || 'Portugal / Belgium',
      area: data.area || 'N/A',
      message: data.message || 'Demande de consultation via le site web.',
      status: 'En attente',
      createdAt: formattedNow,
      notes: '',
      lang: userLang
    };

    // 1. Immediately save into local storage to guarantee ZERO DATA LOSS
    list.unshift(record);
    cachedReservations = list;
    try {
      localStorage.setItem(ATLAS_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {}
    broadcastChange();

    // 2. Try pushing to the backend. The server assigns the final ID so two
    // visitors submitting at the same time can never collide.
    const apiBase = getApiBaseUrl();
    try {
      const serverPayload = { ...record };
      delete serverPayload.id;
      const res = await fetch(`${apiBase}/api/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serverPayload)
      });
      if (res.ok) {
        const serverRecord = await res.json();
        const idx = list.findIndex(r => r.id === record.id);
        if (idx !== -1 && serverRecord.id) {
          list.splice(idx, 1);
          const existingIdx = list.findIndex(r => r.id === serverRecord.id);
          if (existingIdx !== -1) {
            list[existingIdx] = serverRecord;
          } else {
            list.unshift(serverRecord);
          }
          cachedReservations = list;
          try {
            localStorage.setItem(ATLAS_STORAGE_KEY, JSON.stringify(list));
          } catch (e) {}
        }
        broadcastChange();
        return serverRecord;
      }
    } catch (e) {
      console.warn('[ReservationStore] Could not push to server API immediately; stored locally.', e);
    }

    return record;
  },

  async updateStatus(id, newStatus, note = '') {
    const apiBase = getApiBaseUrl();
    try {
      const res = await fetch(`${apiBase}/api/reservations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, note: note })
      });
      if (res.ok) {
        await this.fetchFromDatabase();
        broadcastChange();
        return;
      }
    } catch (e) {
      console.warn('[ReservationStore] SQLite status sync failed:', e);
    }

    // Local fallback update in cache if offline
    const list = this.getReservations();
    const idx = list.findIndex(r => r.id === id);
    if (idx !== -1) {
      list[idx].status = newStatus;
      if (note && note.trim() !== '') {
        const dateStr = new Date().toISOString().substring(0, 10);
        const existing = list[idx].notes ? list[idx].notes + '\n\n' : '';
        list[idx].notes = existing + `[${dateStr} - ${newStatus}] ${note.trim()}`;
      }
      try {
        localStorage.setItem(ATLAS_STORAGE_KEY, JSON.stringify(list));
      } catch (e) {}
    }
    broadcastChange();
  },

  async addNote(id, note) {
    const apiBase = getApiBaseUrl();
    try {
      const res = await fetch(`${apiBase}/api/reservations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: note })
      });
      if (res.ok) {
        await this.fetchFromDatabase();
        broadcastChange();
        return;
      }
    } catch (e) {
      console.warn('[ReservationStore] SQLite note sync failed:', e);
    }

    const list = this.getReservations();
    const idx = list.findIndex(r => r.id === id);
    if (idx !== -1 && note.trim() !== '') {
      const dateStr = new Date().toISOString().substring(0, 10);
      const existing = list[idx].notes ? list[idx].notes + '\n\n' : '';
      list[idx].notes = existing + `[${dateStr} - Note] ${note.trim()}`;
      try {
        localStorage.setItem(ATLAS_STORAGE_KEY, JSON.stringify(list));
      } catch (e) {}
    }
    broadcastChange();
  },

  async deleteReservation(id) {
    const apiBase = getApiBaseUrl();
    try {
      const res = await fetch(`${apiBase}/api/reservations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await this.fetchFromDatabase();
        broadcastChange();
        return true;
      }
    } catch (e) {
      console.warn('[ReservationStore] SQLite delete sync failed:', e);
    }

    // Local fallback if API is offline
    let list = this.getReservations();
    list = list.filter(r => r.id !== id);
    cachedReservations = list;
    try {
      localStorage.setItem(ATLAS_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {}
    broadcastChange();
    return false;
  },

  getStats() {
    const list = this.getReservations();
    return {
      total: list.length,
      pending: list.filter(r => r.status === 'En attente').length,
      confirmed: list.filter(r => r.status === 'Confirmée').length,
      refused: list.filter(r => r.status === 'Refusée').length,
      cancelled: list.filter(r => r.status === 'Annulée').length
    };
  },

  // Admin Auth Engine
  getAuth() {
    try {
      const session = localStorage.getItem(ATLAS_AUTH_KEY);
      if (!session) return null;
      const parsed = JSON.parse(session);
      if (!parsed || typeof parsed !== 'object' || !parsed.token) {
        localStorage.removeItem(ATLAS_AUTH_KEY);
        return null;
      }
      return parsed;
    } catch (e) {
      try { localStorage.removeItem(ATLAS_AUTH_KEY); } catch (err) {}
      return null;
    }
  },

  saveAuth(sessionData) {
    try {
      localStorage.setItem(ATLAS_AUTH_KEY, JSON.stringify(sessionData));
      return !!localStorage.getItem(ATLAS_AUTH_KEY);
    } catch (e) {
      return false;
    }
  },

  async login(emailOrUsername, password) {
    const storageError = {
      success: false,
      message: 'Impossible d\'enregistrer la session. Autorisez le stockage local dans votre navigateur puis réessayez.'
    };
    const apiBase = getApiBaseUrl();
    try {
      const res = await fetch(`${apiBase}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: emailOrUsername, password: password })
      });
      if (res.ok) {
        const sessionData = await res.json();
        if (sessionData && sessionData.success !== false) {
          if (!this.saveAuth(sessionData)) return storageError;
          return { success: true, session: sessionData };
        }
      }
    } catch (e) {
      console.warn('[ReservationStore] Backend login API offline, using default authentication check.', e);
    }

    // Master admin credentials fallback (accepts both passwords for convenience)
    const cleanUser = (emailOrUsername || '').trim().toLowerCase();
    const validUsers = [
      'contact@atlashorizon.eu',
      'admin@atlashorizon.com',
      'admin',
      'yassminemezgour@gmail.com',
      'admin atlas horizon'
    ];
    const validPasswords = ['moha@jas2089', 'admin123'];

    if (validUsers.includes(cleanUser) && validPasswords.includes(password)) {
      const sessionData = {
        username: 'Admin Atlas Horizon',
        email: cleanUser.includes('@') ? cleanUser : 'contact@atlashorizon.eu',
        token: 'ATLAS_TOKEN_' + Date.now(),
        loginAt: new Date().toISOString()
      };
      if (!this.saveAuth(sessionData)) return storageError;
      return { success: true, session: sessionData };
    }
    return { success: false, message: 'Email ou mot de passe incorrect.' };
  },

  logout() {
    localStorage.removeItem(ATLAS_AUTH_KEY);
  },

  // Multi-Language WhatsApp Message Generator Helper
  generateWhatsAppDetails(phone, clientName, service, status, dateStr, lang = 'fr') {
    let cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    if (cleanPhone.length <= 10 && cleanPhone.startsWith('0')) {
      cleanPhone = '212' + cleanPhone.substring(1);
    } else if (cleanPhone.length === 9 && (cleanPhone.startsWith('9') || cleanPhone.startsWith('2'))) {
      cleanPhone = '351' + cleanPhone;
    }
    
    const client = clientName || '';
    const targetLang = (lang || 'fr').toLowerCase();
    let msg = '';

    if (targetLang === 'pt') {
      const greeting = `Olá ${client},`;
      if (status === 'Confirmée') {
        msg = `${greeting} temos o prazer de confirmar o seu agendamento / pedido de orçamento para o projeto (${service}) previsto para ${dateStr || ''}. Equipa Atlas Horizon.`;
      } else if (status === 'Refusée') {
        msg = `${greeting} relativamente ao seu pedido para o projeto (${service}), lamentavelmente não poderemos aceitar para esta data. Equipa Atlas Horizon.`;
      } else {
        msg = `${greeting} recebemos o seu pedido de consulta para o projeto (${service}) na Atlas Horizon. Entraremos em contacto brevemente.`;
      }
    } else if (targetLang === 'en') {
      const greeting = `Hello ${client},`;
      if (status === 'Confirmée') {
        msg = `${greeting} we are pleased to confirm your appointment / quote request for project (${service}) scheduled for ${dateStr || ''}. Atlas Horizon Team.`;
      } else if (status === 'Refusée') {
        msg = `${greeting} regarding your request for project (${service}), unfortunately we cannot accommodate this date. Atlas Horizon Team.`;
      } else {
        msg = `${greeting} we have received your consultation request for project (${service}) at Atlas Horizon. We will get back to you shortly.`;
      }
    } else {
      const greeting = `Bonjour ${client},`;
      if (status === 'Confirmée') {
        msg = `${greeting} nous avons le plaisir de vous confirmer votre rendez-vous / demande de devis pour le projet (${service}) prévu le ${dateStr || ''}. Équipe Atlas Horizon.`;
      } else if (status === 'Refusée') {
        msg = `${greeting} concernant votre demande pour le projet (${service}), nous ne pouvons malheureusement pas donner suite à cette date. Équipe Atlas Horizon.`;
      } else {
        msg = `${greeting} nous avons bien reçu votre demande de consultation pour le projet (${service}) chez Atlas Horizon. Nous revenons vers vous rapidement.`;
      }
    }

    return {
      phone: cleanPhone,
      formattedPhone: '+' + cleanPhone,
      message: msg,
      webUrl: `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`,
      apiUrl: `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`
    };
  },

  generateWhatsAppLink(phone, clientName, service, status, dateStr, lang = 'fr') {
    const details = this.generateWhatsAppDetails(phone, clientName, service, status, dateStr, lang);
    return details.apiUrl;
  },

  // WhatsApp message written by the visitor TO Atlas Horizon (never the admin reply)
  generateClientWhatsAppDetails(phone, clientName, service, dateStr, lang = 'fr') {
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    const client = clientName || '';
    const targetLang = (lang || 'fr').toLowerCase();
    let msg = '';

    if (targetLang === 'pt') {
      msg = `Olá Atlas Horizon, sou ${client}. Acabei de enviar um pedido${service ? ` para (${service})` : ''}${dateStr ? ` previsto para ${dateStr}` : ''}. Por favor, contactem-me para falarmos.`;
    } else if (targetLang === 'en') {
      msg = `Hello Atlas Horizon, this is ${client}. I have just submitted a request${service ? ` for (${service})` : ''}${dateStr ? ` planned for ${dateStr}` : ''}. Please contact me to discuss it.`;
    } else {
      msg = `Bonjour Atlas Horizon, je suis ${client}. Je viens d'envoyer une demande${service ? ` pour le service (${service})` : ''}${dateStr ? `, prévue le ${dateStr}` : ''}. Merci de me contacter pour en discuter.`;
    }

    return {
      phone: cleanPhone,
      formattedPhone: '+' + cleanPhone,
      message: msg,
      webUrl: `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`,
      apiUrl: `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`
    };
  },

  // Multi-Language Email Mailto Generator Helper
  generateEmailLink(email, clientName, service, status, dateStr, lang = 'fr') {
    const client = clientName || '';
    const targetLang = (lang || 'fr').toLowerCase();
    let subject = '';
    let body = '';

    if (targetLang === 'pt') {
      subject = `ATLAS HORIZON — O seu agendamento / orçamento (${service})`;
      body = `Olá ${client},\n\nEm seguimento do seu pedido para o projeto ${service} (Data pretendida: ${dateStr || 'Não especificada'}).\n\nEstado atual: ${status}\n\nCom os melhores cumprimentos,\n\nEquipa Atlas Horizon Construction & Architecture\nTEL: +351 926 930 272 | +351 937 131 260\nEmail: contact@atlashorizon.eu`;
    } else if (targetLang === 'en') {
      subject = `ATLAS HORIZON — Your appointment / quote request (${service})`;
      body = `Hello ${client},\n\nFollowing up on your request for project ${service} (Requested Date: ${dateStr || 'Not specified'}).\n\nCurrent Status: ${status}\n\nBest regards,\n\nAtlas Horizon Construction & Architecture Team\nTEL: +351 926 930 272 | +351 937 131 260\nEmail: contact@atlashorizon.eu`;
    } else {
      subject = `ATLAS HORIZON — Votre réservation / devis (${service})`;
      body = `Bonjour ${client},\n\nNous faisons suite à votre demande pour le projet ${service} (Date souhaitée: ${dateStr || 'Non spécifiée'}).\n\nStatut actuel: ${status}\n\nCordialement,\n\nL'équipe Atlas Horizon Construction & Architecture\nTEL: +351 926 930 272 | +351 937 131 260\nEmail: contact@atlashorizon.eu`;
    }

    return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
};

// Initial sync on load
ReservationStore.fetchFromDatabase();

// Make available globally
if (typeof window !== 'undefined') {
  window.ReservationStore = ReservationStore;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ReservationStore;
}
