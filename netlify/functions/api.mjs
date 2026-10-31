import { getStore } from '@netlify/blobs';

const STORE_NAME = 'atlas-horizon-reservations';
const DEFAULT_USERS = [
  'contact@atlashorizon.eu',
  'admin@atlashorizon.com',
  'admin',
  'yassminemezgour@gmail.com',
  'admin atlas horizon'
];
const DEFAULT_PASSWORDS = ['moha@jas2089', 'admin123'];

function store() {
  return getStore({ name: STORE_NAME, consistency: 'strong' });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

function formatNow() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function today() {
  return formatNow().substring(0, 10);
}

function nextId(list) {
  const year = new Date().getFullYear();
  let maxNum = 0;
  for (const r of list) {
    if (!r || !r.id) continue;
    const parts = String(r.id).split('-');
    const last = parseInt(parts[parts.length - 1], 10);
    if (!Number.isNaN(last) && last > maxNum) maxNum = last;
  }
  return `RES-${year}-${String(maxNum + 1).padStart(3, '0')}`;
}

async function listReservations() {
  const s = store();
  const { blobs } = await s.list();
  const records = await Promise.all(
    blobs.map(async (blob) => {
      try {
        return await s.get(blob.key, { type: 'json' });
      } catch (e) {
        return null;
      }
    })
  );
  return records
    .filter(Boolean)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

function normalizeRecord(id, payload, existing) {
  return {
    id,
    clientName: payload.clientName || existing?.clientName || 'Client Horizon',
    email: payload.email || existing?.email || '',
    phone: payload.phone || existing?.phone || '',
    service: payload.service || existing?.service || 'General Construction',
    desiredDate: payload.desiredDate || existing?.desiredDate || today(),
    desiredTime: payload.desiredTime || existing?.desiredTime || '10:00',
    location: payload.location || existing?.location || 'Portugal / Belgium',
    area: payload.area || existing?.area || 'N/A',
    message: payload.message || existing?.message || '',
    status: payload.status || existing?.status || 'En attente',
    createdAt: existing?.createdAt || payload.createdAt || formatNow(),
    notes: existing?.notes || payload.notes || '',
    lang: payload.lang || existing?.lang || 'fr'
  };
}

async function handleLogin(req) {
  const body = await req.json().catch(() => ({}));
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');

  const users = (process.env.ADMIN_USERS || DEFAULT_USERS.join(','))
    .split(',')
    .map((u) => u.trim().toLowerCase())
    .filter(Boolean);
  const passwords = (process.env.ADMIN_PASSWORDS || DEFAULT_PASSWORDS.join(','))
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  if (users.includes(username) && passwords.includes(password)) {
    return json({
      success: true,
      username: 'Admin Atlas Horizon',
      email: username.includes('@') ? username : 'contact@atlashorizon.eu',
      token: 'ATLAS_TOKEN_' + crypto.randomUUID()
    });
  }

  return json({ success: false, message: 'Identifiants invalides.' }, 401);
}

async function handleReservations(req, id) {
  const method = req.method.toUpperCase();
  const s = store();

  if (method === 'GET' && !id) {
    return json(await listReservations());
  }

  if (method === 'POST' && !id) {
    const body = await req.json().catch(() => ({}));
    const list = await listReservations();

    let newId = String(body.id || '').trim();
    if (newId) {
      const existing = await s.get(newId, { type: 'json' });
      if (existing) return json(existing);
    } else {
      newId = nextId(list);
    }

    while (await s.get(newId, { type: 'json' })) {
      newId = nextId([...list, { id: newId }]);
    }

    const record = normalizeRecord(newId, body);
    await s.setJSON(newId, record);
    return json(record, 201);
  }

  if (method === 'PUT' && id) {
    const body = await req.json().catch(() => ({}));
    const existing = await s.get(id, { type: 'json' });
    if (!existing) return json({ error: 'Reservation not found' }, 404);

    const updated = { ...existing };
    if (body.status) updated.status = body.status;
    if (body.note && String(body.note).trim() !== '') {
      const line = `[${today()}] ${String(body.note).trim()}`;
      updated.notes = updated.notes ? `${updated.notes}\n\n${line}` : line;
    }

    await s.setJSON(id, updated);
    return json({ success: true, id, status: updated.status, notes: updated.notes });
  }

  if (method === 'DELETE' && id) {
    await s.delete(id);
    return json({ success: true, deleted: id });
  }

  return json({ error: 'Endpoint not found' }, 404);
}

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  const path = new URL(req.url).pathname.replace(/\/+$/, '');

  if (path === '/api/login') {
    return handleLogin(req);
  }

  if (path === '/api/reservations') {
    return handleReservations(req, null);
  }

  if (path.startsWith('/api/reservations/')) {
    const id = decodeURIComponent(path.slice('/api/reservations/'.length));
    return handleReservations(req, id);
  }

  return json({ error: 'Endpoint not found' }, 404);
};

export const config = {
  path: ['/api/login', '/api/reservations', '/api/reservations/*']
};
