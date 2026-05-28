export type RoleType = 'admin' | 'professional';

export interface Specialist {
  id: string;
  name: string;
  role: string;
  specialty?: string;
  commission: number; // e.g. 35 for 35%
  avatarUrl: string;
  rating: number;
  services: string[]; // array of serviceIds
  active: boolean;
  attendanceCount: number; // mock or tracked number of attendances
  username?: string;
  passwordHash?: string;
  roleType?: RoleType;
  weeklySchedule?: WeeklySchedule;
}

export type TimeRange = { start: string; end: string }; // legacy — kept for backward compatibility
export type WeekDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
// Each day is a list of available HH:mm slots that the professional opens.
export type WeeklySchedule = Record<WeekDay, string[]>;

const DEFAULT_DAY_SLOTS = [
  '09:00','09:30','10:00','10:30','11:00','11:30',
  '13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00',
];

export const DEFAULT_WEEKLY_SCHEDULE: WeeklySchedule = {
  monday:    [...DEFAULT_DAY_SLOTS],
  tuesday:   [...DEFAULT_DAY_SLOTS],
  wednesday: [...DEFAULT_DAY_SLOTS],
  thursday:  [...DEFAULT_DAY_SLOTS],
  friday:    [...DEFAULT_DAY_SLOTS],
  saturday:  [...DEFAULT_DAY_SLOTS],
  sunday:    [],
};

// All possible 30-min slots a UI may offer (06:00–21:00).
export const ALL_POSSIBLE_SLOTS: string[] = (() => {
  const out: string[] = [];
  for (let h = 6; h < 21; h++) {
    for (const m of [0, 30]) {
      out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return out;
})();

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  roleType: RoleType;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface Service {
  id: string;
  name: string;
  duration: number; // in minutes
  price: number; // in BRL
  category: string;
  icon: string; // lucide icon name
}

export interface Booking {
  id: string;
  specialistId: string;
  specialistName: string; // denormalized for convenience
  userName: string;
  userWhatsapp: string;
  serviceIds: string[];
  serviceNames: string[]; // denormalized
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  status: 'confirmado' | 'pendente' | 'cancelado' | 'finalizado';
  totalPrice: number;
  totalDuration: number;
  // new fields
  paymentStatus?: 'pending' | 'paid';
  confirmationStatus?: 'aguardandoAdmin' | 'confirmado' | 'rejeitado'; // already exists
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  date: string; // YYYY-MM-DD
  method: string; // e.g., 'whatsapp'
  status: 'pending' | 'completed';
}
export interface Transaction {
  id: string;
  type: 'entrada' | 'saida';
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  category: string;
  specialistId?: string;
  specialistName?: string;
}

export interface Client {
  id: string;
  professionalId: string;
  name: string;
  phone: string;
  notes?: string;
}

