import React, { useState, useEffect } from 'react';
import { Specialist, Service, Booking, Transaction } from '../types';
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
  TrendingDown,
  Star,
  MessageSquare
} from 'lucide-react';

interface PortalDashboardProps {
  specialists: Specialist[];
  services: Service[];
  bookings: Booking[];
  transactions: Transaction[];
  onRefreshData: () => void;
  onGoToBooking: () => void;
  dbStatus?: { configured: boolean; mode: string };
  salonWhatsapp?: string;
  onChangeSalonWhatsapp?: (num: string) => void;
}

type AdminTab = 'dashboard' | 'agenda' | 'equipe' | 'financeiro' | 'relatorio_detalhado' | 'nova_operacao' | 'config_especialist' | 'servicos' | 'config_servico';

export default function PortalDashboard({ 
  specialists, 
  services, 
  bookings, 
  transactions, 
  onRefreshData,
  onGoToBooking,
  dbStatus = { configured: false, mode: 'local_memory' },
  salonWhatsapp = '5511999999999',
  onChangeSalonWhatsapp
}: PortalDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showDbModal, setShowDbModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  
  // Transaction states
  const [transType, setTransType] = useState<'entrada' | 'saida'>('saida');
  const [transDescription, setTransDescription] = useState('');
  const [transAmount, setTransAmount] = useState('');
  const [transDate, setTransDate] = useState(new Date().toISOString().split('T')[0]);
  const [transCategory, setTransCategory] = useState('Materiais');
  const [transSpecialistId, setTransSpecialistId] = useState('');

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

  // Auto trigger alerts
  const showToast = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => {
      setActionSuccessMessage(null);
    }, 3000);
  };

  // Helper values
  const todayStr = '2026-05-22'; // Default mocked system date

  // Calculations
  const todayBookings = bookings.filter(b => b.date === todayStr);
  const totalRevenue = transactions.filter(t => t.type === 'entrada').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'saida').reduce((sum, t) => sum + t.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  // Change booking status (Confirm / Reject / Cancel)
  const handleUpdateBookingStatus = async (id: string, status: 'confirmado' | 'cancelado') => {
    try {
      const response = await fetch(`/api/bookings/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (response.ok) {
        onRefreshData();
        showToast(`Agendamento ${status === 'confirmado' ? 'confirmado' : 'cancelado'} com sucesso!`);
      }
    } catch (err) {
      console.error(err);
    }
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
        headers: { 'Content-Type': 'application/json' },
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
    setActiveTab('config_especialist');
  };

  // Save specialist configurations
  const handleSaveSpecialistSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Specialist = {
      id: isNewSpec ? 'spec-' + Date.now() : selectedSpec!.id,
      name: specName,
      role: specRole,
      specialty: specSpecialty,
      commission: specCommission,
      avatarUrl: specAvatar,
      rating: isNewSpec ? 4.9 : selectedSpec!.rating,
      services: specSelectedServices,
      active: specActive,
      attendanceCount: isNewSpec ? 0 : selectedSpec!.attendanceCount
    };

    try {
      const response = await fetch('/api/specialists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        onRefreshData();
        setActiveTab('equipe');
        showToast(isNewSpec ? 'Nova profissional adicionada!' : 'Configurações de profissional salvas!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSpecialist = async (specId: string) => {
    if (!window.confirm('Tem certeza de que deseja remover esta profissional da equipe?')) return;
    try {
      const response = await fetch(`/api/specialists/${specId}`, {
        method: 'DELETE'
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
        headers: { 'Content-Type': 'application/json' },
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
        method: 'DELETE'
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

      {/* Floating Action Button (Universal Add) */}
      <button 
        onClick={onGoToBooking}
        className="fixed bottom-12 right-6 md:right-12 w-14 h-14 bg-brand-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-50 group"
        title="Novo Agendamento"
      >
        <span className="font-sans font-bold text-2xl group-hover:rotate-90 transition-transform duration-300">+</span>
      </button>

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
              onClick={() => { setActiveTab('financeiro'); setIsDrawerOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-sans text-sm font-bold text-left transition-all ${
                activeTab === 'financeiro' 
                  ? 'bg-brand-primary-light/30 text-brand-primary' 
                  : 'text-brand-tertiary hover:bg-[#faf9f8]'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Financeiro</span>
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
          </nav>

          <div className="border-t border-brand-primary-light/10 pt-4 mt-4">
            <button 
              onClick={onGoToBooking}
              className="w-full flex items-center justify-center gap-2 bg-brand-primary text-white py-3 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-brand-primary-light hover:text-brand-primary transition-all"
            >
              <Plus className="w-4 h-4" />
              Novo Agendamento
            </button>
          </div>
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
          <button 
            onClick={() => setActiveTab('financeiro')}
            className={`flex flex-col items-center p-2 rounded-lg ${activeTab === 'financeiro' ? 'text-brand-primary' : 'text-brand-tertiary/75'}`}
          >
            <DollarSign className="w-5 h-5" />
            <span className="text-[9px] font-bold mt-1 uppercase">Caixa</span>
          </button>
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

                {/* Configuration of Salon WhatsApp (Admin settings) */}
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
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <span className="font-sans text-[11px] font-semibold text-brand-primary tracking-widest uppercase">Controle Diário</span>
                  <h2 className="font-display text-3xl text-brand-dark">Agenda de Hoje</h2>
                  <p className="text-brand-tertiary text-sm">Quarta-feira, 25 de Outubro de 2026</p>
                </div>
                
                <div className="flex items-center gap-3">
                  <select 
                    className="bg-white border border-[#d6c2c4]/40 rounded-full py-2 px-4 pr-10 text-xs font-bold text-brand-tertiary cursor-pointer focus:ring-1 focus:ring-brand-primary"
                    defaultValue="all"
                  >
                    <option value="all">Todos os Profissionais</option>
                    {specialists.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Hours / Schedule grid */}
              <div className="bg-white border border-brand-primary-light/35 rounded-2xl p-6 shadow-sm">
                <div className="space-y-6">
                  {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'].map((hour, index) => {
                    // Match bookings falling near this hour
                    const hourBookings = bookings.filter(b => b.time.startsWith(hour.slice(0, 2)));
                    return (
                      <div key={hour} className="flex gap-4 items-start pb-4 border-b border-brand-primary-light/10 last:border-0 last:pb-0">
                        {/* Hour display */}
                        <div className="w-12 text-right">
                          <span className="text-xs font-bold text-brand-tertiary/65 font-mono">{hour}</span>
                        </div>

                        {/* Booking card row */}
                        <div className="flex-1 space-y-3">
                          {hourBookings.length === 0 ? (
                            <div className="py-2 flex items-center text-brand-tertiary/35">
                              <PlusCircle className="w-4 h-4 text-brand-tertiary/20 mr-2" />
                              <span className="text-xs italic font-semibold">Livre para consultas</span>
                            </div>
                          ) : (
                            hourBookings.map(book => (
                              <div 
                                key={book.id}
                                className={`flex flex-col sm:flex-row justify-between p-4 rounded-xl border ${
                                  book.status === 'pendente' 
                                    ? 'border-dashed border-brand-primary bg-brand-primary-light/5' 
                                    : 'border-brand-primary-light/30 bg-[#faf9f8]'
                                } shadow-sm hover:shadow transition-shadow`}
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-sans font-bold text-sm text-brand-dark">{book.userName}</span>
                                    <span className={`px-2 py-0.5 text-[8px] font-bold rounded uppercase ${
                                      book.status === 'confirmado' ? 'bg-[#f0deb0] text-[#6a5d39]' : 'bg-[#efdfd9] text-[#645a55]'
                                    }`}>
                                      {book.status}
                                    </span>
                                  </div>
                                  <p className="text-xs text-brand-tertiary mt-1">
                                    {book.serviceNames.join(', ')} • <span className="font-bold text-brand-secondary">{book.specialistName}</span>
                                  </p>
                                  <p className="text-[10px] text-brand-tertiary/60 font-mono mt-0.5">WhatsApp: {book.userWhatsapp}</p>
                                </div>

                                <div className="flex items-center gap-2 mt-3 sm:mt-0">
                                  {book.status === 'pendente' && (
                                    <>
                                      <button 
                                        onClick={() => handleUpdateBookingStatus(book.id, 'confirmado')}
                                        className="p-1 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold flex items-center gap-1 transition-transform active:scale-95"
                                      >
                                        <Check className="w-3 h-3" /> Liberar
                                      </button>
                                      <button 
                                        onClick={() => handleUpdateBookingStatus(book.id, 'cancelado')}
                                        className="p-1 px-3 bg-red-50 text-red-700 hover:bg-red-100 rounded-full text-xs font-bold flex items-center gap-1 transition-transform active:scale-95"
                                      >
                                        <X className="w-3 h-3" /> Recusar
                                      </button>
                                    </>
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

          {/* VIEW 4: FINANCIAL SUMMARY PORTAL */}
          {activeTab === 'financeiro' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <span className="font-sans text-[11px] font-semibold text-brand-primary tracking-widest uppercase font-bold">Fluxo de Caixa</span>
                  <h2 className="font-display text-3xl text-brand-dark">Resumo Financeiro</h2>
                  <p className="text-brand-tertiary text-sm">Acompanhe a saúde do seu santuário em tempo real.</p>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setActiveTab('nova_operacao')}
                    className="bg-brand-primary text-white hover:bg-brand-primary-light hover:text-brand-primary py-3 px-6 rounded-full font-bold text-xs uppercase tracking-wider shadow-lg flex items-center gap-1.5 transition-transform active:scale-95"
                  >
                    <Plus className="w-4 h-4" /> Lançar Operação
                  </button>
                </div>
              </div>

              {/* Stats Cards Row */}
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

              {/* Transactions History Table */}
              <div className="bg-white border border-[#d6c2c4]/20 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-5 border-b border-brand-primary-light/10 flex justify-between items-center">
                  <h3 className="font-sans font-bold text-base text-brand-dark">Histórico de Lançamentos ({transactions.length})</h3>
                  <button onClick={() => setActiveTab('relatorio_detalhado')} className="text-xs text-brand-primary font-bold hover:underline flex items-center gap-1">
                    <Printer className="w-3.5 h-3.5" /> Detalhar Relatório
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-[#faf9f8] border-b border-brand-primary-light/10 text-xs font-bold text-brand-tertiary">
                        <th className="p-4">Descrição</th>
                        <th className="p-4">Data</th>
                        <th className="p-4">Categoria</th>
                        <th className="p-4 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-primary-light/10">
                      {transactions.map(t => (
                        <tr key={t.id} className="hover:bg-[#faf9f8] text-xs transition-colors">
                          <td className="p-4 font-sans font-bold text-brand-dark">
                            {t.description}
                            {t.specialistName && (
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
                    <p className="text-xs text-brand-dark font-sans mt-1">Período: 01 Out - 31 Out, 2026</p>
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
                <div className="border border-brand-primary-light/20 rounded-xl overflow-hidden mt-6">
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
                <h2 className="font-display text-3xl text-brand-dark">Nova Operação Financeira</h2>
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

                <form onSubmit={handleCreateTransaction} className="space-y-6">
                  
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
                      onClick={() => setActiveTab('financeiro')}
                      className="flex-1 py-3 border border-brand-tertiary/40 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-[#faf9f8]"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 bg-brand-primary text-white hover:bg-brand-primary-light hover:text-brand-primary py-3 rounded-full font-bold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-1.5 transition-transform active:scale-95"
                    >
                      Confirmar Lançamento
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
