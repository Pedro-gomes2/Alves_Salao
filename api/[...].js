import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';

// Supabase client - conecta ao banco real!
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let supabaseClient = null;
if (supabaseUrl && supabaseKey) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase conectado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao conectar Supabase:', error);
  }
}

// Fallback in-memory se Supabase falhar
const memDb = {
  specialists: [
    { id: 'spec-1', name: 'Admin', username: 'admin', passwordHash: '', active: true, roleType: 'admin', attendanceCount: 0, weeklySchedule: null, specialty: 'Administrador' },
    { id: 'spec-2', name: 'Lorena', username: 'lorena', passwordHash: '', active: true, roleType: 'professional', attendanceCount: 0, weeklySchedule: null, specialty: 'Cabelo' },
    { id: 'spec-3', name: 'Kathy', username: 'kathy', passwordHash: '', active: true, roleType: 'professional', attendanceCount: 0, weeklySchedule: null, specialty: 'Unhas' },
    { id: 'spec-4', name: 'Laila', username: 'laila', passwordHash: '', active: true, roleType: 'professional', attendanceCount: 0, weeklySchedule: null, specialty: 'Cabelo' },
    { id: 'spec-5', name: 'Karol', username: 'karol', passwordHash: '', active: true, roleType: 'professional', attendanceCount: 0, weeklySchedule: null, specialty: 'Unhas' },
    { id: 'spec-6', name: 'Juliana', username: 'juliana', passwordHash: '', active: true, roleType: 'professional', attendanceCount: 0, weeklySchedule: null, specialty: 'Estética' }
  ],
  services: [],
  bookings: [],
  transactions: [],
  clients: []
};

async function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function generateToken(user) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(JSON.stringify({ ...user, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 43200 })).toString('base64');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `${header}.${payload}.${signature}`;
}

function verifyToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${parts[0]}.${parts[1]}`).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    if (signature !== parts[2]) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

async function getSpecialists() {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('specialists').select('*');
      if (!error && data) return data;
    } catch (e) {
      console.warn('Supabase error:', e);
    }
  }
  return memDb.specialists;
}

async function getSpecialistByUsername(username) {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('specialists').select('*').eq('username', username).limit(1);
      if (!error && data && data.length > 0) return data[0];
    } catch (e) {
      console.warn('Supabase error:', e);
    }
  }
  return memDb.specialists.find(s => s.username === username) || null;
}

async function getServices() {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('services').select('*');
      if (!error && data) return data;
    } catch (e) {
      console.warn('Supabase error:', e);
    }
  }
  return memDb.services;
}

async function upsertService(service) {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('services').upsert(service).select().single();
      if (!error && data) return data;
    } catch (e) {
      console.warn('Supabase error:', e);
    }
  }
  const idx = memDb.services.findIndex(s => s.id === service.id);
  idx >= 0 ? memDb.services[idx] = service : memDb.services.push(service);
  return service;
}

async function getBookings() {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('bookings').select('*').order('createdAt', { ascending: false });
      if (!error && data) return data;
    } catch (e) {
      console.warn('Supabase error:', e);
    }
  }
  return memDb.bookings;
}

async function insertBooking(booking) {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('bookings').insert(booking).select().single();
      if (!error && data) return data;
    } catch (e) {
      console.warn('Supabase error:', e);
    }
  }
  memDb.bookings.push(booking);
  return booking;
}

async function getTransactions() {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('transactions').select('*').order('date', { ascending: false });
      if (!error && data) return data;
    } catch (e) {
      console.warn('Supabase error:', e);
    }
  }
  return memDb.transactions;
}

async function insertTransaction(transaction) {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('transactions').insert(transaction).select().single();
      if (!error && data) return data;
    } catch (e) {
      console.warn('Supabase error:', e);
    }
  }
  memDb.transactions.push(transaction);
  return transaction;
}

async function getClients() {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('clients').select('*');
      if (!error && data) return data;
    } catch (e) {
      console.warn('Supabase error:', e);
    }
  }
  return memDb.clients;
}

async function insertClient(client) {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('clients').insert(client).select().single();
      if (!error && data) return data;
    } catch (e) {
      console.warn('Supabase error:', e);
    }
  }
  memDb.clients.push(client);
  return client;
}

export default async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const method = req.method;
  const path = req.url.split('?')[0];
  const body = await parseBody(req);
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const authUser = token ? verifyToken(token) : null;

  try {
    if (path === '/api/auth/login' && method === 'POST') {
      const { username, password } = body;
      if (!username || !password) return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
      const specialist = await getSpecialistByUsername(username.toLowerCase());
      if (!specialist || !specialist.active) return res.status(401).json({ error: 'Credenciais inválidas' });
      if (password !== 'alves2026') return res.status(401).json({ error: 'Credenciais inválidas' });
      const user = { id: specialist.id, name: specialist.name, username: specialist.username, roleType: specialist.roleType };
      return res.json({ token: generateToken(user), user });
    }

    if (path === '/api/auth/me' && method === 'GET') {
      if (!authUser) return res.status(401).json({ error: 'Não autenticado' });
      return res.json({ user: authUser });
    }

    if (path === '/api/db-status' && method === 'GET') {
      return res.json({ configured: !!supabaseClient, mode: supabaseClient ? 'supabase' : 'local_memory' });
    }

    if (path === '/api/services' && method === 'GET') {
      return res.json(await getServices());
    }

    if (path === '/api/services' && method === 'POST') {
      if (!authUser || authUser.roleType !== 'admin') return res.status(403).json({ error: 'Acesso restrito' });
      const service = { ...body, id: body.id || 'service-' + Date.now() };
      return res.json(await upsertService(service));
    }

    if (path === '/api/specialists' && method === 'GET') {
      const specs = await getSpecialists();
      return res.json(specs.map(s => { const { passwordHash, ...rest } = s; return rest; }));
    }

    if (path === '/api/specialists' && method === 'POST') {
      if (!authUser || authUser.roleType !== 'admin') return res.status(403).json({ error: 'Acesso restrito' });
      const specialist = { ...body, id: body.id || 'spec-' + Date.now(), passwordHash: body.passwordHash || '' };
      if (supabaseClient) {
        try {
          const { data, error } = await supabaseClient.from('specialists').upsert(specialist).select().single();
          if (!error && data) { const { passwordHash, ...safe } = data; return res.json(safe); }
        } catch (e) { console.warn('Supabase error:', e); }
      }
      memDb.specialists.push(specialist);
      const { passwordHash, ...safe } = specialist;
      return res.json(safe);
    }

    if (path === '/api/bookings' && method === 'GET') {
      const bookings = await getBookings();
      if (authUser?.roleType === 'professional') return res.json(bookings.filter(b => b.specialistId === authUser.id));
      return res.json(bookings);
    }

    if (path === '/api/bookings' && method === 'POST') {
      const booking = { ...body, id: body.id || 'book-' + Date.now(), createdAt: new Date().toISOString() };
      return res.json(await insertBooking(booking));
    }

    if (path === '/api/transactions' && method === 'GET') {
      if (!authUser) return res.status(401).json({ error: 'Não autenticado' });
      const transactions = await getTransactions();
      if (authUser.roleType === 'professional') return res.json(transactions.filter(t => t.specialistId === authUser.id));
      return res.json(transactions);
    }

    if (path === '/api/transactions' && method === 'POST') {
      if (!authUser || authUser.roleType !== 'admin') return res.status(403).json({ error: 'Acesso restrito' });
      const transaction = { ...body, id: body.id || 'trans-' + Date.now() };
      return res.json(await insertTransaction(transaction));
    }

    if (path === '/api/clients' && method === 'GET') {
      if (!authUser || authUser.roleType !== 'admin') return res.status(403).json({ error: 'Acesso restrito' });
      return res.json(await getClients());
    }

    if (path === '/api/clients' && method === 'POST') {
      if (!authUser) return res.status(401).json({ error: 'Não autenticado' });
      const client = { ...body, id: body.id || 'client-' + Date.now(), professionalId: authUser.id };
      return res.json(await insertClient(client));
    }

    return res.status(404).json({ error: 'Not Found' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};
