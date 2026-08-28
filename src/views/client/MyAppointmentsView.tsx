import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Scissors,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  PlusCircle,
  CalendarCheck,
} from 'lucide-react';
import { useBarbershop } from '../../contexts/BarbershopContext';
import { Appointment } from '../../types';
import { formatDateSpanish, formatTime12h, formatCurrency } from '../../utils/dateTime';

interface MyAppointmentsViewProps {
  onOpenAppointmentDetail: (appointment: Appointment) => void;
  onStartBooking: () => void;
}

export const MyAppointmentsView: React.FC<MyAppointmentsViewProps> = ({
  onOpenAppointmentDetail,
  onStartBooking,
}) => {
  const { appointments } = useBarbershop();
  const [activeSegment, setActiveSegment] = useState<'upcoming' | 'history'>('upcoming');

  const upcomingAppointments = appointments.filter(
    (a) => a.status === 'confirmed' || a.status === 'pending'
  );

  const pastAppointments = appointments.filter(
    (a) => a.status === 'completed' || a.status === 'cancelled' || a.status === 'no_show' || a.status === 'rejected'
  );

  const displayedList = activeSegment === 'upcoming' ? upcomingAppointments : pastAppointments;

  return (
    <div className="space-y-5 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Mis Citas</h1>
          <p className="text-xs text-slate-400">
            Gestiona tus reservas, historial y recordatorios
          </p>
        </div>
        <button
          onClick={onStartBooking}
          className="p-2.5 rounded-2xl bg-[#D4AF37]/15 text-[#D4AF37] hover:bg-[#D4AF37]/25 border border-[#D4AF37]/30 transition-all flex items-center gap-1.5 text-xs font-bold"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Nueva Cita</span>
        </button>
      </div>

      {/* Segmented Control */}
      <div className="flex p-1 rounded-2xl bg-[#14171E] border border-white/10">
        <button
          onClick={() => setActiveSegment('upcoming')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeSegment === 'upcoming'
              ? 'bg-[#D4AF37] text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>Próximas</span>
          {upcomingAppointments.length > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeSegment === 'upcoming'
                  ? 'bg-slate-950 text-[#D4AF37]'
                  : 'bg-white/10 text-slate-200'
              }`}
            >
              {upcomingAppointments.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSegment('history')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeSegment === 'history'
              ? 'bg-[#D4AF37] text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>Historial</span>
          {pastAppointments.length > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeSegment === 'history'
                  ? 'bg-slate-950 text-[#D4AF37]'
                  : 'bg-white/10 text-slate-200'
              }`}
            >
              {pastAppointments.length}
            </span>
          )}
        </button>
      </div>

      {/* Appointments List */}
      {displayedList.length === 0 ? (
        <div className="p-8 rounded-3xl bg-[#14171E] border border-white/10 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-slate-400">
            <Calendar className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-white text-base">
            {activeSegment === 'upcoming' ? 'No tienes citas agendadas' : 'No hay historial de citas'}
          </h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {activeSegment === 'upcoming'
              ? 'Reserva ahora tu corte o afeitado con tu barbero favorito.'
              : 'Las citas que completes o canceles aparecerán aquí.'}
          </p>
          {activeSegment === 'upcoming' && (
            <button
              onClick={onStartBooking}
              className="mt-2 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 font-bold text-xs shadow-lg"
            >
              <Scissors className="w-4 h-4" />
              <span>Agendar mi primer cita</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {displayedList.map((app) => {
            const isConfirmed = app.status === 'confirmed';
            const isCancelled = app.status === 'cancelled' || app.status === 'rejected';
            const isCompleted = app.status === 'completed';

            return (
              <div
                key={app.id}
                onClick={() => onOpenAppointmentDetail(app)}
                className="group rounded-3xl bg-[#14171E] hover:bg-[#181D26] border border-white/10 hover:border-[#D4AF37]/40 p-4 transition-all cursor-pointer shadow-lg space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={app.barberPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'}
                      alt={app.barberName}
                      className="w-12 h-12 rounded-2xl object-cover border border-white/15"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h4 className="font-bold text-white text-sm group-hover:text-[#D4AF37] transition-colors">
                        {app.serviceNameSnapshot}
                      </h4>
                      <p className="text-xs text-slate-300">
                        Con <strong className="text-white">{app.barberName}</strong>
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      isConfirmed
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : isCompleted
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : isCancelled
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {app.status === 'confirmed' && 'Confirmada'}
                    {app.status === 'pending' && 'Pendiente'}
                    {app.status === 'completed' && 'Completada'}
                    {app.status === 'cancelled' && 'Cancelada'}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <CalendarCheck className="w-4 h-4 text-[#D4AF37]" />
                    <span>{formatDateSpanish(app.date)}</span>
                  </div>
                  <div className="flex items-center gap-1 font-bold text-[#D4AF37]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatTime12h(app.startTime)}</span>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between text-xs text-slate-400">
                  <span>Precio: <strong className="text-white">{formatCurrency(app.servicePriceSnapshot)}</strong></span>
                  <span className="text-[#D4AF37] font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Gestionar</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
