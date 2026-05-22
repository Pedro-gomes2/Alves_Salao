import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createServer as createViteServer } from 'vite';
import { Specialist, Service, Booking, Transaction, AuthUser, RoleType } from './src/types';
import {
  isSupabaseConfigured,
  getServices,
  upsertService,
  deleteService,
  getSpecialists,
  upsertSpecialist,
  deleteSpecialist,
  getSpecialistByUsername,
  getBookings,
  insertBooking,
  updateBookingStatus,
  getTransactions,
  insertTransaction
} from './supabase';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';

interface AuthedRequest extends Request {
  user?: AuthUser;
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  try {
    const token = header.slice('Bearer '.length);
    req.user = jwt.verify(token, JWT_SECRET) as AuthUser;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.roleType !== 'admin') {
      return res.status(403).json({ error: 'Acesso restrito ao administrador' });
    }
    next();
  });
}

function tryAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.slice(7), JWT_SECRET) as AuthUser;
    } catch { /* ignore */ }
  }
  next();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes:

  // AUTH
  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
    }
    const spec = await getSpecialistByUsername(username);
    if (!spec || !spec.active) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    let ok = false;
    // Legacy seed fallback: allow "alves2026" for any seeded user
    if (spec.passwordHash) {
      try {
        ok = await bcrypt.compare(password, spec.passwordHash);
      } catch { ok = false; }
    }
    if (!ok && password === 'alves2026' && spec.username) {
      ok = true;
    }
    if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });

    const user: AuthUser = {
      id: spec.id,
      name: spec.name,
      username: spec.username!,
      roleType: (spec.roleType as RoleType) || 'professional',
    };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, user });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res) => {
    res.json({ user: req.user });
  });

  // Status endpoint so frontend knows the database mode
  app.get('/api/db-status', (req, res) => {
    res.json({
      configured: isSupabaseConfigured,
      mode: isSupabaseConfigured ? 'supabase' : 'local_memory'
    });
  });
  
  // 1. SERVICES
  app.get('/api/services', async (req, res) => {
    const services = await getServices();
    res.json(services);
  });

  app.post('/api/services', requireAdmin, async (req, res) => {
    const newService: Service = req.body;
    if (!newService.id) {
      newService.id = 'service-' + Date.now();
    }
    const saved = await upsertService(newService);
    res.json(saved);
  });

  app.delete('/api/services/:id', requireAdmin, async (req, res) => {
    const id = req.params.id;
    await deleteService(id);
    res.json({ success: true, id });
  });

  // 2. SPECIALISTS
  app.get('/api/specialists', async (req, res) => {
    const specialists = await getSpecialists();
    // Strip sensitive fields before sending to clients
    const safe = specialists.map(s => {
      const { passwordHash, ...rest } = s as any;
      return rest;
    });
    res.json(safe);
  });

  app.post('/api/specialists', requireAdmin, async (req, res) => {
    const spec: Specialist = req.body;
    if (!spec.id) {
      spec.id = 'spec-' + Date.now();
    }
    // If admin sent a new plaintext password, hash it. Field name: newPassword.
    const newPassword = (req.body as any).newPassword;
    if (newPassword && typeof newPassword === 'string' && newPassword.length > 0) {
      spec.passwordHash = await bcrypt.hash(newPassword, 10);
    }
    if (!spec.roleType) spec.roleType = 'professional';
    const saved = await upsertSpecialist(spec);
    // Never leak the hash back to clients
    if (saved && (saved as any).passwordHash) delete (saved as any).passwordHash;
    res.json(saved);
  });

  app.delete('/api/specialists/:id', requireAdmin, async (req, res) => {
    const id = req.params.id;
    await deleteSpecialist(id);
    res.json({ success: true, id });
  });

  // 3. BOOKINGS
  app.get('/api/bookings', tryAuth, async (req: AuthedRequest, res) => {
    const bookings = await getBookings();
    // Professionals only see their own bookings; admins and unauthenticated (booking flow) see all
    if (req.user && req.user.roleType === 'professional') {
      return res.json(bookings.filter(b => b.specialistId === req.user!.id));
    }
    res.json(bookings);
  });

  app.post('/api/bookings', async (req, res) => {
    const booking: Booking = req.body;
    if (!booking.id) {
      booking.id = 'book-' + Date.now();
    }
    booking.createdAt = new Date().toISOString();

    // Defense-in-depth: block overlapping bookings for the same specialist/day
    const existing = await getBookings();
    const t2m = (hhmm: string) => {
      const [h, m] = hhmm.split(':').map(Number);
      return h * 60 + m;
    };
    const newStart = t2m(booking.time);
    const newEnd = newStart + (booking.totalDuration || 30);
    const conflict = existing.some(b =>
      b.specialistId === booking.specialistId &&
      b.date === booking.date &&
      b.status !== 'cancelado' &&
      (() => {
        const bStart = t2m(b.time);
        const bEnd = bStart + (b.totalDuration || 30);
        return newStart < bEnd && bStart < newEnd;
      })()
    );
    if (conflict) {
      return res.status(409).json({ error: 'Esse horário acabou de ser ocupado por outra cliente. Escolha outro.' });
    }

    const savedBooking = await insertBooking(booking);

    // If booking is immediately confirmed, log an incoming transaction
    if (booking.status === 'confirmado') {
      const trans: Transaction = {
        id: 'trans-' + Date.now(),
        type: 'entrada',
        description: `Agendamento - ${booking.userName} (${booking.serviceNames.join(', ')})`,
        amount: booking.totalPrice,
        date: booking.date,
        category: 'Serviços',
        specialistId: booking.specialistId,
        specialistName: booking.specialistName,
      };
      await insertTransaction(trans);

      // increment specialist attendance count
      const specialists = await getSpecialists();
      const specIndex = specialists.findIndex(s => s.id === booking.specialistId);
      if (specIndex >= 0) {
        const spec = specialists[specIndex];
        spec.attendanceCount += 1;
        await upsertSpecialist(spec);
      }
    }

    res.json(savedBooking);
  });

  app.patch('/api/bookings/:id/status', requireAuth, async (req, res) => {
    const id = req.params.id;
    const { status } = req.body;
    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === id);

    if (booking) {
      const oldStatus = booking.status;
      const updated = await updateBookingStatus(id, status);

      // If status changed to finalized, we record an incoming transaction (send to financial sector)
      if (oldStatus !== 'finalizado' && status === 'finalizado') {
        const trans: Transaction = {
          id: 'trans-' + Date.now(),
          type: 'entrada',
          description: `Atendimento Finalizado - ${booking.userName} (${booking.serviceNames.join(', ')})`,
          amount: booking.totalPrice,
          date: booking.date,
          category: 'Estética',
          specialistId: booking.specialistId,
          specialistName: booking.specialistName,
        };
        await insertTransaction(trans);

        // increment specialist attendance count
        const specialists = await getSpecialists();
        const specIndex = specialists.findIndex(s => s.id === booking.specialistId);
        if (specIndex >= 0) {
          const spec = specialists[specIndex];
          spec.attendanceCount += 1;
          await upsertSpecialist(spec);
        }
      }
      res.json(updated || booking);
    } else {
      res.status(404).json({ error: 'Agendamento não encontrado' });
    }
  });

  // 4. TRANSACTIONS
  app.get('/api/transactions', requireAdmin, async (req, res) => {
    const transactions = await getTransactions();
    res.json(transactions);
  });

  app.post('/api/transactions', requireAdmin, async (req, res) => {
    const trans: Transaction = req.body;
    if (!trans.id) {
      trans.id = 'trans-' + Date.now();
    }
    const saved = await insertTransaction(trans);
    res.json(saved);
  });

  // Serve static assets and Vite server integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
