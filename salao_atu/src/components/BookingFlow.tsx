import React, { useState, useEffect, useMemo } from 'react';
import { Specialist, Service, Booking } from '../types';
import { nextNDays, computeSlotAvailability, ymd, generateDaySlots } from '../utils/timeSlots';
import { 
  Sparkles, 
  Activity, 
  Heart, 
  Flame, 
  Leaf, 
  Sun, 
  Droplets, 
  Gem, 
  Star, 
  Clock, 
  User, 
  CheckCircle, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Phone,
  MessageSquare,
  Coffee,
  Award,
  Scissors,
  Eye,
  Users,
  ShieldCheck,
  Smile
} from 'lucide-react';

interface BookingFlowProps {
  specialists: Specialist[];
  services: Service[];
  bookings: Booking[];
  onBookingConfirmed: (newBooking: Booking) => void;
  onGoToPortal: () => void;
  salonWhatsapp?: string;
  onRefreshBookings?: () => void;
}

export default function BookingFlow({
  specialists,
  services,
  bookings,
  onBookingConfirmed,
  onGoToPortal,
  salonWhatsapp = '5511999999999',
  onRefreshBookings,
}: BookingFlowProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedSpecialist, setSelectedSpecialist] = useState<Specialist | null>(null);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const dayOptions = useMemo(() => nextNDays(14), []);
  const [selectedDate, setSelectedDate] = useState<string>(() => ymd(new Date()));
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [bookingError, setBookingError] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [userWhatsapp, setUserWhatsapp] = useState<string>('');
  const [finalBooking, setFinalBooking] = useState<Booking | null>(null);

  // Auto scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (step === 3 && onRefreshBookings) {
      onRefreshBookings();
    }
  }, [step, onRefreshBookings]);

  // Total duration of the currently chosen services — used to detect overlap
  const totalDuration = useMemo(
    () => selectedServices.reduce((acc, s) => acc + s.duration, 0),
    [selectedServices]
  );

  // Compute slot availability for the currently selected day + specialist + services
  const slotAvailability = useMemo(() => {
    if (!selectedSpecialist || totalDuration === 0) return [];
    return computeSlotAvailability({
      dateStr: selectedDate,
      durationMin: totalDuration,
      specialistId: selectedSpecialist.id,
      bookings,
      schedule: selectedSpecialist.weeklySchedule,
    });
  }, [selectedSpecialist, selectedDate, totalDuration, bookings]);

  // If the currently selected time becomes unavailable (past/conflict) when bookings refresh,
  // clear it so the user picks a fresh slot.
  useEffect(() => {
    if (!selectedTime) return;
    const match = slotAvailability.find(s => s.time === selectedTime);
    if (match && (match.past || match.conflict)) {
      setSelectedTime('');
    }
  }, [slotAvailability, selectedTime]);

  // Handle WhatsApp Input Mask: (99) 9 9999-9999 or similar
  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    // Mask logic
    let formatted = '';
    if (value.length > 0) {
      formatted += '(' + value.slice(0, 2);
    }
    if (value.length > 2) {
      formatted += ') ' + value.slice(2, 3);
    }
    if (value.length > 3) {
      formatted += ' ' + value.slice(3, 7);
    }
    if (value.length > 7) {
      formatted += '-' + value.slice(7, 11);
    }
    setUserWhatsapp(formatted);
  };

  const handleSelectSpecialist = (spec: Specialist) => {
    setSelectedSpecialist(spec);
    // filter services performable by this specialist
    setSelectedServices([]);
    setSelectedTime('');
    setStep(2);
  };

  const toggleService = (service: Service) => {
    if (selectedServices.some(s => s.id === service.id)) {
      setSelectedServices(selectedServices.filter(s => s.id !== service.id));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const handleServicesSubmit = () => {
    if (selectedServices.length > 0) {
      setStep(3);
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleTimeSubmit = () => {
    if (selectedTime) {
      setStep(4);
    }
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpecialist || selectedServices.length === 0 || !selectedTime || !userName || !userWhatsapp) return;

    const totalPrice = selectedServices.reduce((acc, s) => acc + s.price, 0);

    const booking: Booking = {
      id: 'book-' + Date.now(),
      specialistId: selectedSpecialist.id,
      specialistName: selectedSpecialist.name,
      userName,
      userWhatsapp,
      serviceIds: selectedServices.map(s => s.id),
      serviceNames: selectedServices.map(s => s.name),
      date: selectedDate,
      time: selectedTime,
      status: 'pendente', // Default to pending as per professional confirmation
      totalPrice,
      totalDuration,
      createdAt: new Date().toISOString()
    };

    const waText = `Olá! Realizei um agendamento de procedimento estético:
*Cliente:* ${userName}
*WhatsApp:* ${userWhatsapp}
*Procedimento(s):* ${selectedServices.map(s => s.name).join(', ')}
*Profissional:* ${selectedSpecialist.name}
*Data e Hora:* ${selectedDate.split('-').reverse().join('/')} às ${selectedTime}
*Valor Total:* R$ ${totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
*Duração total:* ${totalDuration} minutos`;

    const waUrl = `https://wa.me/${salonWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(waText)}`;

    const redirectToWhatsapp = () => {
      try {
        window.open(waUrl, '_blank');
      } catch (err) {
        console.error("Popup blocked or failed to open WhatsApp window", err);
      }
    };

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(booking),
      });
      if (response.status === 409) {
        const data = await response.json().catch(() => ({}));
        setBookingError(data.error || 'Esse horário acabou de ser ocupado. Escolha outro.');
        setStep(3);
        if (onRefreshBookings) onRefreshBookings();
        return;
      }
      if (response.ok) {
        const savedBooking = await response.json();
        setFinalBooking(savedBooking);
        onBookingConfirmed(savedBooking);
        setStep(5);
        redirectToWhatsapp();
      } else {
        // Fallback for network issues
        setFinalBooking(booking);
        onBookingConfirmed(booking);
        setStep(5);
        redirectToWhatsapp();
      }
    } catch (err) {
      // Fallback
      setFinalBooking(booking);
      onBookingConfirmed(booking);
      setStep(5);
      redirectToWhatsapp();
    }
  };

  const getServiceIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sparkles': return <Sparkles className="w-5 h-5" />;
      case 'Activity': return <Activity className="w-5 h-5" />;
      case 'Heart': return <Heart className="w-5 h-5" />;
      case 'Flame': return <Flame className="w-5 h-5" />;
      case 'Leaf': return <Leaf className="w-5 h-5" />;
      case 'Sun': return <Sun className="w-5 h-5" />;
      case 'Droplets': return <Droplets className="w-5 h-5" />;
      case 'Gem': return <Gem className="w-5 h-5" />;
      case 'Scissors': return <Scissors className="w-5 h-5" />;
      case 'Eye': return <Eye className="w-5 h-5" />;
      default: return <Sparkles className="w-5 h-5" />;
    }
  };

  const nextButtonActiveStyle = "bg-brand-primary text-white hover:bg-brand-primary-light hover:text-brand-primary shadow-lg scale-100 cursor-pointer active:scale-95";
  const nextButtonInactiveStyle = "bg-brand-tertiary/20 text-brand-dark/40 cursor-not-allowed";

  return (
    <div className="w-full">
      {/* Step Indicators */}
      {step < 5 && (
        <div className="max-w-md mx-auto mb-10 flex items-center justify-between px-4">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${step >= 1 ? 'bg-brand-primary text-white' : 'bg-brand-tertiary/20 text-brand-dark'}`}>1</div>
            <span className="font-sans text-[10px] uppercase font-bold tracking-widest mt-1 text-brand-tertiary">Especialista</span>
          </div>
          <div className={`flex-1 h-[1px] mx-2 ${step >= 2 ? 'bg-brand-primary' : 'bg-brand-tertiary/20'}`} />
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${step >= 2 ? 'bg-brand-primary text-white' : 'bg-brand-tertiary/20 text-brand-dark'}`}>2</div>
            <span className="font-sans text-[10px] uppercase font-bold tracking-widest mt-1 text-brand-tertiary">Serviços</span>
          </div>
          <div className={`flex-1 h-[1px] mx-2 ${step >= 3 ? 'bg-brand-primary' : 'bg-brand-tertiary/20'}`} />
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${step >= 3 ? 'bg-brand-primary text-white' : 'bg-brand-tertiary/20 text-brand-dark'}`}>3</div>
            <span className="font-sans text-[10px] uppercase font-bold tracking-widest mt-1 text-brand-tertiary">Horário</span>
          </div>
          <div className={`flex-1 h-[1px] mx-2 ${step >= 4 ? 'bg-brand-primary' : 'bg-brand-tertiary/20'}`} />
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${step >= 4 ? 'bg-brand-primary text-white' : 'bg-brand-tertiary/20 text-brand-dark'}`}>4</div>
            <span className="font-sans text-[10px] uppercase font-bold tracking-widest mt-1 text-brand-tertiary">Info</span>
          </div>
        </div>
      )}

      {/* STEP 1: Specialists List / Full Landing Page */}
      {step === 1 && (
        <section className="animate-fade-in space-y-20 max-w-5xl mx-auto">
          
          {/* 1. HERO HOME SECTION */}
          <div className="text-center bg-white border border-brand-primary-light/40 rounded-3xl p-8 md:p-16 shadow-sm relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary-light/10 blur-3xl rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-secondary-light/10 blur-3xl rounded-full -ml-24 -mb-24"></div>
            
            <div className="relative z-10 space-y-6">
              <span className="font-sans text-[10px] font-extrabold uppercase tracking-widest text-brand-primary bg-brand-primary-light/30 px-3 py-1.5 rounded-full inline-block">
                SANTUÁRIO DE BELEZA & BEM-ESTAR FEMININO
              </span>
              
              <h1 className="font-display text-4xl md:text-6xl text-brand-dark leading-tight tracking-tight max-w-3xl mx-auto font-bold">
                Seu Bem-Estar no <span className="italic text-brand-primary">Lugar Certo</span>
              </h1>
              
              <p className="font-sans text-brand-tertiary text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
                Na <strong className="text-brand-primary font-bold">Alves Estética</strong>, o autocuidado é elevado a um portal de equilíbrio, delicadeza e carinho. Aliamos protocolos inovadores de alta tecnologia estética a um acolhimento acolhedor e seguro para realçar a sua essência e beleza natural.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <a 
                  href="#especialistas"
                  className="w-full sm:w-auto bg-brand-primary hover:bg-brand-primary-light hover:text-brand-primary text-white font-sans font-bold text-xs uppercase tracking-wider px-8 py-4 rounded-full shadow-lg transition-all active:scale-95 duration-300 text-center"
                >
                  Agendar com Especialista
                </a>
                <a 
                  href="#ambiente"
                  className="w-full sm:w-auto bg-white border border-[#d6c2c4] hover:border-brand-primary text-brand-tertiary hover:text-brand-primary font-sans font-bold text-xs uppercase tracking-wider px-8 py-4 rounded-full transition-all duration-300 text-center"
                >
                  Conhecer o Ambiente
                </a>
              </div>
              
              <div className="flex flex-wrap items-center justify-center gap-y-2.5 gap-x-6 text-[10px] uppercase font-bold text-brand-tertiary/80 tracking-widest pt-6 border-t border-brand-primary-light/15">
                <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-brand-secondary" /> Suporte Exclusivo</span>
                <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-brand-secondary" /> Especialistas Graduadas</span>
                <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-brand-secondary" /> Espaço Climatizado & Seguro</span>
              </div>
            </div>
          </div>

          {/* 2. OUR AMBIENTE (Nosso Ambiente) */}
          <div id="ambiente" className="space-y-16 scroll-mt-24">
            
            {/* SERVICES IN OUR BEAUTIFUL SPACE */}
            <div className="space-y-10">
              <div className="text-center max-w-xl mx-auto space-y-2">
                <span className="font-sans text-xs font-bold text-brand-secondary tracking-widest uppercase mb-1 block">Nosso Lindo Espaço</span>
                <h2 className="font-display text-3xl md:text-4.5xl text-brand-primary font-bold">Nossas Quatro Especialidades</h2>
                <p className="font-sans text-xs text-brand-tertiary leading-relaxed">
                  Explore os tratamentos premium que oferecemos com profissionais de ponta dedicadas a cuidar de cada detalhe da sua beleza.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* 1. Podologia */}
                <div className="bg-white border border-brand-primary-light/25 hover:border-brand-primary/45 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all duration-300 space-y-4">
                  <div className="w-12 h-12 bg-brand-primary-light/20 rounded-xl flex items-center justify-center text-brand-primary">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="font-display text-lg text-brand-dark font-semibold">Podologia</h3>
                  <p className="font-sans text-xs text-[#847375] leading-relaxed">
                    Saúde, prevenção e bem-estar para seus pés. Protocolos técnicos avançados para tratar calosidades, unhas encravadas e spa terapêutico relaxante.
                  </p>
                </div>

                {/* 2. Nails */}
                <div className="bg-white border border-brand-primary-light/25 hover:border-brand-primary/45 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all duration-300 space-y-4">
                  <div className="w-12 h-12 bg-brand-secondary-light/30 rounded-xl flex items-center justify-center text-brand-secondary">
                    <Gem className="w-6 h-6" />
                  </div>
                  <h3 className="font-display text-lg text-brand-dark font-semibold">Nails</h3>
                  <p className="font-sans text-xs text-[#847375] leading-relaxed">
                    Esmaltação de alta durabilidade, blindagem protetora e técnicas refinadas de alongamento em gel ou fibra de vidro com acabamento extremamente delicado e natural.
                  </p>
                </div>

                {/* 3. Cabeleireira */}
                <div className="bg-white border border-brand-primary-light/25 hover:border-brand-primary/45 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all duration-300 space-y-4">
                  <div className="w-12 h-12 bg-[#eeeeed] rounded-xl flex items-center justify-center text-brand-tertiary">
                    <Scissors className="w-6 h-6 text-brand-secondary" />
                  </div>
                  <h3 className="font-display text-lg text-brand-dark font-semibold">Cabeleireira</h3>
                  <p className="font-sans text-xs text-[#847375] leading-relaxed">
                    Design de corte inovador, visagismo personalizado, hidratação de alta nutrição e mechas criativas que valorizam o balanço natural dos seus fios.
                  </p>
                </div>

                {/* 4. Lash Design */}
                <div className="bg-white border border-brand-primary-light/25 hover:border-brand-primary/45 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all duration-300 space-y-4">
                  <div className="w-12 h-12 bg-brand-primary-light/20 rounded-xl flex items-center justify-center text-brand-primary">
                    <Eye className="w-6 h-6" />
                  </div>
                  <h3 className="font-display text-lg text-brand-dark font-semibold">Lash Design</h3>
                  <p className="font-sans text-xs text-[#847375] leading-relaxed">
                    Cílios volumosos e impecáveis com fitas brasileiras personalizadas ou lash lifting reconstrutor. Técnicas seguras de isolamento para preservar sua saúde ocular.
                  </p>
                </div>
              </div>
            </div>

            {/* THREE CORE PILLARS OF OUR BEAUTIFUL SPACE */}
            <div className="bg-[#faf9f8] rounded-3xl p-8 md:p-12 border border-brand-primary-light/30 space-y-10">
              <div className="text-center max-w-xl mx-auto space-y-2">
                <span className="font-sans text-xs font-bold text-brand-primary tracking-widest uppercase">Essência Alves Estética</span>
                <h3 className="font-display text-2xl md:text-3xl text-brand-dark font-bold">Por Que Escolher Nosso Espaço?</h3>
                <p className="font-sans text-xs text-brand-tertiary leading-relaxed">
                  Criamos uma atmosfera única para que sua experiência de beleza seja memorável, pautada no respeito e no amor.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Pillar 1: Ambiente familiar */}
                <div className="space-y-3 bg-white p-6 rounded-2xl border border-brand-primary-light/10 shadow-xs">
                  <div className="w-10 h-10 bg-brand-primary-light/20 rounded-xl flex items-center justify-center text-brand-primary">
                    <Users className="w-5 h-5" />
                  </div>
                  <h4 className="font-display font-bold text-brand-dark text-lg">Ambiente familiar</h4>
                  <p className="font-sans text-xs text-brand-tertiary leading-relaxed">
                    Mais que um salão, somos um ponto de encontro afetuoso onde você é recebida de braços abertos. Um ambiente tranquilo, perfeito para viver bons momentos de bem-estar ao lado de quem quer bem.
                  </p>
                </div>

                {/* Pillar 2: Limpo e Seguro */}
                <div className="space-y-3 bg-white p-6 rounded-2xl border border-brand-primary-light/10 shadow-xs">
                  <div className="w-10 h-10 bg-brand-secondary-light/30 rounded-xl flex items-center justify-center text-brand-secondary">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h4 className="font-display font-bold text-brand-dark text-lg">Limpo e Seguro</h4>
                  <p className="font-sans text-xs text-brand-tertiary leading-relaxed">
                    Compromisso absoluto com a sua saúde. Nossos materiais metálicos passam por rigorosa autoclave hospitalar, descartáveis premium são estritamente individuais e mantemos desinfecção constante do espaço.
                  </p>
                </div>

                {/* Pillar 3: Relaxar, se rejuvenescer e se sentir bela */}
                <div className="space-y-3 bg-white p-6 rounded-2xl border border-brand-primary-light/10 shadow-xs">
                  <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500">
                    <Smile className="w-5 h-5" />
                  </div>
                  <h4 className="font-display font-bold text-brand-dark text-lg">Momento de Relaxar & Brilhar</h4>
                  <p className="font-sans text-xs text-brand-tertiary leading-relaxed">
                    Um verdadeiro momento para relaxar, se rejuvenescer e se sentir muito mais bela. Saboreie nossos chás perfumados e cafés finos e deixe que nossas especialistas cuidem da sua melhor versão.
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* 3. NOSSAS ESPECIALISTAS - IN THE MIDDLE OF IT! */}
          <div id="especialistas" className="space-y-10 scroll-mt-24">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <span className="font-sans text-xs font-bold text-brand-primary tracking-widest uppercase">Excelência em Atendimento</span>
              <h2 className="font-display text-3xl md:text-4.5xl text-brand-dark font-bold">Conheça Nossas Especialistas</h2>
              <p className="font-sans text-xs text-brand-tertiary leading-relaxed">
                Nossa equipe é formada por profissionais renomadas com sólidos diplomas e capacitações práticas inovadoras para assegurar resultados estéticos impecáveis.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {specialists.filter(s => s.active).map(spec => (
                <div 
                  key={spec.id} 
                  className="bg-white rounded-2xl p-6 border border-brand-primary-light/40 shadow-sm flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-md relative group overflow-hidden"
                >
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-brand-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                  
                  <div className="w-28 h-28 rounded-full overflow-hidden mb-4 border-4 border-[#faf9f8] shadow-sm relative z-10 transition-transform duration-500 group-hover:scale-105">
                    <img 
                      src={spec.avatarUrl} 
                      alt={spec.name} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <h3 className="font-display text-xl text-brand-dark mb-1 font-semibold group-hover:text-brand-primary transition-colors">{spec.name}</h3>
                  <p className="font-sans text-xs text-brand-tertiary mb-3 uppercase tracking-wider font-extrabold text-[9px]">{spec.role}</p>
                  
                  <div className="flex items-center gap-1 text-xs text-brand-secondary mb-5 font-semibold">
                    <Star className="w-3.5 h-3.5 fill-current text-yellow-500" />
                    <span>{spec.rating} • {spec.role.split(' ')[0]}</span>
                  </div>

                  <button 
                    onClick={() => handleSelectSpecialist(spec)}
                    className="mt-auto w-full py-2.5 px-4 rounded-full border border-brand-primary text-brand-primary text-xs font-bold hover:bg-brand-primary hover:text-white transition-all duration-300 active:scale-95 cursor-pointer shadow-xs"
                  >
                    Ver Agenda & Serviços
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 4. CLIENT TESTIMONIALS */}
          <div className="bg-[#faf9f8]/45 border border-brand-primary-light/20 rounded-3xl p-8 md:p-12 space-y-8">
            <div className="text-center space-y-1">
              <span className="font-sans text-xs font-bold text-brand-secondary tracking-widest uppercase">Experiência Real</span>
              <h3 className="font-display text-2xl text-brand-dark font-semibold">O Que Dizem Nossas Clientes</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-2xl border border-brand-primary-light/10 relative shadow-sm">
                <span className="text-brand-primary-light/40 opacity-50 text-5xl font-serif absolute top-2 left-3">“</span>
                <p className="font-sans text-xs text-brand-tertiary italic leading-relaxed pt-2 relative z-10 pl-4">
                  "O ambiente da Alves Estética é de tirar o fôlego. O aconchego, a tranquilidade e a extrema técnica de atendimento me conquistaram desde o primeiro minuto. A limpeza de pele sênior tirou todas as impurezas sem nenhuma dor nas minhas marcas!"
                </p>
                <div className="mt-4 border-t border-brand-primary-light/10 pt-3 flex items-center justify-between">
                  <span className="font-sans text-[11px] font-bold text-brand-dark">Mariana S. de Oliveira</span>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 text-yellow-500 fill-current" />)}
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-brand-primary-light/10 relative shadow-sm">
                <span className="text-brand-primary-light/40 opacity-50 text-5xl font-serif absolute top-2 left-3">“</span>
                <p className="font-sans text-xs text-brand-tertiary italic leading-relaxed pt-2 relative z-10 pl-4">
                  "Fazer cílios e manicure com as especialistas da Alves tornou-se meu presente quinzenal preferido. O atendimento é extremamente de alto padrão, o local cheira maravilhosamente bem e as louças de chá no final são um amor à parte."
                </p>
                <div className="mt-4 border-t border-brand-primary-light/10 pt-3 flex items-center justify-between">
                  <span className="font-sans text-[11px] font-bold text-brand-dark">Letícia R. Mendes</span>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 text-yellow-500 fill-current" />)}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </section>
      )}

      {/* STEP 2: Service Selection */}
      {step === 2 && selectedSpecialist && (
        <section className="animate-fade-in max-w-xl mx-auto">
          {/* Mini Specialist Header */}
          <div className="flex items-center gap-4 p-5 bg-[#faf9f8] rounded-2xl border border-brand-primary-light/40 shadow-sm mb-8">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-brand-primary-light">
              <img 
                src={selectedSpecialist.avatarUrl} 
                alt={selectedSpecialist.name} 
                className="w-full h-full object-cover" 
              />
            </div>
            <div>
              <p className="font-sans text-[10px] font-bold text-brand-primary tracking-widest uppercase">Profissional Selecionada</p>
              <h3 className="font-display text-lg text-brand-dark font-semibold">{selectedSpecialist.name}</h3>
              <p className="text-xs text-brand-tertiary">{selectedSpecialist.role}</p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-display text-2xl text-brand-primary mb-1">Seleção de Serviços</h3>
            <p className="text-sm text-brand-tertiary">Escolha os procedimentos que deseja realizar hoje.</p>
          </div>

          <div className="space-y-4">
            {services
              .filter(service => selectedSpecialist.services.includes(service.id))
              .map(service => {
                const isSelected = selectedServices.some(s => s.id === service.id);
                return (
                  <label 
                    key={service.id}
                    onClick={() => toggleService(service)}
                    className={`flex items-center justify-between p-5 rounded-2xl border transition-all cursor-pointer shadow-sm ${
                      isSelected 
                        ? 'border-brand-primary bg-[#fcf8f8]' 
                        : 'border-brand-primary-light/40 bg-white hover:border-brand-primary-light'
                    }`}
                  >
                    <div className="flex flex-col gap-1 select-none">
                      <span className="font-sans font-semibold text-brand-dark">{service.name}</span>
                      <div className="flex items-center gap-4 text-xs text-brand-tertiary">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {service.duration} min
                        </span>
                        <span className="font-bold text-brand-primary">R$ {service.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                    <div className="relative flex items-center">
                      <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                        isSelected ? 'bg-brand-primary border-brand-primary' : 'border-brand-tertiary/40'
                      }`}>
                        {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                      </div>
                    </div>
                  </label>
                );
              })}
          </div>

          {/* Sticky Total Booking Bar */}
          <div className="mt-8 border-t border-brand-primary-light/40 pt-6 flex items-center justify-between mb-8">
            <div className="flex flex-col">
              <span className="font-sans text-[10px] uppercase font-bold tracking-widest text-brand-tertiary">Total Estimado</span>
              <span className="font-display text-2xl text-brand-dark">
                R$ {selectedServices.reduce((acc, s) => acc + s.price, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <button 
              onClick={handleServicesSubmit}
              disabled={selectedServices.length === 0}
              className={`px-8 py-3 rounded-full font-bold text-sm transition-all duration-300 ${
                selectedServices.length > 0 ? nextButtonActiveStyle : nextButtonInactiveStyle
              }`}
            >
              Próximo
            </button>
          </div>

          <div className="text-center">
            <button 
              onClick={() => setStep(1)} 
              className="text-xs text-brand-tertiary hover:text-brand-primary py-2 font-bold"
            >
              ← Voltar para especialistas
            </button>
          </div>
        </section>
      )}

      {/* STEP 3: Selecting Date & Time */}
      {step === 3 && selectedSpecialist && (
        <section className="animate-fade-in max-w-xl mx-auto">
          <div className="mb-6">
            <h3 className="font-display text-2xl text-brand-primary mb-1">Selecione uma Data</h3>
            <p className="text-sm text-brand-tertiary">Próximos 14 dias</p>
          </div>

          {/* Interactive Date Scroll — dynamic next 14 days */}
          <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar mb-8">
            {dayOptions.map((d) => {
              const isSelected = selectedDate === d.dateStr;
              const slotsForDay = generateDaySlots(d.dateStr, selectedSpecialist?.weeklySchedule);
              const isFolga = slotsForDay.length === 0;
              return (
                <button
                  type="button"
                  key={d.dateStr}
                  disabled={isFolga}
                  onClick={() => {
                    if (isFolga) return;
                    setSelectedDate(d.dateStr);
                    setSelectedTime('');
                    setBookingError('');
                  }}
                  className={`min-w-[70px] h-20 flex flex-col items-center justify-center rounded-xl border transition-all shrink-0 ${
                    isFolga
                      ? 'bg-white border-rose-200 text-brand-dark opacity-50 cursor-not-allowed'
                      : isSelected
                        ? 'bg-brand-primary text-white border-brand-primary shadow-md scale-105 font-bold cursor-pointer'
                        : 'bg-white border-brand-primary-light/40 text-brand-dark hover:border-brand-primary cursor-pointer'
                  }`}
                >
                  <span className="font-sans text-[10px] font-bold tracking-widest opacity-65 mb-1">{d.dowAbbr}</span>
                  <span className="font-sans text-xl font-bold">{d.dayNum}/{d.monthLabel}</span>
                  {d.isToday ? (
                    <span className={`text-[8px] font-bold uppercase mt-0.5 tracking-wider ${isSelected ? 'text-white/80' : 'text-brand-secondary'}`}>Hoje</span>
                  ) : isFolga ? (
                    <span className="text-[8px] font-bold uppercase mt-0.5 tracking-wider text-rose-500">Folga</span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {bookingError && (
            <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl p-3.5">
              {bookingError}
            </div>
          )}

          <div className="mb-6">
            <h3 className="font-display text-xl text-brand-primary mb-1 flex items-center gap-1.5">
              <Clock className="w-5 h-5 text-brand-primary" />
              Horários Disponíveis
            </h3>
            <p className="text-xs text-brand-tertiary">
              Duração estimada: <strong>{totalDuration} min</strong>. Horários ocupados ou que já passaram aparecem desativados.
            </p>
          </div>

          {slotAvailability.length === 0 ? (
            <p className="text-sm text-brand-tertiary italic py-6 text-center">A profissional não atende nesse dia.</p>
          ) : (() => {
            const morning = slotAvailability.filter(s => s.time < '12:00');
            const afternoon = slotAvailability.filter(s => s.time >= '12:00');
            const allUnavailable = slotAvailability.length > 0 && slotAvailability.every(s => s.past || s.conflict);

            const renderSlot = (s: typeof slotAvailability[number]) => {
              const isSelected = selectedTime === s.time;
              const disabled = s.past || s.conflict;
              const label = s.conflict ? `${s.time} (Ocupado)` : s.time;
              return (
                <button
                  type="button"
                  key={s.time}
                  disabled={disabled}
                  onClick={() => !disabled && handleTimeSelect(s.time)}
                  className={`py-3 rounded-lg border font-bold text-xs transition-colors ${
                    disabled
                      ? 'border-brand-tertiary/10 bg-[#faf9f8] text-brand-tertiary/30 cursor-not-allowed'
                      : isSelected
                        ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                        : 'bg-white border-brand-primary-light/20 text-brand-tertiary hover:bg-brand-primary-light/30 cursor-pointer'
                  }`}
                >
                  {label}
                </button>
              );
            };

            return (
              <>
                <div className="mb-8">
                  <div className="flex items-center gap-1 mb-3 text-brand-tertiary text-xs font-bold tracking-wide">
                    <Sun className="w-4 h-4" />
                    <span>MANHÃ</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {morning.length === 0 ? (
                      <span className="col-span-3 text-xs italic text-brand-tertiary/70 py-2">Sem horários cadastrados.</span>
                    ) : morning.map(renderSlot)}
                  </div>
                </div>
                <div className="mb-8">
                  <div className="flex items-center gap-1 mb-3 text-[#645055] text-xs font-bold tracking-wide">
                    <Droplets className="w-4 h-4" />
                    <span>TARDE</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {afternoon.length === 0 ? (
                      <span className="col-span-3 text-xs italic text-brand-tertiary/70 py-2">Sem horários cadastrados.</span>
                    ) : afternoon.map(renderSlot)}
                  </div>
                </div>
                {allUnavailable && (
                  <div className="mb-8 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-xl p-4 text-center">
                    Nenhum horário disponível neste dia. Escolha outra data acima.
                  </div>
                )}
              </>
            );
          })()}

          {/* Action Footer */}
          <div className="mt-8 border-t border-brand-primary-light/40 pt-6 flex items-center justify-between mb-8">
            <div className="flex flex-col">
              <span className="font-sans text-[10px] uppercase font-bold tracking-widest text-[#847375]">Selecionado</span>
              <span className="font-sans font-bold text-base text-brand-dark">
                {selectedTime ? `${selectedDate} de Maio às ${selectedTime}` : 'Selecione um horário'}
              </span>
            </div>
            <button 
              onClick={handleTimeSubmit}
              disabled={!selectedTime}
              className={`px-8 py-3 rounded-full font-bold text-sm transition-all duration-300 ${
                selectedTime ? nextButtonActiveStyle : nextButtonInactiveStyle
              }`}
            >
              Confirmar Horário
            </button>
          </div>

          <div className="text-center">
            <button 
              onClick={() => setStep(2)} 
              className="text-xs text-brand-tertiary hover:text-brand-primary py-2 font-bold"
            >
              ← Voltar para serviços
            </button>
          </div>
        </section>
      )}

      {/* STEP 4: Identification Form */}
      {step === 4 && selectedSpecialist && selectedServices.length > 0 && selectedTime && (
        <section className="animate-fade-in max-w-md mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl text-brand-primary mb-2">Quase lá...</h2>
            <p className="font-sans text-brand-tertiary text-sm leading-relaxed">
              Preencha seus dados para finalizarmos seu agendamento no salão.
            </p>
          </div>

          <form onSubmit={handleConfirmBooking} className="space-y-6 bg-white p-6 rounded-2xl border border-brand-primary-light/30 shadow-md">
            
            {/* Full Name */}
            <div className="space-y-1">
              <label htmlFor="user-name" className="font-sans text-[11px] font-bold uppercase tracking-widest text-[#847375] block ml-1">Nome Completo</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-tertiary" />
                <input 
                  type="text"
                  id="user-name"
                  required
                  placeholder="Ex: Maria Oliveira"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-[#faf9f8] border border-[#d6c2c4]/50 rounded-xl pl-11 pr-4 py-3 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all"
                />
              </div>
            </div>

            {/* WhatsApp */}
            <div className="space-y-1">
              <label htmlFor="user-whatsapp" className="font-sans text-[11px] font-bold uppercase tracking-widest text-[#847375] block ml-1">WhatsApp</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-tertiary" />
                <input 
                  type="tel"
                  id="user-whatsapp"
                  required
                  placeholder="(00) 0 0000-0000"
                  value={userWhatsapp}
                  onChange={handleWhatsappChange}
                  className="w-full bg-[#faf9f8] border border-[#d6c2c4]/50 rounded-xl pl-11 pr-4 py-3 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all"
                />
              </div>
              <p className="text-[10px] text-brand-tertiary/80 italic ml-1 mt-1">Enviaremos a confirmação por mensagem.</p>
            </div>

            {/* Summary snap container */}
            <div className="bg-brand-primary-light/25 rounded-xl p-4 border border-brand-primary-light/30 mt-6">
              <span className="font-sans text-[9px] font-bold tracking-widest text-brand-primary block mb-2 uppercase">RESUMO DO AGENDAMENTO</span>
              <div className="flex justify-between items-start mb-2">
                <div className="flex gap-2">
                  <Leaf className="w-4 h-4 text-brand-secondary shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="font-sans font-semibold text-sm text-brand-dark leading-snug">
                      {selectedServices.map(s => s.name).join(' + ')}
                    </span>
                    <span className="text-[11px] text-[#847375] mt-0.5">Com {selectedSpecialist.name}</span>
                  </div>
                </div>
                <span className="font-sans font-bold text-sm text-brand-primary shrink-0">
                  R$ {selectedServices.reduce((acc, s) => acc + s.price, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#847375] mt-3">
                <Calendar className="w-4 h-4 text-brand-secondary" />
                <span>24 de Maio de 2026, às {selectedTime} ({selectedServices.reduce((acc, s) => acc + s.duration, 0)} min)</span>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-brand-primary hover:bg-brand-primary-light hover:text-brand-primary text-white py-4 rounded-full font-bold text-sm transition-all duration-300 shadow-md shadow-brand-primary/10 flex items-center justify-center gap-2 group active:scale-98"
            >
              Confirmar Agendamento
              <CheckCircle className="w-4.5 h-4.5 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <p className="text-center text-[10px] text-brand-tertiary leading-relaxed px-4">
              Ao confirmar, você concorda com nossas políticas de agendamento e privacidade.
            </p>
          </form>

          <div className="text-center mt-6">
            <button 
              type="button"
              onClick={() => setStep(3)} 
              className="text-xs text-brand-tertiary hover:text-brand-primary py-2 font-bold"
            >
              ← Voltar para horário
            </button>
          </div>
        </section>
      )}

      {/* STEP 5: Booking Confirmed */}
      {step === 5 && finalBooking && selectedSpecialist && (
        <section className="animate-fade-in max-w-md mx-auto text-center">
          <div className="relative inline-flex mb-6">
            <div className="absolute inset-0 bg-brand-primary/10 blur-2xl rounded-full scale-150 animate-pulse"></div>
            <div className="relative w-24 h-24 bg-brand-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-brand-primary/20">
              <CheckCircle className="w-12 h-12" />
            </div>
          </div>

          <h2 className="font-display text-3xl text-brand-primary mb-2 font-semibold">Agendamento Realizado!</h2>
          <p className="text-brand-tertiary text-sm max-w-xs mx-auto mb-8 leading-relaxed">
            Sua reserva foi processada e aguarda confirmação final.
          </p>

          <div className="bg-[#faf9f8] p-5 rounded-2xl border border-brand-primary-light/40 space-y-4 shadow-sm text-left mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-brand-primary-light">
                <img 
                  src={selectedSpecialist.avatarUrl} 
                  alt={selectedSpecialist.name} 
                  className="w-full h-full object-cover" 
                />
              </div>
              <div>
                <span className="font-sans text-[9px] uppercase font-bold tracking-widest text-[#847375]">Profissional</span>
                <p className="font-sans font-bold text-brand-dark text-sm">{selectedSpecialist.name}</p>
              </div>
            </div>

            <div className="border-t border-brand-primary-light/10 pt-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-secondary-light/30 text-brand-secondary rounded-full flex items-center justify-center">
                <Leaf className="w-5 h-5" />
              </div>
              <div>
                <span className="font-sans text-[9px] uppercase font-bold tracking-widest text-[#847375]">Procedimentos</span>
                <p className="font-sans font-bold text-brand-dark text-sm">
                  {selectedServices.map(s => s.name).join(', ')}
                </p>
              </div>
            </div>

            <div className="border-t border-brand-primary-light/10 pt-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-primary-light/40 text-brand-primary rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="font-sans text-[9px] uppercase font-bold tracking-widest text-[#847375]">Data e Hora</span>
                <p className="font-sans font-bold text-brand-dark text-sm">
                  Segunda, {selectedDate} de Maio de 2026, às {selectedTime}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Real link to WhatsApp with filled text */}
            <a 
              href={`https://wa.me/${salonWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Realizei um agendamento de procedimento estético:
*Cliente:* ${userName}
*WhatsApp:* ${userWhatsapp}
*Procedimento(s):* ${selectedServices.map(s => s.name).join(', ')}
*Profissional:* ${selectedSpecialist ? selectedSpecialist.name : ''}
*Data e Hora:* ${selectedDate.split('-').reverse().join('/')} às ${selectedTime}
*Valor Total:* R$ ${selectedServices.reduce((sum, s) => sum + s.price, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
*Duração total:* ${selectedServices.reduce((sum, s) => sum + s.duration, 0)} minutos`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-full flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-98"
            >
              <MessageSquare className="w-5 h-5" />
              Notificar Salão via WhatsApp
            </a>

            <p className="text-[12px] text-brand-tertiary leading-normal px-2">
              Sua reserva está <span className="font-bold text-brand-primary">pré-confirmada</span> e já foi registrada no painel. Clique no botão acima para enviar o comprovante de agendamento diretamente ao WhatsApp da nossa equipe!
            </p>
          </div>

          <div className="mt-12 flex items-center justify-center gap-8">
            <button 
              onClick={() => {
                setStep(1);
                setSelectedSpecialist(null);
                setSelectedServices([]);
                setSelectedTime('');
                setUserName('');
                setUserWhatsapp('');
                setFinalBooking(null);
              }}
              className="text-xs text-brand-secondary border-b border-brand-secondary/35 uppercase tracking-widest font-bold pb-0.5 hover:text-brand-primary hover:border-brand-primary transition-all"
            >
              Realizar Novo Agendamento
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
