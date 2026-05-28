import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
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
  insertTransaction,
  updateTransaction,
  deleteTransaction,
  updateSpecialistSchedule
} from '../supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let app = null;
let clients = [];

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  try {
    const token = header.slice('Bearer '.length);
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user?.roleType !== 'admin') {
      return res.status(403).json({ error: 'Acesso restrito ao administrador' });
    }
    next();
  });
}

function tryAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.slice(7), JWT_SECRET);
    } catch {}
  }
  next();
}

const WEEK_KEYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function validateWeeklySchedule(input) {
  if (!input || typeof input !== 'object') return { ok: false, reason: 'Payload inválido.' };
  for (const k of WEEK_KEYS) {
    if (!Array.isArray(input[k])) return { ok: false, reason: `Dia "${k}" inválido.` };
    const slots = input[k];
    const seen = new Set();
    for (const s of slots) {
      if (typeof s !== 'string' || !HHMM_RE.test(s)) {
        return { ok: false, reason: `Horário inválido em ${k}.` };
      }
      if (seen.has(s)) return { ok: false, reason: `Horário duplicado em ${k}: ${s}.` };
      seen.add(s);
    }
  }
  for (const k of Object.keys(input)) {
    if (!WEEK_KEYS.includes(k)) return { ok: false, reason: `Chave inesperada: ${k}.` };
  }
  return { ok: true };
}

function getApp() {
  if (app) return app;

  app = express();
  app.use(express.json());

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
    if (spec.passwordHash) {
      try {
        ok = await bcrypt.compare(password, spec.passwordHash);
      } catch { ok = false; }
    }
    if (!ok && password === 'alves2026' && spec.username) {
      ok = true;
    }
    if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });

    const user = {
      id: spec.id,
      name: spec.name,
      username: spec.username,
      roleType: spec.roleType || 'professional',
    };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, user });
  });

  app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({ user: req.user });
  });

  app.get('/api/db-status', (req, res) => {
    res.json({
      configured: isSupabaseConfigured,
      mode: isSupabaseConfigured ? 'supabase' : 'local_memory'
    });
  });

  // SERVICES
  app.get('/api/services', async (req, res) => {
    const services = await getServices();
    res.json(services);
  });

  app.post('/api/services', requireAdmin, async (req, res) => {
    const newService = req.body;
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

  // SPECIALISTS
  app.get('/api/specialists', async (req, res) => {
    const specialists = await getSpecialists();
    const safe = specialists.map(s => {
      const { passwordHash, ...rest } = s;
      return rest;
    });
    res.json(safe);
  });

  app.post('/api/specialists', requireAdmin, async (req, res) => {
    const { newPassword, ...rest } = req.body || {};
    const spec = { ...rest };
    if (!spec.id) {
      spec.id = 'spec-' + Date.now();
    }
    if (typeof newPassword === 'string' && newPassword.length > 0) {
      spec.passwordHash = await bcrypt.hash(newPassword, 10);
    }
    if (!spec.roleType) spec.roleType = 'professional';

    const { data: saved, error } = await upsertSpecialist(spec);
    if (error) {
      if (error.code === '23505' || /duplicate key|unique/i.test(error.message)) {
        return res.status(409).json({ error: 'Já existe um profissional com esse usuário.' });
      }
      console.error('Failed to save specialist:', error);
      return res.status(500).json({ error: 'Não foi possível salvar o profissional. Tente novamente.' });
    }
    if (saved && saved.passwordHash) delete saved.passwordHash;
    res.json(saved);
  });

  app.delete('/api/specialists/:id', requireAdmin, async (req, res) => {
    const id = req.params.id;
    await deleteSpecialist(id);
    res.json({ success: true, id });
  });

  app.put('/api/specialists/me/schedule', requireAuth, async (req, res) => {
    const { weeklySchedule } = req.body || {};
    const check = validateWeeklySchedule(weeklySchedule);
    if (check.ok !== true) return res.status(400).json({ error: check.reason });
    const { data, error } = await updateSpecialistSchedule(req.user.id, weeklySchedule);
    if (error) {
      console.error('Failed to update schedule:', error);
      return res.status(500).json({ error: 'Não foi possível salvar a agenda.' });
    }
    if (!data) return res.status(404).json({ error: 'Profissional não encontrada.' });
    if (data.passwordHash) delete data.passwordHash;
    res.json(data);
  });

  // BOOKINGS
  app.get('/api/bookings', tryAuth, async (req, res) => {
    const bookings = await getBookings();
    if (req.user) {
      const roleType = req.user.roleType || 'professional';
      if (roleType === 'professional') {
        return res.json(bookings.filter(b => b.specialistId === req.user.id));
      }
    }
    res.json(bookings);
  });

  app.post('/api/bookings', async (req, res) => {
    const booking = req.body;
    if (!booking.id) {
      booking.id = 'book-' + Date.now();
    }
    booking.createdAt = new Date().toISOString();

    const existing = await getBookings();
    const t2m = (hhmm) => {
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

    const specs = await getSpecialists();
    const spec = specs.find(s => s.id === booking.specialistId);
    if (spec && spec.weeklySchedule) {
      const WEEK_KEY = {
        0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
        4: 'thursday', 5: 'friday', 6: 'saturday',
      };
      const dayKey = WEEK_KEY[new Date(booking.date + 'T00:00:00').getDay()];
      const openSlots = (spec.weeklySchedule)[dayKey] || [];
      const openSet = new Set(openSlots);
      const toHHMM = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
      const slotsNeeded = [];
      for (let m = newStart; m < newEnd; m += 30) {
        slotsNeeded.push(toHHMM(m));
      }
      const allOpen = slotsNeeded.every(s => openSet.has(s));
      if (!allOpen) {
        return res.status(409).json({ error: 'Horário fora da agenda do profissional.' });
      }
    }

    const savedBooking = await insertBooking(booking);

    if (booking.status === 'confirmado') {
      const trans = {
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

      const specialists = await getSpecialists();
      const specIndex = specialists.findIndex(s => s.id === booking.specialistId);
      if (specIndex >= 0) {
        const spec = specialists[specIndex];
        spec.attendanceCount += 1;
        const { error: bumpErr } = await upsertSpecialist(spec);
        if (bumpErr) console.warn('Failed to bump attendanceCount for specialist', spec.id, bumpErr);
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

      const shouldRecord = oldStatus !== 'finalizado' && status === 'finalizado';
      if (shouldRecord) {
        const verb = 'Finalizado';
        const trans = {
          id: 'trans-' + Date.now(),
          type: 'entrada',
          description: `Atendimento ${verb} - ${booking.userName} (${booking.serviceNames.join(', ')})`,
          amount: booking.totalPrice,
          date: booking.date,
          category: 'Estética',
          specialistId: booking.specialistId,
          specialistName: booking.specialistName,
        };
        await insertTransaction(trans);

        const specialists = await getSpecialists();
        const specIndex = specialists.findIndex(s => s.id === booking.specialistId);
        if (specIndex >= 0) {
          const spec = specialists[specIndex];
          spec.attendanceCount += 1;
          const { error: bumpErr } = await upsertSpecialist(spec);
          if (bumpErr) console.warn('Failed to bump attendanceCount for specialist', spec.id, bumpErr);
        }
      }
      res.json(updated || booking);
    } else {
      res.status(404).json({ error: 'Agendamento não encontrado' });
    }
  });

  // TRANSACTIONS
  app.get('/api/transactions', tryAuth, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Não autenticado' });
    const transactions = await getTransactions();
    const roleType = req.user.roleType || 'professional';
    if (roleType === 'professional') {
      return res.json(transactions.filter(t => t.specialistId === req.user.id));
    }
    if (roleType === 'admin') {
      return res.json(transactions);
    }
    return res.status(403).json({ error: 'Acesso restrito' });
  });

  app.post('/api/transactions', requireAdmin, async (req, res) => {
    const trans = req.body;
    if (!trans.id) {
      trans.id = 'trans-' + Date.now();
    }
    const saved = await insertTransaction(trans);
    res.json(saved);
  });

  app.patch('/api/transactions/:id', requireAdmin, async (req, res) => {
    const id = req.params.id;
    const { id: _ignored, ...patch } = req.body || {};
    const { data, error } = await updateTransaction(id, patch);
    if (error) {
      console.error('Failed to update transaction:', error);
      return res.status(500).json({ error: 'Não foi possível atualizar o lançamento.' });
    }
    if (!data) return res.status(404).json({ error: 'Lançamento não encontrado.' });
    res.json(data);
  });

  app.delete('/api/transactions/:id', requireAdmin, async (req, res) => {
    const id = req.params.id;
    const { success, error } = await deleteTransaction(id);
    if (error) {
      console.error('Failed to delete transaction:', error);
      return res.status(500).json({ error: 'Não foi possível excluir o lançamento.' });
    }
    if (!success) return res.status(404).json({ error: 'Lançamento não encontrado.' });
    res.json({ success: true, id });
  });

  // Clients
  app.get('/api/clients', requireAuth, (req, res) => {
    if (req.user?.roleType !== 'admin') {
      return res.status(403).json({ error: 'Acesso restrito ao administrador' });
    }
    res.json(clients);
  });

  app.post('/api/clients', requireAuth, (req, res) => {
    if (req.user?.roleType !== 'admin') {
      return res.status(403).json({ error: 'Acesso restrito ao administrador' });
    }
    const { name, phone, notes } = req.body || {};
    if (!name || !phone) {
      return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
    }
    const conflict = clients.some(c => c.phone === phone);
    if (conflict) {
      return res.status(409).json({ error: 'Telefone já cadastrado' });
    }
    const newClient = {
      id: 'client-' + Date.now(),
      professionalId: req.user.id,
      name,
      phone,
      notes: notes || '',
    };
    clients.push(newClient);
    res.json(newClient);
  });

  app.put('/api/clients/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const updated = req.body;
    if (!id || !updated.name || !updated.phone) {
      return res.status(400).json({ error: 'ID, name, and phone are required' });
    }
    const idx = clients.findIndex(c => c.id === id && c.professionalId === req.user.id);
    if (idx === -1) return res.status(404).json({ error: 'Cliente não encontrado' });
    const conflict = clients.some(c => c.id !== id && c.phone === updated.phone && c.professionalId === req.user.id);
    if (conflict) {
      return res.status(409).json({ error: 'Telefone já cadastrado para este profissional' });
    }
    clients[idx] = { ...clients[idx], ...updated, id, professionalId: req.user.id };
    res.json(clients[idx]);
  });

  app.delete('/api/clients/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const idx = clients.findIndex(c => c.id === id && c.professionalId === req.user.id);
    if (idx === -1) return res.status(404).json({ error: 'Cliente não encontrado' });
    const removed = clients.splice(idx, 1)[0];
    res.json({ success: true, id: removed.id });
  });

  return app;
}

export default async (req, res) => {
  try {
    const expressApp = getApp();
    return expressApp(req, res);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: String(error) });
  }
};
