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

export type TimeRange = { start: string; end: string }; // "HH:mm"
export type WeekDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type WeeklySchedule = Record<WeekDay, TimeRange[]>;

export const DEFAULT_WEEKLY_SCHEDULE: WeeklySchedule = {
  monday:    [{ start: '09:00', end: '17:30' }],
  tuesday:   [{ start: '09:00', end: '17:30' }],
  wednesday: [{ start: '09:00', end: '17:30' }],
  thursday:  [{ start: '09:00', end: '17:30' }],
  friday:    [{ start: '09:00', end: '17:30' }],
  saturday:  [{ start: '09:00', end: '17:30' }],
  sunday:    [],
};

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
  createdAt: string;
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
