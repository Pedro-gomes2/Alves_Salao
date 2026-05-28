import 'dotenv/config';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';

// In-memory database fallback
const memDb = {
  specialists: [
    {
      id: 'spec-1',
      name: 'Admin',
      username: 'admin',
      passwordHash: '$2a$10$N9qo8uLOickgx2ZMRZoMyeiKoHKUjW.3lLQUyKGQn3YjLBT8rEfhC', // alves2026
      active: true,
      roleType: 'admin',
      attendanceCount: 0,
      weeklySchedule: null
    }
  ],
  services: [],
  bookings: [],
  transactions: [],
  clients: []
};

// Parse JSON body
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

// Generate JWT token
function generateToken(user) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(JSON.stringify({
    ...user,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 43200 // 12 hours
  })).toString('base64');

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${header}.${payload}.${signature}`;
}

// Verify JWT token
function verifyToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const signature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${parts[0]}.${parts[1]}`)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    if (signature !== parts[2]) return null;

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

export default async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  const method = req.method;
  const path = req.url.split('?')[0];
  const body = await parseBody(req);

  // Get auth user
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const authUser = token ? verifyToken(token) : null;

  try {
    // === AUTH ROUTES ===
    if (path === '/api/auth/login' && method === 'POST') {
      const { username, password } = body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
      }

      const specialist = memDb.specialists.find(s => s.username === username.toLowerCase());
      if (!specialist || !specialist.active) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      // Simple password check (in production, use bcrypt)
      const isValidPassword = password === 'alves2026';
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      const user = {
        id: specialist.id,
        name: specialist.name,
        username: specialist.username,
        roleType: specialist.roleType
      };

      const newToken = generateToken(user);
      return res.json({ token: newToken, user });
    }

    if (path === '/api/auth/me' && method === 'GET') {
      if (!authUser) {
        return res.status(401).json({ error: 'Não autenticado' });
      }
      return res.json({ user: authUser });
    }

    // === STATUS ===
    if (path === '/api/db-status' && method === 'GET') {
      return res.json({
        configured: !!process.env.SUPABASE_URL,
        mode: process.env.SUPABASE_URL ? 'supabase' : 'local_memory'
      });
    }

    // === SERVICES ===
    if (path === '/api/services' && method === 'GET') {
      return res.json(memDb.services);
    }

    if (path === '/api/services' && method === 'POST') {
      if (!authUser || authUser.roleType !== 'admin') {
        return res.status(403).json({ error: 'Acesso restrito' });
      }
      const service = { ...body, id: body.id || 'service-' + Date.now() };
      memDb.services.push(service);
      return res.json(service);
    }

    // === SPECIALISTS ===
    if (path === '/api/specialists' && method === 'GET') {
      const safe = memDb.specialists.map(s => {
        const { passwordHash, ...rest } = s;
        return rest;
      });
      return res.json(safe);
    }

    if (path === '/api/specialists' && method === 'POST') {
      if (!authUser || authUser.roleType !== 'admin') {
        return res.status(403).json({ error: 'Acesso restrito' });
      }
      const specialist = {
        ...body,
        id: body.id || 'spec-' + Date.now(),
        passwordHash: body.passwordHash || ''
      };
      memDb.specialists.push(specialist);
      const { passwordHash, ...safe } = specialist;
      return res.json(safe);
    }

    // === BOOKINGS ===
    if (path === '/api/bookings' && method === 'GET') {
      if (authUser?.roleType === 'professional') {
        return res.json(memDb.bookings.filter(b => b.specialistId === authUser.id));
      }
      return res.json(memDb.bookings);
    }

    if (path === '/api/bookings' && method === 'POST') {
      const booking = {
        ...body,
        id: body.id || 'book-' + Date.now(),
        createdAt: new Date().toISOString()
      };
      memDb.bookings.push(booking);
      return res.json(booking);
    }

    // === TRANSACTIONS ===
    if (path === '/api/transactions' && method === 'GET') {
      if (!authUser) {
        return res.status(401).json({ error: 'Não autenticado' });
      }
      if (authUser.roleType === 'professional') {
        return res.json(memDb.transactions.filter(t => t.specialistId === authUser.id));
      }
      return res.json(memDb.transactions);
    }

    if (path === '/api/transactions' && method === 'POST') {
      if (!authUser || authUser.roleType !== 'admin') {
        return res.status(403).json({ error: 'Acesso restrito' });
      }
      const transaction = { ...body, id: body.id || 'trans-' + Date.now() };
      memDb.transactions.push(transaction);
      return res.json(transaction);
    }

    // === CLIENTS ===
    if (path === '/api/clients' && method === 'GET') {
      if (!authUser || authUser.roleType !== 'admin') {
        return res.status(403).json({ error: 'Acesso restrito' });
      }
      return res.json(memDb.clients);
    }

    if (path === '/api/clients' && method === 'POST') {
      if (!authUser) {
        return res.status(401).json({ error: 'Não autenticado' });
      }
      const client = {
        ...body,
        id: body.id || 'client-' + Date.now(),
        professionalId: authUser.id
      };
      memDb.clients.push(client);
      return res.json(client);
    }

    return res.status(404).json({ error: 'Not Found' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};
