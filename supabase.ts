import { createClient } from '@supabase/supabase-js';
import { Specialist, Service, Booking, Transaction } from './src/types';
import { INITIAL_SPECIALISTS, INITIAL_SERVICES, INITIAL_BOOKINGS, INITIAL_TRANSACTIONS } from './src/data';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

let supabaseClient: any = null;
if (isSupabaseConfigured) {
  try {
    supabaseClient = createClient(supabaseUrl!, supabaseAnonKey!);
    console.log('Supabase client initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
  }
}

// In-Memory Fallbacks (always active if Supabase client fails/not defined)
let specialistsMem: Specialist[] = [...INITIAL_SPECIALISTS];
let servicesMem: Service[] = [...INITIAL_SERVICES];
let bookingsMem: Booking[] = [...INITIAL_BOOKINGS];
let transactionsMem: Transaction[] = [...INITIAL_TRANSACTIONS];

// Dynamic seeding if tables exist
export async function seedInitialData() {
  if (!supabaseClient) return;
  try {
    const { data: servs, error: servError } = await supabaseClient.from('services').select('id').limit(1);
    if (!servError && (!servs || servs.length === 0)) {
      await supabaseClient.from('services').insert(INITIAL_SERVICES);
    }

    const { data: specs, error: specError } = await supabaseClient.from('specialists').select('id').limit(1);
    if (!specError && (!specs || specs.length === 0)) {
      await supabaseClient.from('specialists').insert(INITIAL_SPECIALISTS);
    }

    const { data: books, error: bookError } = await supabaseClient.from('bookings').select('id').limit(1);
    if (!bookError && (!books || books.length === 0)) {
      await supabaseClient.from('bookings').insert(INITIAL_BOOKINGS);
    }

    const { data: trans, error: transError } = await supabaseClient.from('transactions').select('id').limit(1);
    if (!transError && (!trans || trans.length === 0)) {
      await supabaseClient.from('transactions').insert(INITIAL_TRANSACTIONS);
    }
  } catch (e) {
    console.log('Warning: Seeding skip, probably tables are not created on database yet.', e);
  }
}

if (supabaseClient) {
  seedInitialData();
}

// Define operational DB methods:

// 1. SERVICES
export async function getServices(): Promise<Service[]> {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('services').select('*');
      if (!error && data) return data as Service[];
      console.warn('Supabase service fetch failed, falling back to memory:', error);
    } catch (e) {
      console.warn('Supabase service error:', e);
    }
  }
  return servicesMem;
}

export async function upsertService(service: Service): Promise<Service> {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('services').upsert(service).select().single();
      if (!error && data) return data as Service;
      console.warn('Supabase service upsert failed, falling back to memory:', error);
    } catch (e) {
      console.warn('Supabase service upsert error:', e);
    }
  }
  const idx = servicesMem.findIndex(s => s.id === service.id);
  if (idx >= 0) {
    servicesMem[idx] = service;
  } else {
    servicesMem.push(service);
  }
  return service;
}

export async function deleteService(id: string): Promise<boolean> {
  if (supabaseClient) {
    try {
      const { error } = await supabaseClient.from('services').delete().eq('id', id);
      if (!error) return true;
      console.warn('Supabase service delete failed, falling back to memory:', error);
    } catch (e) {
      console.warn('Supabase service delete error:', e);
    }
  }
  servicesMem = servicesMem.filter(s => s.id !== id);
  return true;
}

// 2. SPECIALISTS
export async function getSpecialists(): Promise<Specialist[]> {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('specialists').select('*');
      if (!error && data) return data as Specialist[];
      console.warn('Supabase specialist fetch failed, falling back to memory:', error);
    } catch (e) {
      console.warn('Supabase specialist error:', e);
    }
  }
  return specialistsMem;
}

export async function upsertSpecialist(specialist: Specialist): Promise<Specialist> {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('specialists').upsert(specialist).select().single();
      if (!error && data) return data as Specialist;
      console.warn('Supabase specialist upsert failed, falling back to memory:', error);
    } catch (e) {
      console.warn('Supabase specialist upsert error:', e);
    }
  }
  const idx = specialistsMem.findIndex(s => s.id === specialist.id);
  if (idx >= 0) {
    specialistsMem[idx] = specialist;
  } else {
    specialistsMem.push(specialist);
  }
  return specialist;
}

export async function getSpecialistByUsername(username: string): Promise<Specialist | null> {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('specialists')
        .select('*')
        .eq('username', username)
        .limit(1);
      if (!error && data && data.length > 0) return data[0] as Specialist;
    } catch (e) {
      console.warn('Supabase specialist-by-username error:', e);
    }
  }
  return specialistsMem.find(s => s.username === username) || null;
}

export async function deleteSpecialist(id: string): Promise<boolean> {
  if (supabaseClient) {
    try {
      const { error } = await supabaseClient.from('specialists').delete().eq('id', id);
      if (!error) return true;
      console.warn('Supabase specialist delete failed, falling back to memory:', error);
    } catch (e) {
      console.warn('Supabase specialist delete error:', e);
    }
  }
  specialistsMem = specialistsMem.filter(s => s.id !== id);
  return true;
}

// 3. BOOKINGS
export async function getBookings(): Promise<Booking[]> {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('bookings').select('*').order('createdAt', { ascending: false });
      if (!error && data) return data as Booking[];
      console.warn('Supabase booking fetch failed, falling back to memory:', error);
    } catch (e) {
      console.warn('Supabase booking error:', e);
    }
  }
  return bookingsMem;
}

export async function insertBooking(booking: Booking): Promise<Booking> {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('bookings').insert(booking).select().single();
      if (!error && data) return data as Booking;
      console.warn('Supabase booking insert failed, falling back to memory:', error);
    } catch (e) {
      console.warn('Supabase booking insert error:', e);
    }
  }
  bookingsMem.push(booking);
  return booking;
}

export async function updateBookingStatus(id: string, status: 'confirmado' | 'cancelado' | 'finalizado'): Promise<Booking | null> {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('bookings').update({ status }).eq('id', id).select().single();
      if (!error && data) return data as Booking;
      console.warn('Supabase booking status update failed, falling back to memory:', error);
    } catch (e) {
      console.warn('Supabase booking status update error:', e);
    }
  }
  const b = bookingsMem.find(x => x.id === id);
  if (b) {
    b.status = status;
    return b;
  }
  return null;
}

// 4. TRANSACTIONS
export async function getTransactions(): Promise<Transaction[]> {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('transactions').select('*').order('date', { ascending: false });
      if (!error && data) return data as Transaction[];
      console.warn('Supabase transactions fetch failed, falling back to memory:', error);
    } catch (e) {
      console.warn('Supabase transactions error:', e);
    }
  }
  return transactionsMem;
}

export async function insertTransaction(transaction: Transaction): Promise<Transaction> {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('transactions').insert(transaction).select().single();
      if (!error && data) return data as Transaction;
      console.warn('Supabase transaction insert failed, falling back to memory:', error);
    } catch (e) {
      console.warn('Supabase transaction insert error:', e);
    }
  }
  transactionsMem.unshift(transaction);
  return transaction;
}
