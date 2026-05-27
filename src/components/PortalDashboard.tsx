import React, { useState, useEffect } from 'react';
import { Specialist, Service, Booking, Transaction, AuthUser, WeeklySchedule, WeekDay, DEFAULT_WEEKLY_SCHEDULE, ALL_POSSIBLE_SLOTS } from '../types';
import BookingDetailsModal from './BookingDetailsModal';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  DollarSign, 
  Plus, 
  Trash2, 
  Edit, 
  Check, 
  X, 
  TrendingUp, 
  PlusCircle, 
  Download, 
  UserPlus, 
  Settings, 
  Activity, 
  Sparkles, 
  Heart, 
  Flame, 
  Leaf, 
  Sun, 
  Droplet, 
  Gem, 
  Printer,
  ChevronRight,
  ChevronLeft,
  TrendingDown,
  Star,
  MessageSquare,
  KeyRound,
  Pencil
} from 'lucide-react';

type PeriodKey = 'thisMonth' | 'lastMonth' | 'last30' | 'thisYear' | 'custom';

function periodRange(key: PeriodKey, customStart: string, customEnd: string, todayISO: string): { start: string; end: string } {
  const today = new Date(todayISO + 'T00:00:00');
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (key === 'thisMonth') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { start: iso(start), end: iso(end) };
  }
  if (key === 'lastMonth') {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { start: iso(start), end: iso(end) };
  }
  if (key === 'last30') {
    const start = new Date(today); start.setDate(start.getDate() - 29);
    return { start: iso(start), end: iso(today) };
  }
  if (key === 'thisYear') {
    return { start: `${today.getFullYear()}-01-01`, end: `${today.getFullYear()}-12-31` };
  }
  // custom
  return { start: customStart || '0000-01-01', end: customEnd || '9999-12-31' };
}

function filterByDate<T extends { date: string }>(items: T[], range: { start: string; end: string }): T[] {
  return items.filter(i => i.date >= range.start && i.date <= range.end);
}

const DAY_SHORT_LABEL: Record<string, string> = {
  monday: 'Seg', tuesday: 'Ter', wednesday: 'Qua',
  thursday: 'Qui', friday: 'Sex', saturday: 'Sáb', sunday: 'Dom',
};

function formatScheduleShort(schedule: WeeklySchedule | undefined): { day: string; text: string }[] {
  const order: WeekDay[] = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  return order.map(k => {
    const label = DAY_SHORT_LABEL[k];
    const slots = schedule?.[k];
    if (!slots || slots.length === 0) return { day: label, text: 'Folga' };
    const sorted = [...slots].sort();
    // Show "N horários (HH:mm–HH:mm)" or just list up to 4 then "…"
    if (sorted.length <= 4) return { day: label, text: sorted.join(', ') };
    return { day: label, text: `${sorted.length} horários (${sorted[0]}–${sorted[sorted.length - 1]})` };
  });
}

interface PortalDashboardProps {
  specialists: Specialist[];
  services: Service[];
  bookings: Booking[];
  transactions: Transaction[];
  onRefreshData: () => void;
  dbStatus?: { configured: boolean; mode: string };
  salonWhatsapp?: string;
  onChangeSalonWhatsapp?: (num: string) => void;
  currentUser: AuthUser;
  authToken: string;
}

type AdminTab = 'dashboard' | 'agenda' | 'minha_agenda' | 'equipe' | 'financeiro' | 'relatorio_detalhado' | 'nova_operacao' | 'config_especialist' | 'servicos' | 'config_servico';

export default function PortalDashboard({ 
  specialists, 
  services, 
  bookings, 
  transactions, 
  onRefreshData,
  dbStatus = { configured: false, mode: 'local_memory' },
  salonWhatsapp = '5511999999999',
  onChangeSalonWhatsapp,
  currentUser,
  authToken,
}: PortalDashboardProps) {
  const isAdmin = currentUser.roleType === 'admin';
  const authHeaders = (): Record<string, string> => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
  });
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  // Keep selectedBooking in sync with latest data after status changes
  useEffect(() => {
    if (selectedBooking) {
      const fresh = bookings.find(b => b.id === selectedBooking.id);
      if (fresh && fresh.status !== selectedBooking.status) {
        setSelectedBooking(fresh);
      }
    }
  }, [bookings, selectedBooking]);
  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('portal_active_tab') as AdminTab | null;
      if (saved) return saved;
    }
    return isAdmin ? 'dashboard' : 'agenda';
  });
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('portal_active_tab', activeTab);
    }
  }, [activeTab]);

  // New credential fields for the specialist form (admin-only)
  const [specUsername, setSpecUsername] = useState('');
  const [specNewPassword, setSpecNewPassword] = useState('');
  const [specRoleType, setSpecRoleType] = useState<'admin' | 'professional'>('professional');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showDbModal, setShowDbModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Period filter state (relatorio)
  const [periodKey, setPeriodKey] = useState<PeriodKey>('thisMonth');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Agenda interactive views states
  const [scheduleDraft, setScheduleDraft] = useState<WeeklySchedule | null>(null);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [agendaView, setAgendaView] = useState<'diario' | 'semanal' | 'mensal'>('diario');
  const [agendaDate, setAgendaDate] = useState<string>('2026-05-22');
  const [selectedSpecialistId, setSelectedSpecialistId] = useState<string>('all');

  const getDaysOfWeek = (centerDateStr: string): string[] => {
    const parts = centerDateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    
    const d = new Date(year, month, day);
    const dayIndex = d.getDay(); // 0 is Sunday, 1 is Monday ... 
    
    const sunday = new Date(year, month, day - dayIndex);
    
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i);
      const y = nextDay.getFullYear();
      const m = String(nextDay.getMonth() + 1).padStart(2, '0');
      const dd = String(nextDay.getDate()).padStart(2, '0');
      days.push(`${y}-${m}-${dd}`);
    }
    return days;
  };

  const getDaysOfMonth = (centerDateStr: string) => {
    const parts = centerDateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; 
    
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay(); 
    
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const cells: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];
    
    const prevMonthLastDate = new Date(year, month, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const prevDayNum = prevMonthLastDate - i;
      const prevMonthDate = new Date(year, month - 1, prevDayNum);
      const y = prevMonthDate.getFullYear();
      const m = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
      const dd = String(prevMonthDate.getDate()).padStart(2, '0');
      cells.push({
        dateStr: `${y}-${m}-${dd}`,
        dayNum: prevDayNum,
        isCurrentMonth: false
      });
    }
    
    for (let i = 1; i <= totalDays; i++) {
      const y = year;
      const m = String(month + 1).padStart(2, '0');
      const dd = String(i).padStart(2, '0');
      cells.push({
        dateStr: `${y}-${m}-${dd}`,
        dayNum: i,
        isCurrentMonth: true
      });
    }
    
    const remainingCells = 42 - cells.length;
    for (let i = 1; i <= remainingCells; i++) {
      const nextMonthDate = new Date(year, month + 1, i);
      const y = nextMonthDate.getFullYear();
      const m = String(nextMonthDate.getMonth() + 1).padStart(2, '0');
      const dd = String(nextMonthDate.getDate()).padStart(2, '0');
      cells.push({
        dateStr: `${y}-${m}-${dd}`,
        dayNum: i,
        isCurrentMonth: false
      });
    }
    
    return cells;
  };

  const getFormattedDatePT = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      
      const weekDays = [
        'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
        'Quinta-feira', 'Sexta-feira', 'Sábado'
      ];
      const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      
      return `${weekDays[d.getDay()]}, ${day} de ${months[month]} de ${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  const shiftDateByDays = (dateStr: string, daysNum: number) => {
    const parts = dateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day + daysNum);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setAgendaDate(`${y}-${m}-${dd}`);
  };

  const shiftDateByMonth = (dateStr: string, monthsNum: number) => {
    const parts = dateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month + monthsNum, 1); // target first of month for month browsing
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0'); // try to keep original day
    setAgendaDate(`${y}-${m}-01`); // fall to 1st to ensure we don't skip short months
  };
  
  // Transaction states
  const [transType, setTransType] = useState<'entrada' | 'saida'>('saida');
  const [transDescription, setTransDescription] = useState('');
  const [transAmount, setTransAmount] = useState('');
  const [transDate, setTransDate] = useState(new Date().toISOString().split('T')[0]);
  const [transCategory, setTransCategory] = useState('Materiais');
  const [transSpecialistId, setTransSpecialistId] = useState('');
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);

  // Specialist Setting states
  const [selectedSpec, setSelectedSpec] = useState<Specialist | null>(null);
  const [specName, setSpecName] = useState('');
  const [specRole, setSpecRole] = useState('');
  const [specSpecialty, setSpecSpecialty] = useState('');
  const [specCommission, setSpecCommission] = useState(35);
  const [specActive, setSpecActive] = useState(true);
  const [specAvatar, setSpecAvatar] = useState('');
  const [specSelectedServices, setSpecSelectedServices] = useState<string[]>([]);

  // Service Management states
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isNewService, setIsNewService] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [servicePrice, setServicePrice] = useState(150);
  const [serviceDuration, setServiceDuration] = useState(60);
  const [serviceCategory, setServiceCategory] = useState('Estética Facial');
  const [serviceIcon, setServiceIcon] = useState('Sparkles');

  // Professional Creation states
  const [isNewSpec, setIsNewSpec] = useState(false);

  // Success indicator message
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Normalize first name → username suggestion (lower, no accents, no spaces)
  const suggestUsernameFromName = (fullName: string): string => {
    const first = (fullName || '').trim().split(/\s+/)[0] || '';
    return first
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/[^a-z0-9]/g, '');
  };
  useEffect(() => {
    if (isNewSpec && !specUsername && specName) {
      setSpecUsername(suggestUsernameFromName(specName));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specName, isNewSpec]);

  // Auto trigger alerts
  const showToast = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => {
      setActionSuccessMessage(null);
    }, 3000);
  };

  // Helper values
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  // Calculations
  const todayBookings = bookings.filter(b => b.date === todayStr);
  const activeRange = periodRange(periodKey, customStart, customEnd, todayStr);
  const filteredTransactions = filterByDate(transactions, activeRange);
  const totalRevenue = filteredTransactions.filter(t => t.type === 'entrada').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = filteredTransactions.filter(t => t.type === 'saida').reduce((sum, t) => sum + t.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  const currentSpec = !isAdmin ? specialists.find(s => s.id === currentUser.id) : undefined;

  useEffect(() => {
    if (currentSpec && !scheduleDraft) {
      setScheduleDraft(currentSpec.weeklySchedule ?? DEFAULT_WEEKLY_SCHEDULE);
    }
  }, [currentSpec]); // eslint-disable-line react-hooks/exhaustive-deps

  const isScheduleValid = (sched: WeeklySchedule | null): boolean => {
    if (!sched) return false;
    for (const k of Object.keys(sched) as WeekDay[]) {
      const slots = sched[k];
      if (!Array.isArray(slots)) return false;
      const seen = new Set<string>();
      for (const s of slots) {
        if (typeof s !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(s)) return false;
        if (seen.has(s)) return false;
        seen.add(s);
      }
    }
    return true;
  };

  const mySpecialistId = currentUser.id;
  const myCommissionPct = currentSpec?.commission ?? 0;
  const myGenerated = filteredTransactions
    .filter(t => t.type === 'entrada' && t.specialistId === mySpecialistId)
    .reduce((sum, t) => sum + t.amount, 0);
  const myEstimatedPayout = (myGenerated * myCommissionPct) / 100;

  // Change booking status (Confirm / Reject / Cancel)
  const handleUpdateBookingStatus = async (id: string, status: 'confirmado' | 'cancelado' | 'finalizado') => {
    try {
      const response = await fetch(`/api/bookings/${id}/status`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status })
      });
      if (response.ok) {
        onRefreshData();
        let msgStr = `Agendamento atualizado para ${status}!`;
        if (status === 'confirmado') msgStr = 'Agendamento confirmado com sucesso!';
        if (status === 'cancelado') msgStr = 'Agendamento cancelado com sucesso!';
        if (status === 'finalizado') msgStr = 'Atendimento finalizado e dados encaminhados para o setor financeiro!';
        showToast(msgStr);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmAndSendWhatsapp = async (book: Booking) => {
    await handleUpdateBookingStatus(book.id, 'confirmado');
    
    // Normalize and clean phone number for WhatsApp URL
    const cleanPhone = book.userWhatsapp.replace(/\D/g, '');
    let formattedPhone = cleanPhone;
    if (cleanPhone.length > 0) {
      if (!cleanPhone.startsWith('55') && cleanPhone.length >= 10 && cleanPhone.length <= 11) {
        formattedPhone = '55' + cleanPhone;
      }
    }
    
    const formattedDate = book.date.split('-').reverse().join('/');
    const textMsg = `Olá, ${book.userName}! Passando para confirmar seu agendamento de *${book.serviceNames.join(', ')}* na Alves Estética! 🌸\n\n*Profissional:* ${book.specialistName}\n*Data:* ${formattedDate}\n*Horários:* ${book.time} hs\n*Valor:* R$ ${book.totalPrice.toFixed(2)}\n\nEstamos ansiosas para te receber! Caso precise remarcar, fale conosco.`;
    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(textMsg)}`;
    window.open(waUrl, '_blank');
  };

  const handleFinalizeBooking = async (id: string) => {
    await handleUpdateBookingStatus(id, 'finalizado');
  };

  // Create financial operation
  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transDescription || !transAmount) return;

    const selectedSpecObj = specialists.find(s => s.id === transSpecialistId);

    const transPayload: Transaction = {
      id: 'trans-' + Date.now(),
      type: transType,
      description: transDescription,
      amount: parseFloat(transAmount),
      date: transDate,
      category: transCategory,
      specialistId: transSpecialistId || undefined,
      specialistName: selectedSpecObj ? selectedSpecObj.name : undefined
    };

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(transPayload)
      });
      if (response.ok) {
        onRefreshData();
        setTransDescription('');
        setTransAmount('');
        setTransSpecialistId('');
        setActiveTab('financeiro');
        showToast('Lançamento financeiro registrado com sucesso!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resetTransactionForm = () => {
    setEditingTransactionId(null);
    setTransType('saida');
    setTransDescription('');
    setTransAmount('');
    setTransDate(new Date().toISOString().split('T')[0]);
    setTransCategory('Materiais');
    setTransSpecialistId('');
  };

  const handleStartEditTransaction = (t: Transaction) => {
    setEditingTransactionId(t.id);
    setTransType(t.type);
    setTransDescription(t.description);
    setTransAmount(String(t.amount));
    setTransDate(t.date);
    setTransCategory(t.category);
    setTransSpecialistId(t.specialistId || '');
    setActiveTab('nova_operacao');
  };

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransactionId || !transDescription || !transAmount) return;
    const selectedSpecObj = specialists.find(s => s.id === transSpecialistId);
    const patch: Partial<Transaction> = {
      type: transType,
      description: transDescription,
      amount: parseFloat(transAmount),
      date: transDate,
      category: transCategory,
      specialistId: transSpecialistId || undefined,
      specialistName: selectedSpecObj ? selectedSpecObj.name : undefined,
    };
    try {
      const response = await fetch(`/api/transactions/${editingTransactionId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(patch),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        onRefreshData();
        resetTransactionForm();
        setActiveTab('financeiro');
        showToast('Lançamento atualizado!');
      } else {
        showToast(data.error || 'Erro ao atualizar lançamento.');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao conectar com o servidor.');
    }
  };

  const handleDeleteTransaction = async (t: Transaction) => {
    if (!window.confirm(`Excluir o lançamento "${t.description}" de R$ ${t.amount.toFixed(2)}?`)) return;
    try {
      const response = await fetch(`/api/transactions/${t.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        onRefreshData();
        showToast('Lançamento excluído.');
      } else {
        showToast(data.error || 'Erro ao excluir lançamento.');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao conectar com o servidor.');
    }
  };

  // Open Specialist config
  const handleEditSpecialist = (spec: Specialist) => {
    setSelectedSpec(spec);
    setIsNewSpec(false);
    setSpecName(spec.name);
    setSpecRole(spec.role);
    setSpecSpecialty(spec.specialty || '');
    setSpecCommission(spec.commission);
    setSpecActive(spec.active);
    setSpecAvatar(spec.avatarUrl);
    setSpecSelectedServices(spec.services);
    setSpecUsername(spec.username || '');
    setSpecNewPassword('');
    setSpecRoleType((spec.roleType as 'admin' | 'professional') || 'professional');
    setActiveTab('config_especialist');
  };

  const handleCreateNewSpecialistInit = () => {
    setSelectedSpec(null);
    setIsNewSpec(true);
    setSpecName('');
    setSpecRole('Esteticista Sênior');
    setSpecSpecialty('');
    setSpecCommission(35);
    setSpecActive(true);
    setSpecAvatar('https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300');
    setSpecSelectedServices([]);
    setSpecUsername('');
    setSpecNewPassword('');
    setSpecRoleType('professional');
    setActiveTab('config_especialist');
  };

  // Save specialist configurations
  const handleSaveSpecialistSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Specialist & { newPassword?: string } = {
      id: isNewSpec ? 'spec-' + Date.now() : selectedSpec!.id,
      name: specName,
      role: specRole,
      specialty: specSpecialty,
      commission: specCommission,
      avatarUrl: specAvatar,
      rating: isNewSpec ? 4.9 : selectedSpec!.rating,
      services: specSelectedServices,
      active: specActive,
      attendanceCount: isNewSpec ? 0 : selectedSpec!.attendanceCount,
      username: specUsername.trim().toLowerCase() || undefined,
      roleType: specRoleType,
    };
    if (specNewPassword) payload.newPassword = specNewPassword;

    try {
      const response = await fetch('/api/specialists', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        onRefreshData();
        setActiveTab('equipe');
        showToast(isNewSpec ? 'Nova profissional adicionada!' : 'Configurações de profissional salvas!');
      } else {
        showToast(data.error || 'Erro ao salvar profissional.');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao conectar com o servidor.');
    }
  };

  const handleDeleteSpecialist = async (specId: string) => {
    if (!window.confirm('Tem certeza de que deseja remover esta profissional da equipe?')) return;
    try {
      const response = await fetch(`/api/specialists/${specId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (response.ok) {
        onRefreshData();
        setActiveTab('equipe');
        showToast('Profissional removida com sucesso!');
      } else {
        showToast('Erro ao remover profissional.');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao se conectar com o servidor.');
    }
  };

  const handleResetPassword = async (spec: Specialist) => {
    const newPassword = window.prompt(`Nova senha para ${spec.name} (mín. 4 caracteres):`);
    if (!newPassword || newPassword.length < 4) {
      if (newPassword !== null) showToast('Senha muito curta. Mínimo 4 caracteres.');
      return;
    }
    try {
      const payload: Specialist & { newPassword?: string } = {
        ...spec,
        newPassword,
      };
      const response = await fetch('/api/specialists', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        onRefreshData();
        showToast(`Senha de ${spec.name} atualizada!`);
      } else {
        showToast(data.error || 'Erro ao resetar senha.');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao conectar com o servidor.');
    }
  };

  // Service management actions
  const handleEditService = (service: Service) => {
    setSelectedService(service);
    setIsNewService(false);
    setServiceName(service.name);
    setServicePrice(service.price);
    setServiceDuration(service.duration);
    setServiceCategory(service.category);
    setServiceIcon(service.icon || 'Sparkles');
    setActiveTab('config_servico');
  };

  const handleCreateNewServiceInit = () => {
    setSelectedService(null);
    setIsNewService(true);
    setServiceName('');
    setServicePrice(150);
    setServiceDuration(60);
    setServiceCategory('Estética Facial');
    setServiceIcon('Sparkles');
    setActiveTab('config_servico');
  };

  const handleSaveServiceSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Service = {
      id: isNewService ? 'service-' + Date.now() : selectedService!.id,
      name: serviceName,
      price: Number(servicePrice) || 0,
      duration: Number(serviceDuration) || 0,
      category: serviceCategory,
      icon: serviceIcon
    };

    try {
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        onRefreshData();
        setActiveTab('servicos');
        showToast(isNewService ? 'Novo serviço cadastrado!' : 'Serviço atualizado com sucesso!');
      } else {
        showToast('Erro ao salvar serviço.');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao conectar com o servidor.');
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!window.confirm('Tem certeza de que deseja descartar (remover) este serviço?')) return;
    try {
      const response = await fetch(`/api/services/${serviceId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (response.ok) {
        onRefreshData();
        setActiveTab('servicos');
        showToast('Serviço descartado com sucesso!');
      } else {
        showToast('Erro ao remover serviço.');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao se conectar com o servidor.');
    }
  };

  const handleToggleSpecService = (serviceId: string) => {
    if (specSelectedServices.includes(serviceId)) {
      setSpecSelectedServices(specSelectedServices.filter(id => id !== serviceId));
    } else {
      setSpecSelectedServices([...specSelectedServices, serviceId]);
    }
  };

  const categories = {
    saida: ['Materiais', 'Produtos', 'Aluguel', 'Marketing', 'Utilidades', 'Outros'],
    entrada: ['Serviços', 'Venda de Produtos', 'Cursos', 'Serviço Extra', 'Investimentos']
  };

  return (
    <div className="w-full relative min-h-screen">
      
      {/* Toast Alert */}
      {actionSuccessMessage && (
        <div className="fixed top-24 right-6 bg-brand-primary text-white px-6 py-4 rounded-xl shadow-lg border border-brand-primary-light/35 z-[100] animate-bounce flex items-center gap-2">
          <Check className="w-5 h-5 text-brand-primary-light" />
          <span className="text-sm font-sans font-semibold">{actionSuccessMessage}</span>
        </div>
      )}

      {/* Main Grid Wrapper */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* SIDE BAR NAVIGATION (MD screens and above) */}
        <aside className="hidden md:flex md:col-span-3 flex-col gap-6 p-6 bg-white border border-[#d6c2c4]/30 rounded-2xl shadow-sm sticky top-24">
          <div className="px-2">
            <h3 className="font-display text-2xl text-brand-primary font-semibold">Portal do Salão</h3>
            <p className="text-xs text-brand-tertiary tracking-widest uppercase font-bold mt-1">Gestão Administrativa</p>
          </div>

          <nav className="flex flex-col gap-1.5 mt-4">
            <button 
              onClick={() => { setActiveTab('dashboard'); setIsDrawerOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-sans text-sm font-bold text-left transition-all ${
                activeTab === 'dashboard' 
                  ? 'bg-brand-primary-light/30 text-brand-primary' 
                  : 'text-brand-tertiary hover:bg-[#faf9f8]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            {!isAdmin && (
              <button
                onClick={() => { setActiveTab('minha_agenda'); setIsDrawerOpen(false); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-sans text-sm font-bold text-left transition-all ${
                  activeTab === 'minha_agenda'
                    ? 'bg-brand-primary-light/30 text-brand-primary'
                    : 'text-brand-tertiary hover:bg-[#faf9f8]'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Minha Agenda</span>
              </button>
            )}

            <button
              onClick={() => { setActiveTab('agenda'); setIsDrawerOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-sans text-sm font-bold text-left transition-all ${
                activeTab === 'agenda' 
                  ? 'bg-brand-primary-light/30 text-brand-primary' 
                  : 'text-brand-tertiary hover:bg-[#faf9f8]'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Agenda</span>
            </button>

            <button
              onClick={() => { setActiveTab('financeiro'); setIsDrawerOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-sans text-sm font-bold text-left transition-all ${
                activeTab === 'financeiro'
                  ? 'bg-brand-primary-light/30 text-brand-primary'
                  : 'text-brand-tertiary hover:bg-[#faf9f8]'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>{isAdmin ? 'Financeiro' : 'Meu Financeiro'}</span>
            </button>

            {isAdmin && (
              <>
                <button
                  onClick={() => { setActiveTab('equipe'); setIsDrawerOpen(false); }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-sans text-sm font-bold text-left transition-all ${
                    activeTab === 'equipe'
                      ? 'bg-brand-primary-light/30 text-brand-primary'
                      : 'text-brand-tertiary hover:bg-[#faf9f8]'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Equipe</span>
                </button>

                <button
                  onClick={() => { setActiveTab('relatorio_detalhado'); setIsDrawerOpen(false); }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-sans text-sm font-bold text-left transition-all ${
                    activeTab === 'relatorio_detalhado'
                      ? 'bg-brand-primary-light/30 text-brand-primary'
                      : 'text-brand-tertiary hover:bg-[#faf9f8]'
                  }`}
                >
                  <Printer className="w-4 h-4" />
                  <span>Relatório Detalhado</span>
                </button>

                <button
                  onClick={() => { setActiveTab('servicos'); setIsDrawerOpen(false); }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-sans text-sm font-bold text-left transition-all ${
                    activeTab === 'servicos' || activeTab === 'config_servico'
                      ? 'bg-brand-primary-light/30 text-brand-primary font-bold'
                      : 'text-brand-tertiary hover:bg-[#faf9f8]'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Gestão de Serviços</span>
                </button>
              </>
            )}
          </nav>
        </aside>

        {/* MOBILE NAVIGATION BAR SWITCHER */}
        <div className="md:hidden flex justify-around bg-white border border-brand-primary-light/20 p-2 rounded-2xl mb-4 shadow-sm overflow-x-auto gap-4">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center p-2 rounded-lg ${activeTab === 'dashboard' ? 'text-brand-primary' : 'text-brand-tertiary/75'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[9px] font-bold mt-1 uppercase">Painel</span>
          </button>
          <button 
            onClick={() => setActiveTab('agenda')}
            className={`flex flex-col items-center p-2 rounded-lg ${activeTab === 'agenda' ? 'text-brand-primary' : 'text-brand-tertiary/75'}`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[9px] font-bold mt-1 uppercase">Agenda</span>
          </button>
          <button
            onClick={() => setActiveTab('financeiro')}
            className={`flex flex-col items-center p-2 rounded-lg ${activeTab === 'financeiro' ? 'text-brand-primary' : 'text-brand-tertiary/75'}`}
          >
            <DollarSign className="w-5 h-5" />
            <span className="text-[9px] font-bold mt-1 uppercase">{isAdmin ? 'Caixa' : 'Meu Caixa'}</span>
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab('equipe')}
                className={`flex flex-col items-center p-2 rounded-lg ${activeTab === 'equipe' ? 'text-brand-primary' : 'text-brand-tertiary/75'}`}
              >
                <Users className="w-5 h-5" />
                <span className="text-[9px] font-bold mt-1 uppercase">Equipe</span>
              </button>
              <button
                onClick={() => setActiveTab('servicos')}
                className={`flex flex-col items-center p-2 rounded-lg ${activeTab === 'servicos' ? 'text-brand-primary' : 'text-brand-tertiary/75'}`}
              >
                <Sparkles className="w-5 h-5" />
                <span className="text-[9px] font-bold mt-1 uppercase">Serviços</span>
              </button>
            </>
          )}
        </div>

        {/* VIEW AREA */}
        <section className="md:col-span-9 animate-fade-in">
          
          {/* VIEW 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* Header Greeting */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 bg-white p-6 rounded-2xl border border-brand-primary-light/35 shadow-sm">
                <div>
                  <span className="font-sans text-[11px] font-semibold text-brand-primary tracking-widest uppercase">Portal Administrativo</span>
                  <h2 className="font-display text-3xl md:text-4xl text-brand-primary mt-1">Olá, Admin</h2>
                  <p className="text-brand-tertiary text-sm mt-0.5">Aqui está o resumo da sua boutique de estética hoje.</p>
                  
                  {/* Database Connection Badge */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {dbStatus.configured ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Banco de Dados: Supabase (Online)</span>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setShowDbModal(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/55 hover:bg-amber-100/80 transition-all cursor-pointer text-left shadow-sm opacity-85"
                      >
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse animate-duration-1000"></span>
                        <span>Banco de Dados: Local • Conectar ao Supabase</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Configuration of Salon WhatsApp (Admin settings only) */}
                {isAdmin && (
                  <div className="bg-[#faf9f8] p-4 rounded-xl border border-[#d6c2c4]/40 max-w-sm w-full lg:w-80 shadow-inner">
                    <div className="flex items-center gap-2 mb-2 text-brand-primary">
                      <MessageSquare className="w-4 h-4 text-brand-primary" />
                      <span className="font-sans text-[11px] font-bold uppercase tracking-wider">WhatsApp de Notificação</span>
                    </div>
                    <p className="text-[11px] text-[#847375] mb-2 leading-tight">
                      Insira o número de WhatsApp do salão onde as clientes enviarão o agendamento:
                    </p>
                    <input
                      type="text"
                      placeholder="Ex: 5511999999999"
                      value={salonWhatsapp}
                      onChange={(e) => {
                        if (onChangeSalonWhatsapp) {
                          onChangeSalonWhatsapp(e.target.value.replace(/[^\d+]/g, ''));
                        }
                      }}
                      className="w-full bg-white border border-[#d6c2c4]/65 rounded-lg px-3 py-1.5 text-xs font-mono text-brand-dark focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all shadow-sm"
                    />
                    <p className="text-[9px] text-brand-tertiary/75 mt-1 leading-none italic">
                      * Apenas números com DDI + DDD (Ex: 5511999999999).
                    </p>
                  </div>
                )}
              </div>

              {/* Metric Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                
                {/* Total Revenue */}
                <div 
                  onClick={() => setActiveTab('financeiro')}
                  className="bg-white border border-[#d6c2c4]/20 rounded-2xl p-6 shadow-sm flex flex-col justify-between cursor-pointer hover:border-brand-primary/40 transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-brand-primary-light/40 p-2 rounded-xl text-brand-primary">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold font-sans text-brand-secondary tracking-wide">+12% vs ontem</span>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-tertiary">Faturamento Bruto</span>
                  <span className="font-display text-2xl lg:text-3xl text-brand-primary font-semibold mt-1">
                    R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Total Appointments */}
                <div 
                  onClick={() => setActiveTab('agenda')}
                  className="bg-white border border-[#d6c2c4]/20 rounded-2xl p-6 shadow-sm flex flex-col justify-between cursor-pointer hover:border-brand-primary/40 transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-brand-secondary-light/45 p-2 rounded-xl text-brand-secondary">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold font-sans text-brand-secondary tracking-wide">Hoje</span>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-tertiary">Agendamentos</span>
                  <span className="font-display text-2xl lg:text-3xl text-brand-secondary font-semibold mt-1">
                    {todayBookings.length} Atendimentos
                  </span>
                </div>

                {/* Active Specialists */}
                <div 
                  onClick={() => setActiveTab('equipe')}
                  className="bg-brand-primary text-white rounded-2xl p-6 shadow-md flex flex-col justify-between cursor-pointer hover:bg-brand-primary-light hover:text-brand-primary transition-all relative overflow-hidden"
                >
                  <div className="absolute right-0 top-0 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none" />
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-white/20 p-2 rounded-xl">
                      <Users className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold font-sans tracking-wide">Equipe</span>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider opacity-75">Profissionais Ativas</span>
                  <span className="font-display text-2xl lg:text-3xl font-semibold mt-1">
                    {specialists.filter(s => s.active).length} Especialistas
                  </span>
                </div>

              </div>

              {/* 7-DAY REVENUE GRAPH REPRESENTATION */}
              <div className="bg-white border border-brand-primary-light/35 rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-display text-lg text-brand-primary font-semibold">Tendência de Faturamento (7 dias)</h3>
                  <TrendingUp className="w-5 h-5 text-brand-secondary" />
                </div>
                
                {/* SVG Revenue Line Graph */}
                <div className="w-full h-44 relative">
                  <svg className="w-full h-full" viewBox="0 0 500 120" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="glowGrad" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#844b58" stopOpacity="0.25"></stop>
                        <stop offset="95%" stopColor="#844b58" stopOpacity="0.01"></stop>
                      </linearGradient>
                    </defs>
                    <path 
                      className="chart-gradient" 
                      fill="url(#glowGrad)" 
                      d="M0,100 C60,85 120,95 180,68 C240,45 300,75 360,38 C420,15 500,30 500,30 L500,120 L0,120 Z"
                    />
                    <path 
                      d="M0,100 C60,85 120,95 180,68 C240,45 300,75 360,38 C420,15 500,30 500,30" 
                      fill="none" 
                      stroke="#844b58" 
                      strokeWidth="2.5" 
                      strokeLinecap="round"
                    />
                    {/* Highlight Dots */}
                    <circle cx="180" cy="68" r="4.5" fill="#6a5d39" />
                    <circle cx="360" cy="38" r="4.5" fill="#6a5d39" />
                    <circle cx="500" cy="30" r="4.5" fill="#6a5d39" />
                  </svg>
                  <div className="flex justify-between mt-3 px-1 text-[10px] font-bold text-brand-tertiary/75 tracking-wider uppercase font-sans">
                    <span>Seg</span>
                    <span>Ter</span>
                    <span>Qua</span>
                    <span>Qui</span>
                    <span>Sex</span>
                    <span>Sáb</span>
                    <span>Hoje</span>
                  </div>
                </div>
              </div>

              {/* Pending Approvals Panel */}
              <div className="bg-white border border-[#d6c2c4]/20 rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-display text-lg text-brand-dark font-semibold">Agendamentos Hoje ({todayBookings.length})</h3>
                  <button onClick={() => setActiveTab('agenda')} className="text-xs text-brand-primary font-bold hover:underline">Ver agenda completa</button>
                </div>

                <div className="space-y-4">
                  {todayBookings.length === 0 ? (
                    <p className="text-sm text-brand-tertiary italic text-center py-6">Nenhum agendamento registrado para hoje.</p>
                  ) : (
                    todayBookings.map(book => (
                      <div 
                        key={book.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all ${
                          book.status === 'pendente' 
                            ? 'border-dashed border-brand-primary-light bg-brand-primary-light/5' 
                            : 'border-brand-primary-light/10 bg-[#faf9f8]'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-white border border-brand-primary-light/35 flex flex-col items-center justify-center text-brand-primary font-bold">
                            <span className="text-xs">{book.time}</span>
                          </div>
                          <div>
                            <p className="font-sans font-bold text-sm text-brand-dark">{book.userName}</p>
                            <p className="text-xs text-brand-tertiary">{book.serviceNames.join(', ')} • <span className="font-semibold text-brand-secondary">{book.specialistName}</span></p>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 mt-3 sm:mt-0">
                          {book.status === 'pendente' ? (
                            <>
                              <button 
                                onClick={() => handleUpdateBookingStatus(book.id, 'confirmado')}
                                className="p-1 px-3 bg-emerald-600 text-white hover:bg-emerald-700 rounded-full text-xs font-bold flex items-center gap-1 transition-all"
                              >
                                <Check className="w-3.5 h-3.5" /> Confirmar
                              </button>
                              <button 
                                onClick={() => handleUpdateBookingStatus(book.id, 'cancelado')}
                                className="p-1 px-3 bg-brand-tertiary/10 text-brand-dark hover:bg-brand-primary-light hover:text-brand-primary rounded-full text-xs font-bold flex items-center gap-1 transition-all"
                              >
                                <X className="w-3.5 h-3.5" /> Rejeitar
                              </button>
                            </>
                          ) : (
                            <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                              book.status === 'confirmado' 
                                ? 'bg-brand-secondary-light/40 text-brand-secondary' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {book.status}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

          {/* VIEW 2: AGENDA TIMELINE */}
          {activeTab === 'agenda' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 border-b border-brand-primary-light/10 pb-6">
                <div>
                  <span className="font-sans text-[11px] font-semibold text-brand-primary tracking-widest uppercase">
                    Controle de Atendimento • Visualização {agendaView === 'diario' ? 'Diária' : agendaView === 'semanal' ? 'Semanal' : 'Mensal'}
                  </span>
                  <div className="flex items-center gap-3 mt-1">
                    <h2 className="font-display text-3xl font-bold text-brand-dark">Agenda Interativa</h2>
                    <span className="px-3 py-1 text-[10px] bg-brand-primary-light/20 text-brand-primary rounded-full font-bold uppercase tracking-wide">Alves Estética</span>
                  </div>
                  <p className="text-brand-tertiary text-xs mt-1">Navegue pelas datas, confirme procedimentos via WhatsApp e envie faturamentos ao financeiro ao concluir.</p>
                </div>
                
                {/* Switcher & Date Navigation toolbar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                  {/* Selector Segment View */}
                  <div className="inline-flex items-center bg-[#faf9f8] border border-[#d6c2c4]/45 rounded-xl p-1 shadow-sm">
                    <button 
                      onClick={() => setAgendaView('diario')}
                      className={`px-4 py-2 rounded-lg font-sans text-xs font-bold transition-all cursor-pointer ${agendaView === 'diario' ? 'bg-brand-primary text-white shadow-sm' : 'text-[#847375] hover:bg-brand-primary-light/10'}`}
                    >
                      Diário
                    </button>
                    <button 
                      onClick={() => setAgendaView('semanal')}
                      className={`px-4 py-2 rounded-lg font-sans text-xs font-bold transition-all cursor-pointer ${agendaView === 'semanal' ? 'bg-brand-primary text-white shadow-sm' : 'text-[#847375] hover:bg-brand-primary-light/10'}`}
                    >
                      Semanal
                    </button>
                    <button 
                      onClick={() => setAgendaView('mensal')}
                      className={`px-4 py-2 rounded-lg font-sans text-xs font-bold transition-all cursor-pointer ${agendaView === 'mensal' ? 'bg-brand-primary text-white shadow-sm' : 'text-[#847375] hover:bg-brand-primary-light/10'}`}
                    >
                      Mensal
                    </button>
                  </div>

                  {/* Specialist Filter */}
                  <div className="relative">
                    <select 
                      value={selectedSpecialistId}
                      onChange={(e) => setSelectedSpecialistId(e.target.value)}
                      className="bg-white border border-[#d6c2c4]/40 rounded-xl py-2.5 pl-4 pr-10 text-xs font-bold text-brand-tertiary cursor-pointer focus:ring-1 focus:ring-brand-primary focus:outline-none shadow-sm"
                    >
                      <option value="all">Filtro: Todos Profissionais</option>
                      {specialists.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* DATE NAVIGATION PANEL */}
              <div className="bg-[#faf9f8] border border-brand-primary-light/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      if (agendaView === 'diario') shiftDateByDays(agendaDate, -1);
                      else if (agendaView === 'semanal') shiftDateByDays(agendaDate, -7);
                      else shiftDateByMonth(agendaDate, -1);
                    }}
                    className="w-10 h-10 rounded-full border border-[#d6c2c4]/40 hover:bg-white text-brand-primary flex items-center justify-center cursor-pointer transition-colors hover:shadow-sm animate-pulse-slow"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="text-center sm:text-left px-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#847375] block">Data Selecionada</span>
                    <span className="font-sans font-bold text-sm text-brand-dark">
                      {agendaView === 'diario' && getFormattedDatePT(agendaDate)}
                      {agendaView === 'semanal' && `Semana de ${getFormattedDatePT(getDaysOfWeek(agendaDate)[0]).split(',')[1]} até ${getFormattedDatePT(getDaysOfWeek(agendaDate)[6]).split(',')[1]}`}
                      {agendaView === 'mensal' && (() => {
                        const mParts = agendaDate.split('-');
                        const mMonths = [
                          'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
                        ];
                        return `${mMonths[parseInt(mParts[1], 10) - 1]} de ${mParts[0]}`;
                      })()}
                    </span>
                  </div>

                  <button 
                    onClick={() => {
                      if (agendaView === 'diario') shiftDateByDays(agendaDate, 1);
                      else if (agendaView === 'semanal') shiftDateByDays(agendaDate, 7);
                      else shiftDateByMonth(agendaDate, 1);
                    }}
                    className="w-10 h-10 rounded-full border border-[#d6c2c4]/40 hover:bg-white text-brand-primary flex items-center justify-center cursor-pointer transition-colors hover:shadow-sm"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {/* Today shortcut button */}
                  <button 
                    onClick={() => setAgendaDate('2026-05-22')}
                    className="flex-1 sm:flex-none bg-white border border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all uppercase tracking-wide cursor-pointer text-center"
                  >
                    Voltar para Hoje
                  </button>
                </div>
              </div>

              {/* VIEW DYNAMIC CONTENT CONDITIONAL EXECUTIONS */}

              {/* 1. DIÁRIO VIEW */}
              {agendaView === 'diario' && (
                <div className="bg-white border border-brand-primary-light/35 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="border-b border-brand-primary-light/10 pb-4">
                    <h3 className="font-display font-semibold text-lg text-brand-dark">Grade de Horários para {agendaDate.split('-').reverse().join('/')}</h3>
                    <p className="text-brand-tertiary text-xs">Visualize e gerencie procedimentos por hora marcada</p>
                  </div>
                  
                  <div className="space-y-4">
                    {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map((hour) => {
                      // Filter bookings on agendaDate & matching hour prefix
                      let hourBookings = bookings.filter(b => b.date === agendaDate && b.time.startsWith(hour.slice(0, 2)));
                      if (selectedSpecialistId !== 'all') {
                        hourBookings = hourBookings.filter(b => b.specialistId === selectedSpecialistId);
                      }

                      return (
                        <div key={hour} className="flex flex-col md:flex-row gap-4 items-start pb-4 border-b border-brand-primary-light/10 last:border-0 last:pb-0 pt-2 selection:bg-brand-primary-light/30">
                          {/* Hour tag */}
                          <div className="w-16 md:text-right pt-1 flex items-center gap-1.5 md:justify-end">
                            <span className="w-2 h-2 rounded-full bg-[#d6c2c4]" />
                            <span className="text-xs font-bold text-brand-tertiary font-mono">{hour} hs</span>
                          </div>

                          {/* Detail of booking */}
                          <div className="flex-1 w-full space-y-3">
                            {hourBookings.length === 0 ? (
                              <div className="py-2.5 px-4 bg-brand-primary-light/5 border border-dashed border-brand-primary-light/20 rounded-xl flex items-center text-brand-tertiary/50">
                                <PlusCircle className="w-3.5 h-3.5 mr-2 text-brand-tertiary/30" />
                                <span className="text-xs italic font-semibold">Horário livre para atendimento</span>
                              </div>
                            ) : (
                              hourBookings.map(book => (
                                <div
                                  key={book.id}
                                  onClick={() => setSelectedBooking(book)}
                                  className={`flex flex-col lg:flex-row justify-between p-5 rounded-2xl border transition-all cursor-pointer hover:scale-[1.005] ${
                                    book.status === 'pendente'
                                      ? 'border-dashed border-brand-primary bg-brand-primary-light/5'
                                      : book.status === 'confirmado'
                                        ? 'border-brand-primary-light/25 bg-[#faf9f8]'
                                        : book.status === 'finalizado'
                                          ? 'border-emerald-300/40 bg-emerald-50/20'
                                          : 'border-[#d6c2c4]/20 bg-[#fbfbfb] opacity-60'
                                  } shadow-sm hover:shadow-md`}
                                >
                                  {/* Info side */}
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="font-sans font-black text-[#5c4a4c] text-base">{book.userName}</span>
                                      
                                      {/* Status labels */}
                                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider ${
                                        book.status === 'confirmado' ? 'bg-[#f0deb0] text-[#6a5d39]' :
                                        book.status === 'finalizado' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                        book.status === 'pendente' ? 'bg-[#efdfd9] text-[#645a55]' :
                                        'bg-red-50 text-red-700'
                                      }`}>
                                        {book.status === 'pendente' ? 'Pendente' : 
                                         book.status === 'confirmado' ? 'Confirmado' : 
                                         book.status === 'finalizado' ? 'Finalizado' : 'Cancelado'}
                                      </span>
                                    </div>
                                    <p className="text-xs text-brand-tertiary font-medium">
                                      Procedimento: <span className="text-brand-dark font-semibold">{book.serviceNames.join(', ')}</span> • Colaboradora: <span className="font-bold text-brand-secondary">{book.specialistName}</span>
                                    </p>
                                    <div className="flex gap-4 text-[10px] text-brand-tertiary mt-1.5 font-semibold">
                                      <span>Preço: <strong className="text-brand-dark font-bold text-xs">R$ {book.totalPrice.toFixed(2)}</strong></span>
                                      <span>Duração: <strong className="text-brand-dark font-bold">{book.totalDuration} min</strong></span>
                                      <span>• Tel: {book.userWhatsapp}</span>
                                    </div>
                                  </div>

                                  {/* Buttons action list */}
                                  <div className="flex flex-wrap items-center gap-2 mt-4 lg:mt-0" onClick={(e) => e.stopPropagation()}>
                                    {book.status === 'pendente' && (
                                      <>
                                        <button 
                                          onClick={() => handleConfirmAndSendWhatsapp(book)}
                                          className="p-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer shadow-sm hover:shadow"
                                          title="Confirmar Atendimento e enviar WhatsApp"
                                        >
                                          <Check className="w-3.5 h-3.5" /> Confirmar Atendimento (WhatsApp)
                                        </button>
                                        <button 
                                          onClick={() => handleUpdateBookingStatus(book.id, 'cancelado')}
                                          className="p-2 px-3 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 rounded-full text-xs font-bold flex items-center gap-1 transition-transform active:scale-95 cursor-pointer"
                                        >
                                          <X className="w-3.5 h-3.5" /> Recusar
                                        </button>
                                      </>
                                    )}

                                    {book.status === 'confirmado' && (
                                      <>
                                        <button 
                                          onClick={() => handleFinalizeBooking(book.id)}
                                          className="p-2 px-4 bg-purple-700 hover:bg-purple-800 text-white rounded-full text-xs font-bold flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer shadow-md hover:shadow-lg"
                                          title="Finalizar atendimento e enviar dados para o financeiro"
                                        >
                                          <DollarSign className="w-3.5 h-3.5" /> Finalizar Atendimento (Finanças)
                                        </button>
                                        <button 
                                          onClick={() => handleUpdateBookingStatus(book.id, 'cancelado')}
                                          className="p-2 px-3 text-brand-tertiary hover:text-red-600 rounded-full text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                        >
                                          <X className="w-3.5 h-3.5" /> Cancelar
                                        </button>
                                      </>
                                    )}

                                    {book.status === 'finalizado' && (
                                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full shadow-sm animate-fade-in">
                                        <Check className="w-3.5 h-3.5 stroke-[3px]" /> Encaminhado ao Financeiro (R$ {book.totalPrice.toFixed(2)})
                                      </span>
                                    )}

                                    {book.status === 'cancelado' && (
                                      <span className="text-xs text-red-700 font-bold bg-red-50 border border-red-200 px-3 py-1.5 rounded-full">
                                        Cancelado
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. SEMANAL VIEW */}
              {agendaView === 'semanal' && (
                <div className="space-y-6">
                  <div className="bg-[#faf9f8] p-4 rounded-xl border border-[#d6c2c4]/20">
                    <p className="text-xs text-brand-tertiary italic font-medium">Visualizando atendimentos para a semana selecionada. Clique em qualquer agendamento de um dia para focar nela ou atualizar o status.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                    {getDaysOfWeek(agendaDate).map((dayStr) => {
                      // Filter bookings on dayStr
                      let dayBookings = bookings.filter(b => b.date === dayStr);
                      if (selectedSpecialistId !== 'all') {
                        dayBookings = dayBookings.filter(b => b.specialistId === selectedSpecialistId);
                      }
                      
                      // Sort bookings by hour chronologically
                      dayBookings.sort((a, b) => a.time.localeCompare(b.time));

                      const isSelectedDay = dayStr === agendaDate;
                      const parts = dayStr.split('-');
                      const dayLabel = parts[2];
                      const monthLabel = parts[1];

                      // Parse day name (Sunday, Monday, etc.)
                      const dParts = dayStr.split('-');
                      const tempDate = new Date(parseInt(dParts[0], 10), parseInt(dParts[1], 10) - 1, parseInt(dParts[2], 10));
                      const weDaysAbbr = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                      const dayNameAbbr = weDaysAbbr[tempDate.getDay()];

                      return (
                        <div 
                          key={dayStr}
                          onClick={() => setAgendaDate(dayStr)}
                          className={`bg-white rounded-2xl border p-4 flex flex-col h-[400px] overflow-y-auto cursor-pointer transition-all ${
                            isSelectedDay 
                              ? 'border-brand-primary bg-[#faf9f8]/60 ring-2 ring-brand-primary-light/30 shadow-md' 
                              : 'border-brand-primary-light/30 hover:shadow shadow-sm'
                          }`}
                        >
                          {/* Day header */}
                          <div className={`text-center pb-3 mb-3 border-b border-brand-primary-light/10 ${isSelectedDay ? 'text-brand-primary' : 'text-brand-dark'}`}>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#847375] block">
                              {dayNameAbbr}
                            </span>
                            <span className="text-xl font-bold font-sans">
                              {dayLabel}/{monthLabel}
                            </span>
                          </div>

                          {/* Day bookings list */}
                          <div className="flex-1 space-y-3">
                            {dayBookings.length === 0 ? (
                              <div className="h-full flex flex-col items-center justify-center text-center py-8">
                                <span className="text-[10px] font-bold text-brand-tertiary/40 uppercase italic">Livre</span>
                              </div>
                            ) : (
                              dayBookings.map((book) => (
                                <div 
                                  key={book.id}
                                  className={`p-2.5 rounded-xl border text-left text-xs transition-shadow relative hover:shadow ${
                                    book.status === 'pendente' 
                                      ? 'border-[#d6c2c4] bg-brand-primary-light/5' 
                                      : book.status === 'confirmado'
                                        ? 'border-brand-primary-light/40 bg-[#faf9f8]'
                                        : book.status === 'finalizado'
                                          ? 'border-emerald-300 bg-emerald-50/10'
                                          : 'border-red-100 bg-[#fbfbfb] opacity-60'
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedBooking(book);
                                  }}
                                >
                                  {/* Title & mark */}
                                  <div className="flex justify-between items-start gap-1">
                                    <span className="font-mono font-bold text-brand-primary text-[10px] bg-brand-primary-light/15 px-1.5 py-0.5 rounded">
                                      {book.time}
                                    </span>
                                    {/* Small indicator */}
                                    <span className={`w-2 h-2 rounded-full ${
                                      book.status === 'confirmado' ? 'bg-[#f0deb0]' :
                                      book.status === 'finalizado' ? 'bg-emerald-600' :
                                      book.status === 'pendente' ? 'bg-[#d6c2c4]' : 'bg-red-400'
                                    }`} />
                                  </div>

                                  <p className="font-sans font-bold text-brand-dark mt-1 line-clamp-1 truncate">{book.userName}</p>
                                  <p className="text-[10px] text-brand-tertiary font-medium line-clamp-1 truncate">{book.serviceNames.join(', ')}</p>
                                  <p className="text-[9px] text-brand-secondary italic mt-0.5">{book.specialistName}</p>

                                  {/* Quick interactive controls for minicard */}
                                  <div className="mt-2 pt-2 border-t border-brand-primary-light/10 flex items-center justify-end gap-1.5">
                                    {book.status === 'pendente' && (
                                      <>
                                        <button 
                                          onClick={() => handleConfirmAndSendWhatsapp(book)}
                                          className="p-1 px-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[9px] flex items-center gap-0.5 cursor-pointer"
                                          title="Confirmar"
                                        >
                                          <Check className="w-2.5 h-2.5" /> Confirmar
                                        </button>
                                        <button 
                                          onClick={() => handleUpdateBookingStatus(book.id, 'cancelado')}
                                          className="p-1 bg-red-100 text-red-700 hover:bg-red-700 hover:text-white rounded font-bold text-[9px] cursor-pointer"
                                          title="Recusar"
                                        >
                                          <X className="w-2.5 h-2.5" />
                                        </button>
                                      </>
                                    )}

                                    {book.status === 'confirmado' && (
                                      <button 
                                        onClick={() => handleFinalizeBooking(book.id)}
                                        className="p-1 px-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded font-bold text-[9px] flex items-center gap-0.5 cursor-pointer animate-pulse-slow"
                                        title="Finalizar (Enviar p/ Financeiro)"
                                      >
                                        <DollarSign className="w-2.5 h-2.5" /> Finalizar
                                      </button>
                                    )}

                                    {book.status === 'finalizado' && (
                                      <span className="text-[8px] text-emerald-800 bg-emerald-100 px-1 py-0.5 rounded font-bold uppercase">
                                        Atendido
                                      </span>
                                    )}

                                    {book.status === 'cancelado' && (
                                      <span className="text-[8px] text-red-800 bg-red-50 px-1 py-0.5 rounded font-bold uppercase">
                                        Canc
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. MENSAL VIEW */}
              {agendaView === 'mensal' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Calendar monthly card */}
                  <div className="lg:col-span-2 bg-white border border-brand-primary-light/35 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-brand-primary-light/10">
                      <h3 className="font-display font-semibold text-lg text-brand-dark">Calendário Mensal</h3>
                      <p className="text-brand-tertiary text-xs">Selecione uma data para inspecionar os atendimentos</p>
                    </div>

                    {/* Weekdays names labels */}
                    <div className="grid grid-cols-7 gap-1 text-center font-sans text-[11px] font-bold uppercase tracking-widest text-[#847375] pb-2">
                      <div>D</div>
                      <div>S</div>
                      <div>T</div>
                      <div>Q</div>
                      <div>Q</div>
                      <div>S</div>
                      <div>S</div>
                    </div>

                    {/* Days grid slots */}
                    <div className="grid grid-cols-7 gap-2">
                      {getDaysOfMonth(agendaDate).map((cell, index) => {
                        const cellDateStr = cell.dateStr;
                        const isSelectedDate = cellDateStr === agendaDate;
                        
                        // Bookings count on this cell date
                        let cellBookings = bookings.filter(b => b.date === cellDateStr);
                        if (selectedSpecialistId !== 'all') {
                          cellBookings = cellBookings.filter(b => b.specialistId === selectedSpecialistId);
                        }

                        // Count by color status
                        const hasPending = cellBookings.some(b => b.status === 'pendente');
                        const hasConfirmed = cellBookings.some(b => b.status === 'confirmado');
                        const hasFinalized = cellBookings.some(b => b.status === 'finalizado');
                        const hasCanceled = cellBookings.some(b => b.status === 'cancelado');

                        return (
                          <div 
                            key={`${cellDateStr}-${index}`}
                            onClick={() => setAgendaDate(cellDateStr)}
                            className={`min-h-[85px] border rounded-xl p-2 cursor-pointer flex flex-col justify-between transition-all select-none ${
                              cell.isCurrentMonth ? 'bg-white' : 'bg-gray-50/40 text-gray-400 opacity-40 hover:opacity-75'
                            } ${
                              isSelectedDate 
                                ? 'border-brand-primary ring-2 ring-brand-primary-light/35 bg-[#faf9f8] shadow-sm' 
                                : 'border-brand-primary-light/10 hover:border-brand-primary/50'
                            }`}
                          >
                            <span className={`text-xs font-bold leading-none ${isSelectedDate ? 'text-brand-primary font-black' : 'text-[#5c4a4c]'}`}>
                              {cell.dayNum}
                            </span>

                            {/* Indicators of bookings inside slot */}
                            <div className="space-y-1">
                              {cellBookings.length > 0 && (
                                <>
                                  <div className="flex flex-wrap gap-1 leading-none">
                                    {cellBookings.slice(0, 3).map((b) => (
                                      <span 
                                        key={b.id}
                                        className={`w-1.5 h-1.5 rounded-full inline-block ${
                                          b.status === 'confirmado' ? 'bg-[#f0deb0]' :
                                          b.status === 'finalizado' ? 'bg-emerald-600' :
                                          b.status === 'pendente' ? 'bg-[#d6c2c4]' : 'bg-red-400'
                                        }`}
                                        title={`${b.userName} - ${b.time}`}
                                      />
                                    ))}
                                    {cellBookings.length > 3 && (
                                      <span className="text-[7px] text-brand-primary font-bold">+{cellBookings.length - 3}</span>
                                    )}
                                  </div>
                                  <span className="text-[8px] font-sans font-black text-brand-tertiary block leading-none">
                                    {cellBookings.length} {cellBookings.length === 1 ? 'atend.' : 'atends.'}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sidebar listing selected day details */}
                  <div className="bg-white border border-brand-primary-light/35 rounded-2xl p-6 shadow-sm flex flex-col h-[500px]">
                    <div className="border-b border-brand-primary-light/10 pb-3 mb-4 text-left">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-[#847375]">Inspecionar Dia</span>
                      <h4 className="font-display font-semibold text-base text-brand-dark leading-snug">
                        {agendaDate.split('-').reverse().join('/')}
                      </h4>
                      <p className="text-[11px] text-brand-tertiary mt-0.5">{getFormattedDatePT(agendaDate).split(',')[0]}</p>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-4">
                      {(() => {
                        let selectedDayBookings = bookings.filter(b => b.date === agendaDate);
                        if (selectedSpecialistId !== 'all') {
                          selectedDayBookings = selectedDayBookings.filter(b => b.specialistId === selectedSpecialistId);
                        }

                        if (selectedDayBookings.length === 0) {
                          return (
                            <div className="h-full flex flex-col items-center justify-center text-center text-brand-tertiary/60 py-10">
                              <Calendar className="w-8 h-8 text-[#d6c2c4] mb-2 stroke-[1.5]" />
                              <p className="text-xs font-semibold italic">Nenhum atendimento agendado para este dia.</p>
                            </div>
                          );
                        }

                        return selectedDayBookings.map((book) => (
                          <div
                            key={book.id}
                            onClick={() => setSelectedBooking(book)}
                            className={`p-4 rounded-xl border text-left space-y-3 cursor-pointer hover:shadow transition-shadow ${
                              book.status === 'pendente' 
                                ? 'border-[#d6c2c4] bg-[#faf9f8]' 
                                : book.status === 'confirmado'
                                  ? 'border-brand-primary-light/40 bg-brand-primary-light/5'
                                  : book.status === 'finalizado'
                                    ? 'border-emerald-300 bg-emerald-50/10'
                                    : 'border-red-100 bg-[#fbfbfb] opacity-60'
                            }`}
                          >
                            <div className="flex justify-between items-center gap-2">
                              <span className="font-mono font-bold text-xs text-brand-primary bg-white px-2 py-0.5 border border-[#d6c2c4]/40 rounded shadow-xs">
                                {book.time} hs
                              </span>
                              <span className={`px-1.5 py-0.5 text-[8px] font-extrabold rounded uppercase ${
                                book.status === 'confirmado' ? 'bg-[#f0deb0] text-[#6a5d39]' :
                                book.status === 'finalizado' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                book.status === 'pendente' ? 'bg-[#efdfd9] text-[#645a55]' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {book.status}
                              </span>
                            </div>

                            <p className="font-sans font-bold text-brand-dark text-xs m-0">{book.userName}</p>
                            <p className="text-[10px] text-brand-tertiary font-medium m-0 line-clamp-2 leading-tight">
                              {book.serviceNames.join(', ')}
                            </p>
                            <span className="text-[10px] text-brand-secondary font-semibold block">Profissional: {book.specialistName}</span>

                            <div className="pt-2 border-t border-brand-primary-light/10 flex flex-wrap gap-2 justify-end">
                              {book.status === 'pendente' && (
                                <>
                                  <button 
                                    onClick={() => handleConfirmAndSendWhatsapp(book)}
                                    className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                    title="WhatsApp & Confirmar"
                                  >
                                    <Check className="w-3.5 h-3.5" /> Confirmar (WhatsApp)
                                  </button>
                                  <button 
                                    onClick={() => handleUpdateBookingStatus(book.id, 'cancelado')}
                                    className="p-1.5 bg-red-100 text-red-700 rounded-lg text-[10px] cursor-pointer hover:bg-red-600 hover:text-white transition-colors"
                                    title="Recusar"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}

                              {book.status === 'confirmado' && (
                                <button 
                                  onClick={() => handleFinalizeBooking(book.id)}
                                  className="p-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer animate-pulse-slow"
                                >
                                  <DollarSign className="w-3.5 h-3.5" /> Finalizar Atendimento (Financeiro)
                                </button>
                              )}

                              {book.status === 'finalizado' && (
                                <span className="text-[9px] text-emerald-800 font-bold bg-emerald-50 px-2 py-1 rounded">
                                  ✓ Enviado Financeiro
                                </span>
                              )}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* VIEW 3: STAFF TEAM LIST */}
          {activeTab === 'equipe' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <span className="font-sans text-[11px] font-semibold text-brand-primary tracking-widest uppercase">Colaboradores</span>
                  <h2 className="font-display text-3xl text-brand-dark">Gestão de Equipe</h2>
                  <p className="text-brand-tertiary text-sm">Monitore suas especialistas, tarifas de comissões e agenda ativa.</p>
                </div>
                
                <button 
                  onClick={handleCreateNewSpecialistInit}
                  className="bg-brand-primary text-white hover:bg-brand-primary-light hover:text-brand-primary py-3 px-6 rounded-full font-bold text-xs uppercase tracking-wider shadow-lg flex items-center gap-1.5 transition-transform active:scale-95"
                >
                  <UserPlus className="w-4 h-4" /> Adicionar Profissional
                </button>
              </div>

              {/* Specialists grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {specialists.map(spec => (
                  <div 
                    key={spec.id}
                    className="bg-white border border-brand-primary-light/40 rounded-2xl p-5 flex flex-col justify-between shadow-sm relative group hover:shadow-md transition-shadow"
                  >
                    {/* Inline action triggers */}
                    <div className="absolute top-4 right-4 flex gap-1.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleResetPassword(spec)}
                        className="w-7 h-7 bg-[#faf9f8] border border-[#d6c2c4]/40 hover:bg-brand-secondary hover:text-white rounded-full flex items-center justify-center cursor-pointer shadow-sm transition-colors"
                        title="Resetar senha"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleEditSpecialist(spec)}
                        className="w-7 h-7 bg-[#faf9f8] border border-[#d6c2c4]/40 hover:bg-brand-primary hover:text-white rounded-full flex items-center justify-center cursor-pointer shadow-sm transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSpecialist(spec.id)}
                        className="w-7 h-7 bg-red-50 border border-red-200/50 text-red-600 hover:bg-red-600 hover:text-white rounded-full flex items-center justify-center cursor-pointer shadow-sm transition-colors"
                        title="Remover Profissional"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Role / login status badges */}
                    <div className="absolute top-4 left-4 flex gap-1.5">
                      {spec.roleType === 'admin' && (
                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-brand-primary text-white rounded-full">Admin</span>
                      )}
                      {!spec.username && (
                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 rounded-full">Sem login</span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-brand-primary-light">
                        <img src={spec.avatarUrl} alt={spec.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-sans font-bold text-base text-brand-dark truncate">{spec.name}</h3>
                        <p className="text-xs text-brand-primary font-semibold truncate">{spec.role}</p>
                        {spec.specialty && (
                          <p className="text-[10px] text-brand-tertiary mt-0.5 truncate italic">
                            Especialidade: {spec.specialty}
                          </p>
                        )}
                        <div className="flex items-center gap-1 text-[10px] text-brand-secondary font-bold mt-1 uppercase">
                          <Star className="w-3 h-3 text-brand-secondary fill-current" />
                          <span>{spec.rating} • {spec.active ? 'Ativa' : 'Inativa'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Commissions Snapshot */}
                    <div className="bg-brand-secondary-light/20 p-3.5 rounded-xl border border-brand-primary-light/10 grid grid-cols-2 text-center text-xs">
                      <div className="border-r border-brand-primary-light/15">
                        <span className="block text-[9px] uppercase font-bold text-brand-tertiary opacity-70 mb-0.5">Comissão</span>
                        <span className="font-sans font-bold text-brand-secondary">{spec.commission}%</span>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase font-bold text-brand-tertiary opacity-70 mb-0.5">Sessões</span>
                        <span className="font-sans font-bold text-brand-dark">{spec.attendanceCount}</span>
                      </div>
                    </div>

                    <div className="mt-3 border-t border-brand-primary-light/15 pt-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-tertiary">Agenda</span>
                      <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5">
                        {formatScheduleShort(spec.weeklySchedule).map(row => (
                          <div key={row.day} className="flex items-baseline gap-2 text-[11px]">
                            <span className="font-bold text-brand-primary w-7">{row.day}:</span>
                            <span className={row.text === 'Folga' ? 'text-brand-tertiary italic' : 'text-brand-dark'}>{row.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add dummy click container */}
                <div 
                  onClick={handleCreateNewSpecialistInit}
                  className="border-2 border-dashed border-brand-primary-light/40 rounded-2xl p-6 flex flex-col justify-center items-center text-center cursor-pointer hover:bg-brand-primary-light/10 hover:border-brand-primary transition-all min-h-[160px]"
                >
                  <PlusCircle className="w-10 h-10 text-brand-primary mb-2" />
                  <span className="font-sans font-semibold text-brand-primary text-sm">Contratar novo membro</span>
                </div>

              </div>
            </div>
          )}

          {activeTab === 'minha_agenda' && !isAdmin && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <span className="font-sans text-[11px] font-semibold text-brand-primary tracking-widest uppercase font-bold">Configuração</span>
                  <h2 className="font-display text-3xl text-brand-dark">Minha Agenda Semanal</h2>
                  <p className="text-brand-tertiary text-sm">Defina os dias e horários em que você atende. Domingos e folgas ficam vazios.</p>
                </div>
                <button
                  type="button"
                  disabled={!isScheduleValid(scheduleDraft) || scheduleSaving}
                  onClick={async () => {
                    if (!scheduleDraft) return;
                    setScheduleSaving(true);
                    try {
                      const res = await fetch('/api/specialists/me/schedule', {
                        method: 'PUT',
                        headers: authHeaders(),
                        body: JSON.stringify({ weeklySchedule: scheduleDraft }),
                      });
                      const data = await res.json().catch(() => ({}));
                      if (res.ok) {
                        onRefreshData();
                        showToast('Agenda salva!');
                      } else {
                        showToast(data.error || 'Erro ao salvar agenda.');
                      }
                    } catch (e) {
                      console.error(e);
                      showToast('Erro ao conectar com o servidor.');
                    } finally {
                      setScheduleSaving(false);
                    }
                  }}
                  className="bg-brand-primary text-white hover:bg-brand-primary-light hover:text-brand-primary py-3 px-6 rounded-full font-bold text-xs uppercase tracking-wider shadow-lg disabled:opacity-50"
                >
                  {scheduleSaving ? 'Salvando...' : 'Salvar Agenda'}
                </button>
              </div>

              <p className="text-xs text-brand-tertiary">Clique nos horários que você quer abrir. Os horários selecionados (rosé) ficam disponíveis pro cliente agendar. A duração do serviço bloqueia os slots seguintes automaticamente.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as WeekDay[]).map(dayKey => {
                  const labels: Record<WeekDay, string> = {
                    monday: 'Segunda', tuesday: 'Terça', wednesday: 'Quarta',
                    thursday: 'Quinta', friday: 'Sexta', saturday: 'Sábado', sunday: 'Domingo',
                  };
                  const openSet = new Set(scheduleDraft?.[dayKey] ?? []);
                  const toggle = (slot: string) => setScheduleDraft(prev => {
                    if (!prev) return prev;
                    const cur = new Set(prev[dayKey]);
                    if (cur.has(slot)) cur.delete(slot); else cur.add(slot);
                    return { ...prev, [dayKey]: [...cur].sort() };
                  });
                  return (
                    <div key={dayKey} className="bg-white border border-brand-primary-light/25 rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-sans font-bold text-sm text-brand-dark">{labels[dayKey]}</h3>
                        <span className="text-[10px] text-brand-tertiary">{openSet.size} horários</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 mb-3">
                        {ALL_POSSIBLE_SLOTS.map(slot => {
                          const isOpen = openSet.has(slot);
                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => toggle(slot)}
                              className={`text-[11px] font-mono py-1 rounded transition-all ${
                                isOpen
                                  ? 'bg-brand-primary text-white shadow-sm'
                                  : 'bg-[#faf9f8] text-brand-tertiary hover:bg-brand-primary-light/30 hover:text-brand-primary'
                              }`}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setScheduleDraft(prev => prev ? { ...prev, [dayKey]: [...ALL_POSSIBLE_SLOTS] } : prev)}
                          className="text-[10px] text-brand-primary hover:underline"
                        >
                          Selecionar todos
                        </button>
                        <button
                          type="button"
                          onClick={() => setScheduleDraft(prev => prev ? { ...prev, [dayKey]: [] } : prev)}
                          className="text-[10px] text-brand-tertiary hover:text-rose-600"
                        >
                          Folga
                        </button>
                        <button
                          type="button"
                          onClick={() => setScheduleDraft(prev => {
                            if (!prev) return prev;
                            const src = [...prev[dayKey]].sort();
                            const next = { ...prev };
                            (['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as WeekDay[]).forEach(k => {
                              next[k] = [...src];
                            });
                            return next;
                          })}
                          className="text-[10px] text-brand-primary hover:underline ml-auto"
                          title="Aplicar a seleção deste dia em todos os dias da semana"
                        >
                          Replicar p/ semana
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {scheduleDraft && !isScheduleValid(scheduleDraft) && (
                <p className="text-xs text-rose-600">Há horários inválidos no rascunho. Corrija antes de salvar.</p>
              )}
            </div>
          )}

          {/* VIEW 4: FINANCIAL SUMMARY PORTAL */}
          {activeTab === 'financeiro' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <span className="font-sans text-[11px] font-semibold text-brand-primary tracking-widest uppercase font-bold">{isAdmin ? 'Fluxo de Caixa' : 'Meus Atendimentos'}</span>
                  <h2 className="font-display text-3xl text-brand-dark">{isAdmin ? 'Resumo Financeiro' : 'Meu Financeiro'}</h2>
                  <p className="text-brand-tertiary text-sm">{isAdmin ? 'Acompanhe a saúde do seu santuário em tempo real.' : 'Acompanhe seus atendimentos e repasses no período selecionado.'}</p>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { resetTransactionForm(); setActiveTab('nova_operacao'); }}
                      className="bg-brand-primary text-white hover:bg-brand-primary-light hover:text-brand-primary py-3 px-6 rounded-full font-bold text-xs uppercase tracking-wider shadow-lg flex items-center gap-1.5 transition-transform active:scale-95"
                    >
                      <Plus className="w-4 h-4" /> Lançar Operação
                    </button>
                  </div>
                )}
              </div>

              {/* Period filter */}
              <div className="bg-white border border-brand-primary-light/25 rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-3">
                <label className="text-[11px] font-bold uppercase tracking-wider text-brand-tertiary">Período</label>
                <select
                  value={periodKey}
                  onChange={(e) => setPeriodKey(e.target.value as PeriodKey)}
                  className="bg-[#faf9f8] border border-[#d6c2c4]/50 rounded-xl px-3 py-2 text-sm font-sans text-brand-dark outline-none focus:border-brand-primary"
                >
                  <option value="thisMonth">Este mês</option>
                  <option value="lastMonth">Mês passado</option>
                  <option value="last30">Últimos 30 dias</option>
                  <option value="thisYear">Este ano</option>
                  <option value="custom">Personalizado</option>
                </select>
                {periodKey === 'custom' && (
                  <>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="bg-[#faf9f8] border border-[#d6c2c4]/50 rounded-xl px-3 py-2 text-sm"
                    />
                    <span className="text-brand-tertiary text-sm">até</span>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="bg-[#faf9f8] border border-[#d6c2c4]/50 rounded-xl px-3 py-2 text-sm"
                    />
                  </>
                )}
                <button
                  type="button"
                  onClick={() => { setPeriodKey('thisMonth'); setCustomStart(''); setCustomEnd(''); }}
                  className="ml-auto text-[11px] font-bold uppercase tracking-wider text-brand-primary hover:underline"
                >
                  Limpar filtro
                </button>
              </div>

              {/* Stats Cards Row */}
              {isAdmin ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {/* Entradas */}
                  <div className="bg-white border border-brand-primary-light/25 rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-sans text-[10px] font-bold text-brand-tertiary uppercase tracking-wider">Entradas</span>
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h3 className="font-display text-2xl lg:text-3xl text-brand-primary font-bold">
                      R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h3>
                    <p className="text-xs text-slate-500 mt-2">Geração de sessões e vendas</p>
                  </div>
                  {/* Saidas */}
                  <div className="bg-white border border-brand-primary-light/25 rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-sans text-[10px] font-bold text-brand-tertiary uppercase tracking-wider">Saídas</span>
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    </div>
                    <h3 className="font-display text-2xl lg:text-3xl text-brand-dark font-bold">
                      R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h3>
                    <p className="text-xs text-slate-500 mt-2">Custos com materiais e equipe</p>
                  </div>
                  {/* Net Profit */}
                  <div className="bg-brand-secondary text-white rounded-2xl p-6 shadow-md">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-sans text-[10px] font-bold uppercase tracking-wider opacity-75">Lucro Líquido</span>
                      <DollarSign className="w-5 h-5 opacity-75" />
                    </div>
                    <h3 className="font-display text-2xl lg:text-3xl font-bold">
                      R$ {netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h3>
                    <p className="text-xs opacity-75 mt-2">Saldo total consolidado</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {/* Faturamento Gerado */}
                  <div className="bg-white border border-brand-primary-light/25 rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-sans text-[10px] font-bold text-brand-tertiary uppercase tracking-wider">Faturamento Gerado</span>
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h3 className="font-display text-2xl lg:text-3xl text-brand-primary font-bold">
                      R$ {myGenerated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h3>
                    <p className="text-xs text-slate-500 mt-2">Atendimentos seus no período</p>
                  </div>
                  {/* Sua Comissão (%) */}
                  <div className="bg-white border border-brand-primary-light/25 rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-sans text-[10px] font-bold text-brand-tertiary uppercase tracking-wider">Sua Comissão</span>
                      <DollarSign className="w-5 h-5 text-brand-secondary" />
                    </div>
                    <h3 className="font-display text-2xl lg:text-3xl text-brand-dark font-bold">
                      {myCommissionPct}%
                    </h3>
                    <p className="text-xs text-slate-500 mt-2">Definida pela administração</p>
                  </div>
                  {/* Repasse Estimado */}
                  <div className="bg-brand-secondary text-white rounded-2xl p-6 shadow-md">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-sans text-[10px] font-bold uppercase tracking-wider opacity-75">Repasse Estimado</span>
                      <DollarSign className="w-5 h-5 opacity-75" />
                    </div>
                    <h3 className="font-display text-2xl lg:text-3xl font-bold">
                      R$ {myEstimatedPayout.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h3>
                    <p className="text-xs opacity-75 mt-2">Faturamento × comissão</p>
                  </div>
                </div>
              )}

              {/* Transactions History Table */}
              <div className="bg-white border border-[#d6c2c4]/20 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-5 border-b border-brand-primary-light/10 flex justify-between items-center">
                  <h3 className="font-sans font-bold text-base text-brand-dark">{isAdmin ? 'Histórico de Lançamentos' : 'Meus Atendimentos'} ({filteredTransactions.length})</h3>
                  {isAdmin && (
                    <button onClick={() => setActiveTab('relatorio_detalhado')} className="text-xs text-brand-primary font-bold hover:underline flex items-center gap-1">
                      <Printer className="w-3.5 h-3.5" /> Detalhar Relatório
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-[#faf9f8] border-b border-brand-primary-light/10 text-xs font-bold text-brand-tertiary">
                        <th className="p-4">Descrição</th>
                        <th className="p-4">Data</th>
                        <th className="p-4">Categoria</th>
                        <th className="p-4 text-right">Valor</th>
                        {isAdmin && <th className="p-4 text-right">Ações</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-primary-light/10">
                      {filteredTransactions.map(t => (
                        <tr key={t.id} className="hover:bg-[#faf9f8] text-xs transition-colors">
                          <td className="p-4 font-sans font-bold text-brand-dark">
                            {t.description}
                            {isAdmin && t.specialistName && (
                              <span className="block text-[10px] text-brand-secondary font-semibold mt-0.5">Gerado por: {t.specialistName}</span>
                            )}
                          </td>
                          <td className="p-4 text-brand-tertiary">{t.date}</td>
                          <td className="p-4 text-brand-tertiary">
                            <span className="px-2 py-0.5 bg-brand-primary-light/20 text-brand-primary rounded text-[9px] font-bold">
                              {t.category}
                            </span>
                          </td>
                          <td className={`p-4 text-right font-bold ${t.type === 'entrada' ? 'text-emerald-600' : 'text-brand-primary'}`}>
                            {t.type === 'entrada' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          {isAdmin && (
                            <td className="p-4 text-right">
                              <div className="inline-flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditTransaction(t)}
                                  title="Editar"
                                  className="p-1.5 rounded hover:bg-brand-primary-light/30 text-brand-primary"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTransaction(t)}
                                  title="Excluir"
                                  className="p-1.5 rounded hover:bg-rose-100 text-rose-600"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 5: PRINT COMPLIANT MONTHLY STATEMENT */}
          {activeTab === 'relatorio_detalhado' && (
            <div className="space-y-8 print-container">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 no-print">
                <div>
                  <span className="font-sans text-[11px] font-semibold text-brand-primary tracking-widest uppercase">Exportação</span>
                  <h2 className="font-display text-3xl text-brand-dark">Relatório de Repasses & Comissões</h2>
                  <p className="text-brand-tertiary text-sm">Demonstrativo consolidado para arquivamento e faturamento de equipe.</p>
                </div>

                <button 
                  onClick={() => window.print()}
                  className="bg-brand-secondary text-white hover:bg-brand-primary-light hover:text-brand-primary py-3 px-6 rounded-full font-bold text-xs uppercase tracking-wider shadow flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Exportar / Imprimir PDF
                </button>
              </div>

              <div className="no-print">
                {/* Period filter — mesma estrutura da aba Financeiro */}
                <div className="bg-white border border-brand-primary-light/25 rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-3">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-brand-tertiary">Período</label>
                  <select
                    value={periodKey}
                    onChange={(e) => setPeriodKey(e.target.value as PeriodKey)}
                    className="bg-[#faf9f8] border border-[#d6c2c4]/50 rounded-xl px-3 py-2 text-sm font-sans text-brand-dark outline-none focus:border-brand-primary"
                  >
                    <option value="thisMonth">Este mês</option>
                    <option value="lastMonth">Mês passado</option>
                    <option value="last30">Últimos 30 dias</option>
                    <option value="thisYear">Este ano</option>
                    <option value="custom">Personalizado</option>
                  </select>
                  {periodKey === 'custom' && (
                    <>
                      <input
                        type="date"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className="bg-[#faf9f8] border border-[#d6c2c4]/50 rounded-xl px-3 py-2 text-sm"
                      />
                      <span className="text-brand-tertiary text-sm">até</span>
                      <input
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className="bg-[#faf9f8] border border-[#d6c2c4]/50 rounded-xl px-3 py-2 text-sm"
                      />
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => { setPeriodKey('thisMonth'); setCustomStart(''); setCustomEnd(''); }}
                    className="ml-auto text-[11px] font-bold uppercase tracking-wider text-brand-primary hover:underline"
                  >
                    Limpar filtro
                  </button>
                </div>
              </div>

              {/* PRINT ELEMENT CONTROLLER CONTAINER */}
              <div className="bg-white p-8 border border-[#d6c2c4]/30 rounded-2xl shadow-sm space-y-6">
                {/* Invoice Letterhead */}
                <div className="flex justify-between items-start border-b border-brand-primary-light/20 pb-6">
                  <div>
                    <h1 className="font-display text-2xl text-brand-primary tracking-widest uppercase font-bold">ALVES ESTÉTICA</h1>
                    <p className="text-xs text-brand-tertiary font-sans mt-1">Santuário de Beleza & Bem-estar Feminino</p>
                  </div>
                  <div className="text-right">
                    <span className="font-sans text-[10px] font-bold text-brand-secondary uppercase tracking-widest">Demonstrativo de Caixa</span>
                    <p className="text-xs text-brand-dark font-sans mt-1">Período: {activeRange.start.split('-').reverse().join('/')} – {activeRange.end.split('-').reverse().join('/')}</p>
                  </div>
                </div>

                {/* Substats */}
                <div className="grid grid-cols-3 gap-6 py-4">
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-brand-tertiary/70">Faturamento Geral</span>
                    <span className="font-sans font-bold text-base text-brand-dark">R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-brand-tertiary/70">Comissão de Equipe</span>
                    <span className="font-sans font-bold text-base text-brand-primary">R$ {(totalRevenue * 0.35).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-brand-tertiary/70">Lucro Líquido Real</span>
                    <span className="font-sans font-bold text-base text-emerald-700">R$ {netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Specialists Commission calculations */}
                <p className="text-[10px] text-brand-tertiary italic mt-6 mb-1">Comissões refletem o acumulado da equipe (não filtrado pelo período acima).</p>
                <div className="border border-brand-primary-light/20 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-[#faf9f8] text-xs font-bold text-brand-tertiary">
                        <th className="p-4">Colaboradora</th>
                        <th className="p-4 text-center">Atendimentos</th>
                        <th className="p-4 text-right">Comissão (%)</th>
                        <th className="p-4 text-right">Valor Payout</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-primary-light/10 text-xs">
                      {specialists.map(s => {
                        // calculate generated revenue (estimate based on session count * R$ 220 average or actual linked transactions)
                        const count = s.attendanceCount;
                        const estimateGenerated = count * 220;
                        const payout = (estimateGenerated * s.commission) / 100;
                        return (
                          <tr key={s.id}>
                            <td className="p-4 font-sans font-bold text-brand-dark">
                              {s.name}
                              <span className="block text-[10px] text-brand-tertiary/75 font-normal mt-0.5">{s.role}</span>
                            </td>
                            <td className="p-4 text-center text-brand-tertiary">{count}</td>
                            <td className="p-4 text-right text-brand-tertiary">{s.commission}%</td>
                            <td className="p-4 text-right font-bold text-brand-secondary">
                              R$ {payout.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="text-center pt-8 text-[10px] text-brand-tertiary border-t border-brand-primary-light/15">
                  Demonstrativo Alves Estética • Lançamento autenticado em 22 de Maio de 2026.
                </div>
              </div>
            </div>
          )}

          {/* VIEW 6: NEW TRANSACTION ENTRY */}
          {activeTab === 'nova_operacao' && (
            <div className="space-y-8 max-w-xl mx-auto">
              <div>
                <span className="font-sans text-[11px] font-semibold text-brand-primary tracking-widest uppercase">Lançamento de Caixa</span>
                <h2 className="font-display text-3xl text-brand-dark">{editingTransactionId ? 'Editar Lançamento' : 'Lançar Nova Operação'}</h2>
                <p className="text-brand-tertiary text-sm">Registre suas movimentações com elegância e precisão contábil.</p>
              </div>

              {/* Form card */}
              <div className="bg-white p-6 rounded-2xl border border-brand-primary-light/35 shadow-md">
                
                {/* Toggle Operation Tab */}
                <div className="flex bg-[#faf9f8] p-1 rounded-full border border-brand-primary-light/15 mb-6">
                  <button 
                    type="button"
                    onClick={() => { setTransType('saida'); setTransCategory('Materiais'); }}
                    className={`flex-1 py-2 font-sans font-bold text-xs rounded-full uppercase transition-all ${
                      transType === 'saida' ? 'bg-brand-primary text-white shadow-sm' : 'text-brand-tertiary'
                    }`}
                  >
                    SAÍDA (Custo/Despesa)
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setTransType('entrada'); setTransCategory('Serviços'); }}
                    className={`flex-1 py-2 font-sans font-bold text-xs rounded-full uppercase transition-all ${
                      transType === 'entrada' ? 'bg-brand-primary text-white shadow-sm' : 'text-brand-tertiary'
                    }`}
                  >
                    ENTRADA (Receita/Venda)
                  </button>
                </div>

                <form onSubmit={editingTransactionId ? handleUpdateTransaction : handleCreateTransaction} className="space-y-6">
                  
                  {/* Descript */}
                  <div className="space-y-1">
                    <label className="font-sans text-[11px] font-bold uppercase tracking-widest text-[#847375] block ml-1">Descrição</label>
                    <input 
                      type="text"
                      required
                      placeholder={transType === 'entrada' ? 'Ex: Venda de creme anti-idade' : 'Ex: Compra de creme facial massagem'}
                      value={transDescription}
                      onChange={(e) => setTransDescription(e.target.value)}
                      className="w-full bg-[#faf9f8] border border-[#d6c2c4]/50 rounded-xl px-4 py-3 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Amount */}
                    <div className="space-y-1">
                      <label className="font-sans text-[11px] font-bold uppercase tracking-widest text-[#847375] block ml-1">Valor (R$)</label>
                      <input 
                        type="number"
                        required
                        step="0.01"
                        placeholder="0,00"
                        value={transAmount}
                        onChange={(e) => setTransAmount(e.target.value)}
                        className="w-full bg-[#faf9f8] border border-[#d6c2c4]/50 rounded-xl px-4 py-3 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none"
                      />
                    </div>

                    {/* Date */}
                    <div className="space-y-1">
                      <label className="font-sans text-[11px] font-bold uppercase tracking-widest text-[#847375] block ml-1">Data</label>
                      <input 
                        type="date"
                        required
                        value={transDate}
                        onChange={(e) => setTransDate(e.target.value)}
                        className="w-full bg-[#faf9f8] border border-[#d6c2c4]/50 rounded-xl px-4 py-3 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none"
                      />
                    </div>
                  </div>

                  {/* Category Chips */}
                  <div className="space-y-2">
                    <label className="font-sans text-[11px] font-bold uppercase tracking-widest text-[#847375] block ml-1">Categoria</label>
                    <div className="flex flex-wrap gap-2">
                      {categories[transType].map(cat => {
                        const isSelected = transCategory === cat;
                        return (
                          <button 
                            type="button"
                            key={cat}
                            onClick={() => setTransCategory(cat)}
                            className={`px-4 py-2 rounded-full border text-xs font-semibold tracking-wide transition-all ${
                              isSelected 
                                ? 'bg-brand-primary text-white border-brand-primary shadow-sm' 
                                : 'bg-[#faf9f8] border-[#d6c2c4]/50 text-brand-tertiary hover:bg-brand-primary-light/10'
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Linked Specialist Choice (Optional Input Context) */}
                  <div className="space-y-1 pt-2">
                    <label className="font-sans text-[11px] font-bold uppercase tracking-widest text-[#847375] block ml-1">Profissional Associada (Opcional)</label>
                    <select 
                      value={transSpecialistId}
                      onChange={(e) => setTransSpecialistId(e.target.value)}
                      className="w-full bg-[#faf9f8] border border-[#d6c2c4]/50 rounded-xl px-4 py-3 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none"
                    >
                      <option value="">Nenhuma profissional</option>
                      {specialists.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 flex gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        resetTransactionForm();
                        setActiveTab('financeiro');
                      }}
                      className="flex-1 py-3 border border-brand-tertiary/40 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-[#faf9f8]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-brand-primary text-white hover:bg-brand-primary-light hover:text-brand-primary py-3 rounded-full font-bold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-1.5 transition-transform active:scale-95"
                    >
                      {editingTransactionId ? 'Salvar Alterações' : 'Lançar Operação'}
                    </button>
                  </div>

                </form>
              </div>
            </div>
          )}

          {/* VIEW 7: SPECIALIST CONFIGURATION FORM */}
          {activeTab === 'config_especialist' && (
            <div className="space-y-8 max-w-2xl mx-auto">
              <div>
                <span className="font-sans text-[11px] font-semibold text-brand-primary tracking-widest uppercase">Modificar Equipe</span>
                <h2 className="font-display text-3xl text-brand-dark">Configurações da Profissional</h2>
                <p className="text-brand-tertiary text-sm">Gerencie dados, qualificações, taxas de comissão e tratamentos associados.</p>
              </div>

              {/* Form Layout Grid */}
              <form onSubmit={handleSaveSpecialistSettings} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left side: Avatar */}
                <div className="lg:col-span-4 bg-white p-6 border border-brand-primary-light/35 rounded-2xl shadow-sm flex flex-col items-center justify-between text-center gap-4">
                  <div className="space-y-1">
                    <span className="font-sans text-[10px] font-bold text-[#847375] uppercase block">Foto de Perfil</span>
                    <div className="relative group cursor-pointer w-28 h-28 rounded-full overflow-hidden border-2 border-dashed border-brand-primary">
                      <img src={specAvatar || 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=300'} alt="Avatar Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-brand-primary/30 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus className="w-6 h-6" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 w-full">
                    <label className="font-sans text-[11px] font-bold uppercase text-[#847375] block">URL do Avatar</label>
                    <input 
                      type="text"
                      value={specAvatar}
                      onChange={(e) => setSpecAvatar(e.target.value)}
                      className="w-full bg-[#faf9f8] border border-[#d6c2c4]/50 rounded-lg px-2 py-1 text-xs outline-none"
                    />
                  </div>

                  {/* Status account */}
                  <div className="flex items-center justify-between w-full border-t border-brand-primary-light/10 pt-4">
                    <span className="text-xs text-brand-tertiary font-bold">Estado Ativa</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={specActive}
                        onChange={(e) => setSpecActive(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-brand-tertiary/20 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary"></div>
                    </label>
                  </div>
                </div>

                {/* Right side: Information inputs */}
                <div className="lg:col-span-8 space-y-6">
                  <div className="bg-white p-6 border border-brand-primary-light/35 rounded-2xl shadow-sm space-y-4">
                    {/* Name */}
                    <div className="space-y-1">
                      <label className="font-sans text-[11px] font-bold uppercase tracking-widest text-[#847375] block ml-1">Nome Completo</label>
                      <input 
                        type="text"
                        required
                        value={specName}
                        onChange={(e) => setSpecName(e.target.value)}
                        className="w-full bg-[#faf9f8] border border-[#d6c2c4]/50 rounded-xl px-4 py-3 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none"
                        placeholder="Ex: Beatriz Silveira"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Cargo Input */}
                      <div className="space-y-1">
                        <label className="font-sans text-[11px] font-bold uppercase tracking-widest text-[#847375] block ml-1">Cargo</label>
                        <input 
                          type="text"
                          required
                          value={specRole}
                          onChange={(e) => setSpecRole(e.target.value)}
                          className="w-full bg-[#faf9f8] border border-[#d6c2c4]/50 rounded-xl px-4 py-3 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none"
                          placeholder="Ex: Esteticista Sênior"
                        />
                      </div>

                      {/* specialty Input */}
                      <div className="space-y-1">
                        <label className="font-sans text-[11px] font-bold uppercase tracking-widest text-[#847375] block ml-1 font-bold">Especialidade</label>
                        <input 
                          type="text"
                          value={specSpecialty}
                          onChange={(e) => setSpecSpecialty(e.target.value)}
                          className="w-full bg-[#faf9f8] border border-[#d6c2c4]/50 rounded-xl px-4 py-3 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none"
                          placeholder="Ex: Botox, Peeling, Massagem"
                        />
                      </div>

                      {/* Commission % */}
                      <div className="space-y-1">
                        <label className="font-sans text-[11px] font-bold uppercase tracking-widest text-[#847375] block ml-1">Comissão (%)</label>
                        <input 
                          type="number"
                          required
                          min="0"
                          max="100"
                          value={specCommission}
                          onChange={(e) => setSpecCommission(parseInt(e.target.value) || 0)}
                          className="w-full bg-[#faf9f8] border border-[#d6c2c4]/50 rounded-xl px-4 py-3 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Login credentials (admin only sees this view) */}
                  <div className="bg-white p-6 border border-brand-primary-light/35 rounded-2xl shadow-sm space-y-4">
                    <span className="font-sans text-[11px] font-bold tracking-widest text-brand-primary block uppercase">Credenciais de Acesso</span>
                    <div className="bg-brand-primary-light/10 border border-brand-primary-light/40 rounded-xl p-3 text-[11px] text-brand-dark leading-snug">
                      <strong>Como a profissional faz login:</strong> defina <strong>Usuário</strong> e <strong>Nova senha</strong> abaixo e compartilhe com ela. Ela entra em <code className="font-mono bg-white px-1 rounded">/admin</code> com essas credenciais e verá apenas a própria agenda. Para criar outro administrador, mude <strong>Permissão</strong> para <em>Administrador</em>.
                    </div>
                    <p className="text-[11px] text-brand-tertiary">Ao editar uma profissional existente, deixe a senha em branco para mantê-la.</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="font-sans text-[11px] font-bold uppercase tracking-widest text-[#847375] block ml-1">Usuário</label>
                        <input
                          type="text"
                          value={specUsername}
                          onChange={(e) => setSpecUsername(e.target.value)}
                          className="w-full bg-[#faf9f8] border border-[#d6c2c4]/50 rounded-xl px-4 py-3 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none"
                          placeholder="ex: gabriela"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-sans text-[11px] font-bold uppercase tracking-widest text-[#847375] block ml-1">Nova senha</label>
                        <input
                          type="password"
                          value={specNewPassword}
                          onChange={(e) => setSpecNewPassword(e.target.value)}
                          className="w-full bg-[#faf9f8] border border-[#d6c2c4]/50 rounded-xl px-4 py-3 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none"
                          placeholder={isNewSpec ? 'Senha inicial' : '(manter)'}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-sans text-[11px] font-bold uppercase tracking-widest text-[#847375] block ml-1">Permissão</label>
                        <select
                          value={specRoleType}
                          onChange={(e) => setSpecRoleType(e.target.value as 'admin' | 'professional')}
                          className="w-full bg-[#faf9f8] border border-[#d6c2c4]/50 rounded-xl px-4 py-3 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none"
                        >
                          <option value="professional">Profissional</option>
                          <option value="admin">Administrador</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Performed services card list */}
                  <div className="bg-white p-6 border border-brand-primary-light/35 rounded-2xl shadow-sm space-y-4">
                    <span className="font-sans text-[11px] font-bold tracking-widest text-brand-primary block uppercase">Serviços Habilitados</span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {services.map(service => {
                        const isAssociated = specSelectedServices.includes(service.id);
                        return (
                          <div 
                            key={service.id}
                            onClick={() => handleToggleSpecService(service.id)}
                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                              isAssociated 
                                ? 'border-brand-primary bg-brand-primary-light/10 text-brand-primary font-bold' 
                                : 'border-[#d6c2c4]/20 hover:border-brand-primary-light text-brand-tertiary'
                            }`}
                          >
                            <div className="w-5 h-5 flex items-center justify-center rounded bg-[#faf9f8] text-brand-primary">
                              {isAssociated ? <Check className="w-3.5 h-3.5" /> : null}
                            </div>
                            <span className="text-xs">{service.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Submission triggers */}
                  <div className="flex gap-4">
                    <button 
                      type="button"
                      onClick={() => setActiveTab('equipe')}
                      className="flex-1 py-3 border border-brand-tertiary/40 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-[#faf9f8]"
                    >
                      Cancelar / Descartar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 bg-brand-primary text-white hover:bg-brand-primary-light hover:text-brand-primary py-3 rounded-full font-bold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-1.5 transition-transform active:scale-95"
                    >
                      Salvar Alterações
                    </button>
                  </div>

                </div>

              </form>
            </div>
          )}

          {/* VIEW: GESTÃO DE SERVIÇOS */}
          {activeTab === 'servicos' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl text-brand-dark font-semibold">Gestão de Serviços</h2>
                  <p className="text-xs text-brand-tertiary mt-1">Estimule seu faturamento editando, descartando ou criando novos procedimentos habilitados no salão</p>
                </div>
                <button 
                  onClick={handleCreateNewServiceInit}
                  className="bg-brand-primary text-white hover:bg-brand-primary-light hover:text-brand-primary px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition-all duration-300 self-start cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" /> Cadastrar Procedimento
                </button>
              </div>

              {services.length === 0 ? (
                <div className="bg-white border text-center border-brand-primary-light/40 rounded-2xl p-12 text-brand-tertiary">
                  <p className="text-sm font-semibold">Nenhum serviço cadastrado.</p>
                  <button 
                    onClick={handleCreateNewServiceInit}
                    className="mt-4 text-xs font-bold text-brand-primary uppercase tracking-wider hover:underline"
                  >
                    Cadastrar o primeiro serviço
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  {Array.from(new Set(services.map(s => s.category))).map(category => {
                    const catServices = services.filter(s => s.category === category);
                    return (
                      <div key={category} className="space-y-4">
                        <div className="border-b border-[#d6c2c4]/20 pb-2">
                          <h3 className="font-display text-lg text-brand-primary font-bold">{category}</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                          {catServices.map(service => (
                            <div 
                              key={service.id}
                              className="bg-white border border-brand-primary-light/40 rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow relative group"
                            >
                              {/* Action controls */}
                              <div className="absolute top-4 right-4 flex gap-1.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => handleEditService(service)}
                                  className="w-7 h-7 bg-[#faf9f8] border border-[#d6c2c4]/40 hover:bg-brand-primary hover:text-white rounded-full flex items-center justify-center cursor-pointer shadow-sm transition-colors"
                                  title="Editar Serviço"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteService(service.id)}
                                  className="w-7 h-7 bg-red-50 border border-red-200/50 text-red-600 hover:bg-red-600 hover:text-white rounded-full flex items-center justify-center cursor-pointer shadow-sm transition-colors"
                                  title="Descartar Serviço"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-brand-primary-light/20 flex items-center justify-center text-brand-primary">
                                    {service.icon === 'Activity' && <Activity className="w-4 h-4" />}
                                    {service.icon === 'Heart' && <Heart className="w-4 h-4" />}
                                    {service.icon === 'Flame' && <Flame className="w-4 h-4" />}
                                    {service.icon === 'Leaf' && <Leaf className="w-4 h-4" />}
                                    {service.icon === 'Sun' && <Sun className="w-4 h-4 text-brand-secondary" />}
                                    {service.icon === 'Droplet' && <Droplet className="w-4 h-4" />}
                                    {service.icon === 'Gem' && <Gem className="w-5 h-5 text-brand-[#d6c2c4]" />}
                                    {service.icon !== 'Activity' && service.icon !== 'Heart' && service.icon !== 'Flame' && service.icon !== 'Leaf' && service.icon !== 'Sun' && service.icon !== 'Droplet' && service.icon !== 'Gem' && <Sparkles className="w-4 h-4" />}
                                  </div>
                                  <h4 className="font-sans font-bold text-base text-brand-dark pr-12 line-clamp-2 leading-snug">{service.name}</h4>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-[#847375] border-t border-brand-primary-light/10 pt-3">
                                  <div className="flex flex-col">
                                    <span className="text-[10px] uppercase tracking-wider text-brand-tertiary">Preço</span>
                                    <span className="text-brand-dark font-bold text-sm">R$ {service.price.toFixed(2)}</span>
                                  </div>
                                  <div className="flex flex-col border-l border-[#d6c2c4]/20 pl-4">
                                    <span className="text-[10px] uppercase tracking-wider text-brand-tertiary">Duração</span>
                                    <span className="text-brand-dark font-bold text-sm">{service.duration} min</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VIEW: CADASTRO OU EDIÇÃO DE SERVIÇO */}
          {activeTab === 'config_servico' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl text-brand-dark font-semibold">
                  {isNewService ? 'Cadastrar Novo Procedimento' : 'Editar Procedimento'}
                </h2>
                <p className="text-xs text-brand-tertiary mt-1">Preencha e personalize os dados do procedimento abaixo</p>
              </div>

              <div className="bg-white p-6 md:p-8 border border-brand-primary-light/35 rounded-2xl shadow-sm">
                <form onSubmit={handleSaveServiceSettings} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Service Name */}
                    <div className="col-span-1 md:col-span-2 space-y-1">
                      <label className="font-sans text-[11px] font-bold uppercase tracking-widest text-[#847375] block ml-1 font-bold">Nome do Procedimento</label>
                      <input 
                        type="text"
                        required
                        value={serviceName}
                        onChange={(e) => setServiceName(e.target.value)}
                        className="w-full bg-[#faf9f8] border border-[#d6c2c4]/50 rounded-xl px-4 py-3 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none"
                        placeholder="Ex: Limpeza de Pele Ativa Sênior"
                      />
                    </div>

                    {/* Service Category */}
                    <div className="space-y-1">
                      <label className="font-sans text-[11px] font-bold uppercase tracking-widest text-[#847375] block ml-1 font-bold">Categoria</label>
                      <select 
                        value={serviceCategory}
                        onChange={(e) => setServiceCategory(e.target.value)}
                        className="w-full bg-[#faf9f8] border border-[#d6c2c4]/50 rounded-xl px-4 py-3 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none"
                      >
                        <option value="Estética Facial">Estética Facial</option>
                        <option value="Massoterapia">Massoterapia</option>
                        <option value="Corporal">Corporal</option>
                        <option value="Harmonização">Harmonização</option>
                        <option value="Sobrancelhas & Cílios">Sobrancelhas & Cílios</option>
                        <option value="Manicure & Pedicure">Manicure & Pedicure</option>
                        <option value="Depilação">Depilação</option>
                        <option value="Outros">Outros</option>
                      </select>
                    </div>

                    {/* Price */}
                    <div className="space-y-1">
                      <label className="font-sans text-[11px] font-bold uppercase tracking-widest text-[#847375] block ml-1">Preço (R$)</label>
                      <input 
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={servicePrice}
                        onChange={(e) => setServicePrice(parseFloat(e.target.value) || 0)}
                        className="w-full bg-[#faf9f8] border border-[#d6c2c4]/50 rounded-xl px-4 py-3 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none"
                        placeholder="Ex: 120.00"
                      />
                    </div>

                    {/* Duration */}
                    <div className="space-y-1">
                      <label className="font-sans text-[11px] font-bold uppercase tracking-widest text-[#847375] block ml-1">Duração (Minutos)</label>
                      <input 
                        type="number"
                        required
                        min="5"
                        step="5"
                        value={serviceDuration}
                        onChange={(e) => setServiceDuration(parseInt(e.target.value) || 30)}
                        className="w-full bg-[#faf9f8] border border-[#d6c2c4]/50 rounded-xl px-4 py-3 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none"
                        placeholder="Ex: 60"
                      />
                    </div>

                    {/* Icon selection */}
                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <label className="font-sans text-[11px] font-bold uppercase tracking-widest text-[#847375] block ml-1">Ícone Temático</label>
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                        {['Sparkles', 'Activity', 'Heart', 'Flame', 'Leaf', 'Sun', 'Droplet', 'Gem'].map(iconOpt => {
                          const isSel = serviceIcon === iconOpt;
                          return (
                            <button 
                              key={iconOpt}
                              type="button"
                              onClick={() => setServiceIcon(iconOpt)}
                              className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                isSel 
                                  ? 'border-brand-primary bg-brand-primary-light/20 text-brand-primary font-bold' 
                                  : 'border-[#d6c2c4]/30 hover:border-brand-primary-light/50 text-brand-tertiary'
                              }`}
                            >
                              <div className="w-5 h-5 flex items-center justify-center">
                                {iconOpt === 'Activity' && <Activity className="w-5 h-5" />}
                                {iconOpt === 'Heart' && <Heart className="w-5 h-5" />}
                                {iconOpt === 'Flame' && <Flame className="w-5 h-5" />}
                                {iconOpt === 'Leaf' && <Leaf className="w-5 h-5" />}
                                {iconOpt === 'Sun' && <Sun className="w-5 h-5" />}
                                {iconOpt === 'Droplet' && <Droplet className="w-5 h-5" />}
                                {iconOpt === 'Gem' && <Gem className="w-5 h-5" />}
                                {iconOpt === 'Sparkles' && <Sparkles className="w-5 h-5" />}
                              </div>
                              <span className="text-[10px] mt-1 tracking-tight font-medium">{iconOpt}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                  </div>

                  <div className="flex gap-4 border-t border-[#d6c2c4]/20 pt-6 mt-6">
                    <button 
                      type="button"
                      onClick={() => setActiveTab('servicos')}
                      className="flex-1 py-3 border border-brand-tertiary/40 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-[#faf9f8] cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 bg-brand-primary text-white hover:bg-brand-primary-light hover:text-brand-primary py-3 rounded-full font-bold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
                    >
                      Salvar Procedimento
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </section>

      </div>

      <BookingDetailsModal
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onConfirm={(b) => { handleConfirmAndSendWhatsapp(b); }}
        onFinalize={(b) => { handleFinalizeBooking(b.id); }}
        onCancel={(b) => { handleUpdateBookingStatus(b.id, 'cancelado'); setSelectedBooking(null); }}
        roleType={currentUser.roleType}
      />

      {/* Supabase Setup Modal */}
      {showDbModal && (
        <div className="fixed inset-0 bg-brand-primary/45 backdrop-blur-sm flex items-center justify-center p-4 z-[110] overflow-y-auto">
          <div className="bg-white rounded-2xl border border-brand-primary-light/30 shadow-2xl max-w-2xl w-full p-6 md:p-8 animate-fade-in my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-[#d6c2c4]/20 pb-4 mb-6">
              <div>
                <h3 className="font-display text-xl md:text-2xl text-brand-primary font-bold">Integração com o Supabase</h3>
                <p className="text-xs text-brand-tertiary mt-1">Sincronização e persistência de dados em tempo real</p>
              </div>
              <button 
                onClick={() => setShowDbModal(false)}
                className="p-1 rounded-full hover:bg-[#faf9f8] text-brand-tertiary hover:text-brand-primary transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6 text-sm text-[#4a4243] font-sans leading-relaxed">
              <p>
                Atualmente, o aplicativo está rodando em <strong>modo de backup com memória local</strong>. Suas alterações são salvas temporariamente na sessão do servidor, mas serão redefinidas quando o contêiner reiniciar.
              </p>
              <p>
                Para salvar permanentemente todos os agendamentos, clientes, profissionais e transações financeiras no seu próprio banco de dados <strong>Supabase</strong>, siga estes passos simples:
              </p>

              {/* Step 1 */}
              <div className="border-l-4 border-brand-primary pl-4 py-1">
                <h4 className="font-bold text-brand-primary">1. Criar Projeto no Supabase</h4>
                <p className="text-brand-tertiary text-xs mt-1">
                  Acesse <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline font-semibold">supabase.com</a>, crie uma conta gratuita e inicie um novo projeto.
                </p>
              </div>

              {/* Step 2 */}
              <div className="border-l-4 border-brand-primary pl-4 py-1">
                <h4 className="font-bold text-brand-primary">2. Configurar as Variáveis de Ambiente</h4>
                <p className="text-brand-tertiary text-xs mt-1">
                  Vá nas configurações do seu projeto do Supabase (Project Settings &gt; API) e configure estes dois valores no painel **Secrets** do Google AI Studio (ou cole no arquivo <code className="bg-[#faf9f8] px-1 py-0.5 rounded text-red-600 font-mono">.env</code> se rodar localmente):
                </p>
                <div className="bg-[#faf9f8] border border-[#d6c2c4]/25 p-3 rounded-lg mt-2 font-mono text-xs text-brand-tertiary space-y-1.5">
                  <div><strong>SUPABASE_URL</strong> = <span className="text-[#a51a1a]">https://your-project.supabase.co</span></div>
                  <div><strong>SUPABASE_ANON_KEY</strong> = <span className="text-[#a51a1a]">your-anon-role-public-key</span></div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="border-l-4 border-brand-primary pl-4 py-1">
                <h4 className="font-bold text-brand-primary">3. Executar o Script SQL</h4>
                <p className="text-brand-tertiary text-xs mt-1">
                  Abra o <strong>SQL Editor</strong> no menu lateral do painel Supabase, clique em <strong>"New Query"</strong>, cole o script abaixo e clique em <strong>"Run"</strong> para criar as tabelas necessárias:
                </p>

                <div className="relative mt-3">
                  <pre className="bg-[#1e1e1e] text-emerald-400 p-4 rounded-lg overflow-x-auto text-[10px] font-mono leading-relaxed max-h-52">
{`CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  duration INTEGER NOT NULL,
  price NUMERIC NOT NULL,
  category TEXT NOT NULL,
  icon TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS specialists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  commission INTEGER NOT NULL,
  "avatarUrl" TEXT NOT NULL,
  rating NUMERIC NOT NULL,
  services TEXT[] NOT NULL,
  active BOOLEAN NOT NULL,
  "attendanceCount" INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  "specialistId" TEXT NOT NULL,
  "specialistName" TEXT NOT NULL,
  "userName" TEXT NOT NULL,
  "userWhatsapp" TEXT NOT NULL,
  "serviceIds" TEXT[] NOT NULL,
  "serviceNames" TEXT[] NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  status TEXT NOT NULL,
  "totalPrice" NUMERIC NOT NULL,
  "totalDuration" INTEGER NOT NULL,
  "createdAt" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date TEXT NOT NULL,
  category TEXT NOT NULL,
  "specialistId" TEXT,
  "specialistName" TEXT
);`}
                  </pre>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  duration INTEGER NOT NULL,
  price NUMERIC NOT NULL,
  category TEXT NOT NULL,
  icon TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS specialists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  commission INTEGER NOT NULL,
  "avatarUrl" TEXT NOT NULL,
  rating NUMERIC NOT NULL,
  services TEXT[] NOT NULL,
  active BOOLEAN NOT NULL,
  "attendanceCount" INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  "specialistId" TEXT NOT NULL,
  "specialistName" TEXT NOT NULL,
  "userName" TEXT NOT NULL,
  "userWhatsapp" TEXT NOT NULL,
  "serviceIds" TEXT[] NOT NULL,
  "serviceNames" TEXT[] NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  status TEXT NOT NULL,
  "totalPrice" NUMERIC NOT NULL,
  "totalDuration" INTEGER NOT NULL,
  "createdAt" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date TEXT NOT NULL,
  category TEXT NOT NULL,
  "specialistId" TEXT,
  "specialistName" TEXT
);`);
                      setCopiedSql(true);
                      setTimeout(() => setCopiedSql(false), 2000);
                    }}
                    className="absolute top-2 right-2 bg-white/10 hover:bg-white/25 text-white border border-white/25 px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors"
                  >
                    {copiedSql ? '✓ Copiado!' : 'Copiar SQL'}
                  </button>
                </div>
              </div>

              <div className="bg-emerald-50 text-emerald-800 border border-emerald-200/50 p-4 rounded-xl text-xs space-y-1">
                <strong>💡 Inicialização Automática (Seeding)</strong>
                <p>Assim que o Supabase estiver conectado e com as tabelas criadas, o servidor preencherá automaticamente o banco com todos os dados padrão (serviços, profissionais de exemplo) na primeira inicialização!</p>
              </div>
            </div>

            <div className="mt-8 border-t border-[#d6c2c4]/20 pt-4 flex justify-end">
              <button 
                onClick={() => setShowDbModal(false)}
                className="bg-brand-primary text-white hover:bg-brand-primary-light hover:text-brand-primary px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider shadow cursor-pointer transitions-transform active:scale-95"
              >
                Entendi, Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
