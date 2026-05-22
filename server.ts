import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { Specialist, Service, Booking, Transaction } from './src/types';
import {
  isSupabaseConfigured,
  getServices,
  upsertService,
  deleteService,
  getSpecialists,
  upsertSpecialist,
  deleteSpecialist,
  getBookings,
  insertBooking,
  updateBookingStatus,
  getTransactions,
  insertTransaction
} from './supabase';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes:

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

  app.post('/api/services', async (req, res) => {
    const newService: Service = req.body;
    if (!newService.id) {
      newService.id = 'service-' + Date.now();
    }
    const saved = await upsertService(newService);
    res.json(saved);
  });

  app.delete('/api/services/:id', async (req, res) => {
    const id = req.params.id;
    await deleteService(id);
    res.json({ success: true, id });
  });

  // 2. SPECIALISTS
  app.get('/api/specialists', async (req, res) => {
    const specialists = await getSpecialists();
    res.json(specialists);
  });

  app.post('/api/specialists', async (req, res) => {
    const spec: Specialist = req.body;
    if (!spec.id) {
      spec.id = 'spec-' + Date.now();
    }
    const saved = await upsertSpecialist(spec);
    res.json(saved);
  });

  app.delete('/api/specialists/:id', async (req, res) => {
    const id = req.params.id;
    await deleteSpecialist(id);
    res.json({ success: true, id });
  });

  // 3. BOOKINGS
  app.get('/api/bookings', async (req, res) => {
    const bookings = await getBookings();
    res.json(bookings);
  });

  app.post('/api/bookings', async (req, res) => {
    const booking: Booking = req.body;
    if (!booking.id) {
      booking.id = 'book-' + Date.now();
    }
    booking.createdAt = new Date().toISOString();
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

  app.patch('/api/bookings/:id/status', async (req, res) => {
    const id = req.params.id;
    const { status } = req.body;
    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === id);

    if (booking) {
      const oldStatus = booking.status;
      const updated = await updateBookingStatus(id, status);

      // If status changed from pending -> confirmed, we record an incoming transaction
      if (oldStatus !== 'confirmado' && status === 'confirmado') {
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
      res.json(updated || booking);
    } else {
      res.status(404).json({ error: 'Agendamento não encontrado' });
    }
  });

  // 4. TRANSACTIONS
  app.get('/api/transactions', async (req, res) => {
    const transactions = await getTransactions();
    res.json(transactions);
  });

  app.post('/api/transactions', async (req, res) => {
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
