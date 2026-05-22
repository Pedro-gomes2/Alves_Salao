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
  status: 'confirmado' | 'pendente' | 'cancelado';
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
