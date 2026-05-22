import React, { useState, useEffect } from 'react';
import { Specialist, Service, Booking } from '../types';
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
  MessageSquare
} from 'lucide-react';

interface BookingFlowProps {
  specialists: Specialist[];
  services: Service[];
  onBookingConfirmed: (newBooking: Booking) => void;
  onGoToPortal: () => void;
  salonWhatsapp?: string;
}

export default function BookingFlow({ 
  specialists, 
  services, 
  onBookingConfirmed, 
  onGoToPortal,
  salonWhatsapp = '5511999999999' 
}: BookingFlowProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedSpecialist, setSelectedSpecialist] = useState<Specialist | null>(null);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('24'); // Defaulting to the screenshot's '14' or '24'
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [userWhatsapp, setUserWhatsapp] = useState<string>('');
  const [finalBooking, setFinalBooking] = useState<Booking | null>(null);

  // Auto scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

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
    const totalDuration = selectedServices.reduce((acc, s) => acc + s.duration, 0);

    const booking: Booking = {
      id: 'book-' + Date.now(),
      specialistId: selectedSpecialist.id,
      specialistName: selectedSpecialist.name,
      userName,
      userWhatsapp,
      serviceIds: selectedServices.map(s => s.id),
      serviceNames: selectedServices.map(s => s.name),
      date: `2026-05-${selectedDate.padStart(2, '0')}`,
      time: selectedTime,
      status: 'pendente', // Default to pending as per professional confirmation
      totalPrice,
      totalDuration,
      createdAt: new Date().toISOString()
    };

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(booking),
      });
      if (response.ok) {
        const savedBooking = await response.json();
        setFinalBooking(savedBooking);
        onBookingConfirmed(savedBooking);
        setStep(5);
      } else {
        // Fallback for network issues
        setFinalBooking(booking);
        onBookingConfirmed(booking);
        setStep(5);
      }
    } catch (err) {
      // Fallback
      setFinalBooking(booking);
      onBookingConfirmed(booking);
      setStep(5);
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

      {/* STEP 1: Specialists List */}
      {step === 1 && (
        <section className="animate-fade-in max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-5xl text-brand-primary mb-3">Nossas Especialistas</h2>
            <p className="font-sans text-brand-tertiary max-w-xl mx-auto leading-relaxed">
              Conheça a equipe dedicada a transformar sua beleza com técnicas avançadas e um toque de cuidado personalizado.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {specialists.filter(s => s.active).map(spec => (
              <div 
                key={spec.id} 
                className="bg-[#faf9f8] rounded-2xl p-6 border border-brand-primary-light/40 shadow-sm flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                <div className="w-28 h-28 rounded-full overflow-hidden mb-4 border-4 border-white shadow-sm">
                  <img 
                    src={spec.avatarUrl} 
                    alt={spec.name} 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <h3 className="font-display text-xl text-brand-dark mb-1 font-semibold">{spec.name}</h3>
                <p className="font-sans text-xs text-brand-tertiary mb-3">{spec.role}</p>
                
                <div className="flex items-center gap-1 text-xs text-brand-secondary mb-5 font-semibold">
                  <Star className="w-3.5 h-3.5 fill-current text-yellow-500" />
                  <span>{spec.rating} • {spec.role.split(' ')[0]}</span>
                </div>

                <button 
                  onClick={() => handleSelectSpecialist(spec)}
                  className="mt-auto w-full py-2.5 px-4 rounded-full border border-brand-primary text-brand-primary text-xs font-bold hover:bg-brand-primary hover:text-white transition-all duration-300 active:scale-95"
                >
                  Ver Agenda
                </button>
              </div>
            ))}
          </div>

          {/* Hidden Admin Access Button to respect confidentiality */}
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
            <p className="text-sm text-brand-tertiary">Maio 2026</p>
          </div>

          {/* Interactive Date Scroll */}
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar mb-8 cursor-pointer">
            {['22', '23', '24', '25', '26', '27'].map((day) => {
              const isSelected = selectedDate === day;
              // Map day strings to DOWs
              const daysOfWeek: { [key: string]: string } = {
                '22': 'SEX', '23': 'SÁB', '24': 'SEG', '25': 'TER', '26': 'QUA', '27': 'QUI'
              };
              return (
                <div 
                  key={day}
                  onClick={() => setSelectedDate(day)}
                  className={`min-w-[70px] h-20 flex flex-col items-center justify-center rounded-xl border transition-all ${
                    isSelected 
                      ? 'bg-brand-primary text-white border-brand-primary shadow-md scale-102 font-bold' 
                      : 'bg-white border-brand-primary-light/40 text-brand-dark hover:border-brand-primary'
                  }`}
                >
                  <span className="font-sans text-[10px] font-bold tracking-widest opacity-65 mb-1">{daysOfWeek[day] || 'SEG'}</span>
                  <span className="font-sans text-xl font-bold">{day}</span>
                </div>
              );
            })}
          </div>

          <div className="mb-6">
            <h3 className="font-display text-xl text-brand-primary mb-4 flex items-center gap-1.5">
              <Clock className="w-5 h-5 text-brand-primary" />
              Horários Disponíveis
            </h3>
          </div>

          {/* Morning Slots */}
          <div className="mb-8">
            <div className="flex items-center gap-1 mb-3 text-brand-tertiary text-xs font-bold tracking-wide">
              <Sun className="w-4 h-4" />
              <span>MANHÃ</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {['09:00', '09:30', '10:00', '10:30', '11:00'].map(t => {
                const isSelected = selectedTime === t;
                return (
                  <button 
                    type="button"
                    key={t}
                    onClick={() => handleTimeSelect(t)}
                    className={`py-3 rounded-lg border font-bold text-xs transition-colors ${
                      isSelected 
                        ? 'bg-brand-primary text-white border-brand-primary shadow-sm' 
                        : 'bg-white border-brand-primary-light/20 text-brand-tertiary hover:bg-brand-primary-light/30'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
              <button 
                disabled 
                type="button" 
                className="py-3 rounded-lg border border-brand-tertiary/10 bg-[#faf9f8] text-brand-tertiary/20 font-bold text-xs cursor-not-allowed"
              >
                11:30 (Ocupado)
              </button>
            </div>
          </div>

          {/* Afternoon Slots */}
          <div className="mb-8">
            <div className="flex items-center gap-1 mb-3 text-[#645055] text-xs font-bold tracking-wide">
              <Droplets className="w-4 h-4" />
              <span>TARDE</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {['14:00', '14:30', '15:00', '15:30', '16:00', '16:30'].map(t => {
                const isSelected = selectedTime === t;
                return (
                  <button 
                    type="button"
                    key={t}
                    onClick={() => handleTimeSelect(t)}
                    className={`py-3 rounded-lg border font-bold text-xs transition-colors ${
                      isSelected 
                        ? 'bg-brand-primary text-white border-brand-primary shadow-sm' 
                        : 'bg-white border-brand-primary-light/20 text-brand-tertiary hover:bg-brand-primary-light/30'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

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
*Data e Hora:* Dia ${selectedDate} de Maio de 2026, às ${selectedTime}
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
