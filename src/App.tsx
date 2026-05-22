import React, { useState, useEffect } from 'react';
import { Specialist, Service, Booking, Transaction } from './types';
import BookingFlow from './components/BookingFlow';
import PortalDashboard from './components/PortalDashboard';
import AdminLogin from './components/AdminLogin';
import { Sparkles, LayoutDashboard, Heart, Calendar, Link, Copy, Check, LogOut } from 'lucide-react';

export default function App() {
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dbStatus, setDbStatus] = useState<{ configured: boolean, mode: string }>({ configured: false, mode: 'local_memory' });
  
  // Load initial view mode from URL search parameter ('page=admin' or 'admin=true')
  const [viewMode, setViewMode] = useState<'client' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return (params.get('page') === 'admin' || params.get('admin') === 'true') ? 'admin' : 'client';
    }
    return 'client';
  });

  // Load admin authentication state from sessionStorage
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('isAdminAuthenticated') === 'true';
    }
    return false;
  });

  // Load salon whatsapp contact number with default/fallback
  const [salonWhatsapp, setSalonWhatsapp] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('salon_whatsapp_number') || '5511999999999';
    }
    return '5511999999999';
  });

  const [copiedLink, setCopiedLink] = useState<'client' | 'admin' | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync URL search parameters dynamically with viewMode state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('page', viewMode);
      window.history.replaceState({ path: url.href }, '', url.href);
    }
  }, [viewMode]);

  // Sync salon whatsapp number in localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('salon_whatsapp_number', salonWhatsapp);
    }
  }, [salonWhatsapp]);

  // Sync data from Express Backend
  const fetchData = async () => {
    try {
      setLoading(true);
      const [specRes, servRes, bookRes, transRes, dbRes] = await Promise.all([
        fetch('/api/specialists'),
        fetch('/api/services'),
        fetch('/api/bookings'),
        fetch('/api/transactions'),
        fetch('/api/db-status')
      ]);

      if (specRes.ok && servRes.ok && bookRes.ok && transRes.ok) {
        const specs = await specRes.json();
        const servs = await servRes.json();
        const books = await bookRes.json();
        const trans = await transRes.json();

        setSpecialists(specs);
        setServices(servs);
        setBookings(books);
        setTransactions(trans);
      }

      if (dbRes && dbRes.ok) {
        const status = await dbRes.json();
        setDbStatus(status);
      }
    } catch (err) {
      console.error('Failed to connect to express server, fallback to default offline state', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBookingConfirmed = (newBooking: Booking) => {
    setBookings(prev => [newBooking, ...prev]);
    fetchData();
  };

  const handleLoginSuccess = () => {
    setIsAdminAuthenticated(true);
    sessionStorage.setItem('isAdminAuthenticated', 'true');
  };

  const handleLogout = () => {
    setIsAdminAuthenticated(false);
    sessionStorage.removeItem('isAdminAuthenticated');
    setViewMode('client');
  };

  const copyToClipboard = (type: 'client' | 'admin') => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('page', type);
      navigator.clipboard.writeText(url.href);
      setCopiedLink(type);
      setTimeout(() => setCopiedLink(null), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-brand-linen flex flex-col">
      
      {/* Top Main Luxury Global Bar */}
      <header className="sticky top-0 w-full z-50 bg-[#faf9f8]/90 backdrop-blur-md border-b border-[#d6c2c4]/45 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo and branding */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setViewMode('client')}>
            <div className="w-9 h-9 rounded-full bg-brand-primary flex items-center justify-center text-white shadow-sm shadow-brand-primary/25">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-lg tracking-widest uppercase font-bold text-brand-primary">ALVES ESTÉTICA</h1>
              <p className="text-[9px] font-sans text-brand-secondary font-bold tracking-widest uppercase">Alves Estética Feminina</p>
            </div>
          </div>

          {/* DUAL ENVIRONMENT VIEW SWITCHER WITH LOGOUT INTEGRATION - ONLY SHOWN TO ADMINS */}
          {viewMode === 'admin' && (
            <div className="flex flex-wrap items-center gap-3 animate-fade-in">
              <div className="flex items-center bg-[#eeeeed] p-1 rounded-full border border-brand-primary-light/20 shadow-inner">
                <button 
                  onClick={() => setViewMode('client')}
                  className={`flex items-center gap-1.5 px-5 py-2 font-sans font-bold text-xs uppercase rounded-full transition-all duration-300 cursor-pointer ${
                    viewMode === 'client' 
                      ? 'bg-brand-primary text-white shadow-md' 
                      : 'text-brand-tertiary hover:text-brand-primary'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5" />
                  <span>Ver Agendamento como Cliente</span>
                </button>
                <button 
                  onClick={() => setViewMode('admin')}
                  className={`flex items-center gap-1.5 px-5 py-2 font-sans font-bold text-xs uppercase rounded-full transition-all duration-300 cursor-pointer ${
                    viewMode === 'admin' 
                      ? 'bg-brand-primary text-white shadow-md' 
                      : 'text-brand-tertiary hover:text-brand-primary'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Portal de Gestão</span>
                </button>
              </div>

              {isAdminAuthenticated && (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-4 py-2 border border-rose-200/60 bg-rose-50/50 hover:bg-rose-50 text-rose-700 font-sans font-bold text-xs uppercase rounded-full transition-all cursor-pointer shadow-sm active:scale-95"
                  title="Sair da Administração"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Sair</span>
                </button>
              )}
            </div>
          )}

        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 py-10 px-4 md:px-8 max-w-7xl mx-auto w-full flex flex-col items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-sans font-bold text-brand-tertiary animate-pulse">Carregando ALVES ESTÉTICA...</p>
          </div>
        ) : (
          <div className="w-full">
            {viewMode === 'client' ? (
              <BookingFlow 
                specialists={specialists}
                services={services}
                onBookingConfirmed={handleBookingConfirmed}
                onGoToPortal={() => setViewMode('admin')}
                salonWhatsapp={salonWhatsapp}
              />
            ) : (
              /* If viewing admin, first verify administrative credentials */
              !isAdminAuthenticated ? (
                <AdminLogin onLoginSuccess={handleLoginSuccess} />
              ) : (
                <PortalDashboard 
                  specialists={specialists}
                  services={services}
                  bookings={bookings}
                  transactions={transactions}
                  onRefreshData={fetchData}
                  onGoToBooking={() => setViewMode('client')}
                  dbStatus={dbStatus}
                  salonWhatsapp={salonWhatsapp}
                  onChangeSalonWhatsapp={setSalonWhatsapp}
                />
              )
            )}
          </div>
        )}
      </main>

      {/* Aesthetic Footer */}
      <footer className="w-full border-t border-brand-primary-light/15 py-8 text-center text-[11px] text-brand-tertiary font-sans opacity-70">
        <p>© 2026 ALVES ESTÉTICA - Santuário de Estética & Bem-estar. Todos os direitos reservados.</p>
        <p className="mt-1">Unidade São Paulo • Multi-profissional e Gestão Financeira Protegida.</p>
      </footer>

    </div>
  );
}
