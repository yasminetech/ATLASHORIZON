// Shared SQLite Database Sync & Multi-Language Reservation Store Engine for ATLAS HORIZON

const ATLAS_STORAGE_KEY = 'atlas_horizon_reservations';
const ATLAS_AUTH_KEY = 'atlas_admin_session';

// In-memory cache synced with SQLite Database
let cachedReservations = [];

const ReservationStore = {
  // Sync with SQLite Database API
  async fetchFromDatabase() {
    try {
      const res = await fetch('/api/reservations');
      if (res.ok) {
        const data = await res.json();
        cachedReservations = data;
        localStorage.setItem(ATLAS_STORAGE_KEY, JSON.stringify(data));
        return data;
      }
    } catch (e) {
      console.warn('Backend SQLite API offline, using local storage fallback.', e);
    }
    const local = localStorage.getItem(ATLAS_STORAGE_KEY);
    cachedReservations = local ? JSON.parse(local) : [];
    return cachedReservations;
  },

  getReservations() {
    if (cachedReservations.length === 0) {
      const local = localStorage.getItem(ATLAS_STORAGE_KEY);
      if (local) {
        cachedReservations = JSON.parse(local);
      }
    }
    return cachedReservations;
  },

  async addReservation(data) {
    const userLang = data.lang || (window.currentLang ? window.currentLang : 'fr');
    const payload = {
      ...data,
      lang: userLang
    };

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const record = await res.json();
        await this.fetchFromDatabase();
        window.dispatchEvent(new CustomEvent('atlas_reservation_updated'));
        return record;
      }
    } catch (e) {
      console.warn('Failed to save to SQLite database backend API, saving locally.', e);
    }

    // Local fallback
    const list = this.getReservations();
    const count = list.length + 1;
    const year = new Date().getFullYear();
    const newId = `RES-${year}-${String(count).padStart(3, '0')}`;
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

    list.unshift(record);
    cachedReservations = list;
    localStorage.setItem(ATLAS_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('atlas_reservation_updated'));
    return record;
  },

  async updateStatus(id, newStatus, note = '') {
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, note: note })
      });
      if (res.ok) {
        await this.fetchFromDatabase();
        window.dispatchEvent(new CustomEvent('atlas_reservation_updated'));
        return;
      }
    } catch (e) {
      console.warn('SQLite status sync failed:', e);
    }

    // Optimistic fallback update in cache if offline
    const list = this.getReservations();
    const idx = list.findIndex(r => r.id === id);
    if (idx !== -1) {
      list[idx].status = newStatus;
      if (note && note.trim() !== '') {
        const dateStr = new Date().toISOString().substring(0, 10);
        const existing = list[idx].notes ? list[idx].notes + '\n\n' : '';
        list[idx].notes = existing + `[${dateStr} - ${newStatus}] ${note.trim()}`;
      }
      localStorage.setItem(ATLAS_STORAGE_KEY, JSON.stringify(list));
    }
    window.dispatchEvent(new CustomEvent('atlas_reservation_updated'));
  },

  async addNote(id, note) {
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: note })
      });
      if (res.ok) {
        await this.fetchFromDatabase();
        window.dispatchEvent(new CustomEvent('atlas_reservation_updated'));
        return;
      }
    } catch (e) {
      console.warn('SQLite note sync failed:', e);
    }

    const list = this.getReservations();
    const idx = list.findIndex(r => r.id === id);
    if (idx !== -1 && note.trim() !== '') {
      const dateStr = new Date().toISOString().substring(0, 10);
      const existing = list[idx].notes ? list[idx].notes + '\n\n' : '';
      list[idx].notes = existing + `[${dateStr} - Note] ${note.trim()}`;
      localStorage.setItem(ATLAS_STORAGE_KEY, JSON.stringify(list));
    }

    window.dispatchEvent(new CustomEvent('atlas_reservation_updated'));
  },

  async deleteReservation(id) {
    try {
      const res = await fetch(`/api/reservations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await this.fetchFromDatabase();
        window.dispatchEvent(new CustomEvent('atlas_reservation_updated'));
        return true;
      }
    } catch (e) {
      console.warn('SQLite delete sync failed:', e);
    }

    // Local fallback if API is offline
    let list = this.getReservations();
    list = list.filter(r => r.id !== id);
    cachedReservations = list;
    localStorage.setItem(ATLAS_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('atlas_reservation_updated'));
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
      return session ? JSON.parse(session) : null;
    } catch (e) {
      return null;
    }
  },

  async login(emailOrUsername, password) {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: emailOrUsername, password: password })
      });
      if (res.ok) {
        const sessionData = await res.json();
        localStorage.setItem(ATLAS_AUTH_KEY, JSON.stringify(sessionData));
        return { success: true, session: sessionData };
      }
    } catch (e) {
      console.warn('Backend login API offline, using default authentication check.', e);
    }

    // Default master admin credentials fallback
    const cleanUser = (emailOrUsername || '').trim().toLowerCase();
    if ((cleanUser === 'contact@atlashorizon.eu' || cleanUser === 'admin@atlashorizon.com' || cleanUser === 'admin') && password === 'moha@jas2089') {
      const sessionData = {
        username: 'Admin Atlas Horizon',
        email: 'contact@atlashorizon.eu',
        token: 'ATLAS_TOKEN_' + Date.now(),
        loginAt: new Date().toISOString()
      };
      localStorage.setItem(ATLAS_AUTH_KEY, JSON.stringify(sessionData));
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
      // Portuguese
      const greeting = `Olá ${client},`;
      if (status === 'Confirmée') {
        msg = `${greeting} temos o prazer de confirmar o seu agendamento / pedido de orçamento para o projeto (${service}) previsto para ${dateStr || ''}. Equipa Atlas Horizon.`;
      } else if (status === 'Refusée') {
        msg = `${greeting} relativamente ao seu pedido para o projeto (${service}), lamentavelmente não poderemos aceitar para esta data. Equipa Atlas Horizon.`;
      } else {
        msg = `${greeting} recebemos o seu pedido de consulta para o projeto (${service}) na Atlas Horizon. Entraremos em contacto brevemente.`;
      }
    } else if (targetLang === 'en') {
      // English
      const greeting = `Hello ${client},`;
      if (status === 'Confirmée') {
        msg = `${greeting} we are pleased to confirm your appointment / quote request for project (${service}) scheduled for ${dateStr || ''}. Atlas Horizon Team.`;
      } else if (status === 'Refusée') {
        msg = `${greeting} regarding your request for project (${service}), unfortunately we cannot accommodate this date. Atlas Horizon Team.`;
      } else {
        msg = `${greeting} we have received your consultation request for project (${service}) at Atlas Horizon. We will get back to you shortly.`;
      }
    } else {
      // French (default)
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

  // Multi-Language Email Mailto Generator Helper
  generateEmailLink(email, clientName, service, status, dateStr, lang = 'fr') {
    const client = clientName || '';
    const targetLang = (lang || 'fr').toLowerCase();
    let subject = '';
    let body = '';

    if (targetLang === 'pt') {
      // Portuguese
      subject = `ATLAS HORIZON — O seu agendamento / orçamento (${service})`;
      body = `Olá ${client},\n\nEm seguimento do seu pedido para o projeto ${service} (Data pretendida: ${dateStr || 'Não especificada'}).\n\nEstado atual: ${status}\n\nCom os melhores cumprimentos,\n\nEquipa Atlas Horizon Construction & Architecture\nTEL: +351 926 930 272 | +351 937 131 260\nEmail: contact@atlashorizon.eu`;
    } else if (targetLang === 'en') {
      // English
      subject = `ATLAS HORIZON — Your appointment / quote request (${service})`;
      body = `Hello ${client},\n\nFollowing up on your request for project ${service} (Requested Date: ${dateStr || 'Not specified'}).\n\nCurrent Status: ${status}\n\nBest regards,\n\nAtlas Horizon Construction & Architecture Team\nTEL: +351 926 930 272 | +351 937 131 260\nEmail: contact@atlashorizon.eu`;
    } else {
      // French (default)
      subject = `ATLAS HORIZON — Votre réservation / devis (${service})`;
      body = `Bonjour ${client},\n\nNous faisons suite à votre demande pour le projet ${service} (Date souhaitée: ${dateStr || 'Non spécifiée'}).\n\nStatut actuel: ${status}\n\nCordialement,\n\nL'équipe Atlas Horizon Construction & Architecture\nTEL: +351 926 930 272 | +351 937 131 260\nEmail: contact@atlashorizon.eu`;
    }

    return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
};

// Initial sync on load
ReservationStore.fetchFromDatabase();

// Make available globally
window.ReservationStore = ReservationStore;
