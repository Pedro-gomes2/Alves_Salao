import React, { useEffect } from 'react';
import { Booking, RoleType } from '../types';
import { X, Check, DollarSign, MessageSquare, Calendar, Clock, User, Phone, Sparkles } from 'lucide-react';

interface BookingDetailsModalProps {
  booking: Booking | null;
  onClose: () => void;
  onConfirm: (b: Booking) => void;
  onFinalize: (b: Booking) => void;
  onCancel: (b: Booking) => void;
  roleType: RoleType;
}

const statusStyles: Record<Booking['status'], string> = {
  pendente: 'bg-[#efdfd9] text-[#645a55] border-[#d6c2c4]',
  confirmado: 'bg-[#f0deb0] text-[#6a5d39] border-[#e5cf9a]',
  finalizado: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelado: 'bg-red-50 text-red-700 border-red-200',
};

const statusLabel: Record<Booking['status'], string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
};

export default function BookingDetailsModal({
  booking, onClose, onConfirm, onFinalize, onCancel, roleType,
}: BookingDetailsModalProps) {
  useEffect(() => {
    if (!booking) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [booking, onClose]);

  if (!booking) return null;

  const cleanPhone = booking.userWhatsapp.replace(/\D/g, '');
  const waPhone = cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone;
  const formattedDate = booking.date.split('-').reverse().join('/');
  const createdDate = (() => {
    try { return new Date(booking.createdAt).toLocaleString('pt-BR'); } catch { return booking.createdAt; }
  })();

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-brand-dark/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-brand-primary-light/40 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-br from-brand-primary to-brand-primary-light/80 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest font-bold opacity-80">
            <Sparkles className="w-3.5 h-3.5" /> Detalhes do Agendamento
          </div>
          <h3 className="font-display text-2xl font-bold mt-1">{booking.userName}</h3>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider border ${statusStyles[booking.status]}`}>
              {statusLabel[booking.status]}
            </span>
            <span className="text-[11px] opacity-90 font-mono">#{booking.id}</span>
          </div>
        </div>

        <div className="p-6 space-y-5 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-brand-tertiary flex items-center gap-1"><Calendar className="w-3 h-3" /> Data</span>
              <span className="font-sans font-bold text-brand-dark">{formattedDate}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-brand-tertiary flex items-center gap-1"><Clock className="w-3 h-3" /> Horário</span>
              <span className="font-sans font-bold text-brand-dark">{booking.time} ({booking.totalDuration} min)</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-brand-tertiary flex items-center gap-1"><User className="w-3 h-3" /> Profissional</span>
              <span className="font-sans font-bold text-brand-secondary">{booking.specialistName}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-brand-tertiary flex items-center gap-1"><Phone className="w-3 h-3" /> Contato</span>
              <a
                href={`https://wa.me/${waPhone}`}
                target="_blank"
                rel="noreferrer"
                className="font-sans font-bold text-brand-primary hover:underline flex items-center gap-1"
              >
                <MessageSquare className="w-3 h-3" /> {booking.userWhatsapp}
              </a>
            </div>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-brand-tertiary block mb-1.5">Serviços</span>
            <ul className="space-y-1">
              {booking.serviceNames.map((n, i) => (
                <li key={i} className="flex items-center gap-2 text-brand-dark">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                  <span className="font-medium">{n}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-between bg-[#faf9f8] border border-brand-primary-light/30 rounded-xl px-4 py-3">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-brand-tertiary block">Total</span>
              <span className="font-display text-2xl font-bold text-brand-primary">R$ {booking.totalPrice.toFixed(2)}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider text-brand-tertiary block">Criado em</span>
              <span className="text-xs text-brand-dark font-mono">{createdDate}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            {booking.status === 'pendente' && (
              <>
                <button
                  onClick={() => onConfirm(booking)}
                  className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold transition-all active:scale-95 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" /> Confirmar (WhatsApp)
                </button>
                <button
                  onClick={() => onCancel(booking)}
                  className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 rounded-full text-xs font-bold transition-all active:scale-95"
                >
                  <X className="w-3.5 h-3.5" /> Recusar
                </button>
              </>
            )}
            {booking.status === 'confirmado' && (
              <>
                <button
                  onClick={() => onFinalize(booking)}
                  className="flex-1 min-w-[160px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-full text-xs font-bold transition-all active:scale-95 shadow-sm"
                >
                  <DollarSign className="w-3.5 h-3.5" /> Finalizar (Finanças)
                </button>
                {roleType === 'admin' && (
                  <button
                    onClick={() => onCancel(booking)}
                    className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-brand-tertiary hover:text-red-600 hover:bg-red-50 rounded-full text-xs font-bold transition-colors border border-transparent hover:border-red-200"
                  >
                    <X className="w-3.5 h-3.5" /> Cancelar
                  </button>
                )}
              </>
            )}
            {booking.status === 'finalizado' && (
              <span className="w-full text-center text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-3 py-2.5 rounded-full">
                Atendimento encaminhado ao financeiro.
              </span>
            )}
            {booking.status === 'cancelado' && (
              <span className="w-full text-center text-xs text-red-700 font-bold bg-red-50 border border-red-200 px-3 py-2.5 rounded-full">
                Este agendamento foi cancelado.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
