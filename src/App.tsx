import React, { useState, useEffect, useCallback } from 'react';
import { Specialist, Service, Booking, Transaction, AuthUser, Client, Route } from './types';
import BookingFlow from './components/BookingFlow';
import PortalDashboard from './components/PortalDashboard';
import LoginScreen from './components/LoginScreen';
import { Sparkles, LogOut } from 'lucide-react';



function pathToRoute(pathname: string): Route {
  // Map clean paths to logical routes. Legacy ?page= is read once via legacyMode().
  if (pathname.startsWith('/admin')) return 'admin';
  return 'agendar';
}

function legacyPageParam(): Route | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const p = params.get('page');
  if (p === 'admin') return 'admin';
  if (p === 'client' || p === 'cliente' || p === 'agendar') return 'agendar';
  return null;
}

export default function App() {
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [dbStatus, setDbStatus] = useState<{ configured: boolean, mode: string }>({ configured: false, mode: 'local_memory' });

  const [route, setRoute] = useState<Route>(() => {
    if (typeof window === 'undefined') return 'agendar';
    const legacy = legacyPageParam();
    if (legacy) {
      // Migrate legacy ?page= URL to the clean path silently
      const target = legacy === 'admin' ? '/admin' : '/agendar';
      window.history.replaceState({}, '', target);
      return legacy;
    }
    return pathToRoute(window.location.pathname);
  });

  const [authToken, setAuthToken] = useState<string | null>(() =>
    typeof window !== 'undefined' ? sessionStorage.getItem('authToken') : null
  );
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem('authUser');
      return raw ? JSON.parse(raw) as AuthUser : null;
    } catch {
      return null;
    }
  });

  const [salonWhatsapp, setSalonWhatsapp] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('salon_whatsapp_number') || '5511999999999';
    }
    return '5511999999999';
  });

  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

  const navigate = useCallback((to: Route) => {
    if (typeof window === 'undefined') return;
    const target = to === 'admin' ? '/admin' : '/agendar';
    if (window.location.pathname !== target) {
      window.history.pushState({}, '', target);
    }
    setRoute(to);
  }, []);

  // popstate (back/forward) sync
  useEffect(() => {
    const onPop = () => setRoute(pathToRoute(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('salon_whatsapp_number', salonWhatsapp);
    }
  }, [salonWhatsapp]);

  const authHeader = (): Record<string, string> =>
    authToken ? { Authorization: `Bearer ${authToken}` } : {};

  const fetchData = useCallback(async () => {
    try {
      if (initialLoad) setLoading(true);
      const reqs: Promise<Response>[] = [
        fetch('/api/specialists'),
        fetch('/api/services'),
        fetch('/api/bookings', { headers: authHeader() }),
        fetch('/api/db-status'),
      ];
      // Fetch transactions for ALL authenticated users (admin sees all, professional sees own)
      if (currentUser) {
        reqs.push(fetch('/api/transactions', { headers: authHeader() }));
        reqs.push(fetch('/api/clients', { headers: authHeader() }));
      }
      const resps = await Promise.all(reqs);
      
      const specRes = resps[0];
      const servRes = resps[1];
      const bookRes = resps[2];
      const dbRes = resps[3];
      const transRes = currentUser ? resps[4] : undefined;
      const clientsRes = currentUser ? resps[5] : undefined;

      if (specRes.ok) setSpecialists(await specRes.json());
      if (servRes.ok) setServices(await servRes.json());
      if (bookRes.ok) setBookings(await bookRes.json());
      if (dbRes && dbRes.ok) setDbStatus(await dbRes.json());
      if (transRes && transRes.ok) setTransactions(await transRes.json());
      else setTransactions([]);
      if (clientsRes && clientsRes.ok) setClients(await clientsRes.json());
      else setClients([]);
    } catch (err) {
      console.error('Failed to connect to express server, fallback to default offline state', err);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, currentUser?.roleType, initialLoad]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBookingConfirmed = (newBooking: Booking) => {
    setBookings(prev => [newBooking, ...prev]);
    fetchData();
  };

  const handleLoginSuccess = (token: string, user: AuthUser) => {
    sessionStorage.setItem('authToken', token);
    sessionStorage.setItem('authUser', JSON.stringify(user));
    setAuthToken(token);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('authUser');
    setAuthToken(null);
    setCurrentUser(null);
    navigate('agendar');
  };

  const isAdminRoute = route === 'admin';
  const isAuthed = !!currentUser && !!authToken;

  return (
    <div className="min-h-screen bg-brand-linen flex flex-col">
      <header className="sticky top-0 w-full z-50 bg-[#faf9f8]/90 backdrop-blur-md border-b border-[#d6c2c4]/45 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">

          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('agendar')}>
            <div className="w-9 h-9 rounded-full bg-brand-primary flex items-center justify-center text-white shadow-sm shadow-brand-primary/25">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-lg tracking-widest uppercase font-bold text-brand-primary">ALVES ESTÉTICA</h1>
              <p className="text-[9px] font-sans text-brand-secondary font-bold tracking-widest uppercase">Alves Estética Feminina</p>
            </div>
          </div>

          {isAdminRoute && isAuthed && (
            <div className="flex flex-wrap items-center gap-3 animate-fade-in">
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-4 py-2 border border-rose-200/60 bg-rose-50/50 hover:bg-rose-50 text-rose-700 font-sans font-bold text-xs uppercase rounded-full transition-all cursor-pointer shadow-sm active:scale-95"
                title="Sair"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Sair ({currentUser?.name?.split(' ')[0]})</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 py-10 px-4 md:px-8 max-w-7xl mx-auto w-full flex flex-col items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-sans font-bold text-brand-tertiary animate-pulse">Carregando ALVES ESTÉTICA...</p>
          </div>
        ) : (
          <div className="w-full">
            {!isAdminRoute ? (
              <BookingFlow
                specialists={specialists.filter(s => s.roleType !== 'admin')}
                services={services}
                bookings={bookings}
                onBookingConfirmed={handleBookingConfirmed}
                onGoToPortal={() => navigate('admin')}
                onRefreshBookings={fetchData}
                salonWhatsapp={salonWhatsapp}
              />
            ) : (
              !isAuthed ? (
                <LoginScreen onLoginSuccess={handleLoginSuccess} />
              ) : (
                <PortalDashboard
                  specialists={specialists}
                  services={services}
                  bookings={bookings}
                  transactions={transactions}
                  clients={clients}
                  onRefreshData={fetchData}
                  dbStatus={dbStatus}
                  salonWhatsapp={salonWhatsapp}
                  onChangeSalonWhatsapp={setSalonWhatsapp}
                  currentUser={currentUser!}
                  authToken={authToken!}
                />
              )
            )}
          </div>
        )}
      </main>

      <footer className="w-full border-t border-brand-primary-light/15 py-8 text-center text-[11px] text-brand-tertiary font-sans opacity-80 space-y-2">
        <p>© 2026 ALVES ESTÉTICA - Santuário de Estética & Bem-estar. Todos os direitos reservados.</p>
        <p>
          <button
            onClick={() => navigate('admin')}
            className="text-brand-primary hover:underline font-bold uppercase tracking-wider"
          >
            Acesso da Equipe →
          </button>
        </p>
      </footer>
    </div>
  );
}
