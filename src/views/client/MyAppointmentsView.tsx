import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Scissors,
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
    <div className="space-y-6 pb-24">
      <div className="flex items-end justify-between border-b border-[#E6E1D6] pb-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#161514] tracking-wide uppercase">
            Mis Citas
          </h1>
          <p className="text-xs text-[#5C5852] mt-0.5">
            Gestiona tus reservas, historial y recordatorios
          </p>
        </div>
        <button
          onClick={onStartBooking}
          className="px-3.5 py-2.5 rounded-xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] transition-all flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0"
        >
          <PlusCircle className="w-4 h-4 text-[#C69765]" />
          <span>Nueva Cita</span>
        </button>
      </div>

      {/* Segmented Control */}
      <div className="flex p-1 rounded-xl bg-[#F2EFE9] border border-[#E6E1D6]">
        <button
          onClick={() => setActiveSegment('upcoming')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
            activeSegment === 'upcoming'
              ? 'bg-white text-[#161514] shadow-sm border border-[#E6E1D6]'
              : 'text-[#5C5852] hover:text-[#161514]'
          }`}
        >
          <span>Próximas</span>
          {upcomingAppointments.length > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums ${
                activeSegment === 'upcoming'
                  ? 'bg-[#161514] text-[#FAF9F6]'
                  : 'bg-[#E6E1D6] text-[#161514]'
              }`}
            >
              {upcomingAppointments.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSegment('history')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
            activeSegment === 'history'
              ? 'bg-white text-[#161514] shadow-sm border border-[#E6E1D6]'
              : 'text-[#5C5852] hover:text-[#161514]'
          }`}
        >
          <span>Historial</span>
          {pastAppointments.length > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums ${
                activeSegment === 'history'
                  ? 'bg-[#161514] text-[#FAF9F6]'
                  : 'bg-[#E6E1D6] text-[#161514]'
              }`}
            >
              {pastAppointments.length}
            </span>
          )}
        </button>
      </div>

      {displayedList.length === 0 ? (
        <div className="p-8 rounded-2xl bg-white border border-[#E6E1D6] text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#F2EFE9] border border-[#E6E1D6] flex items-center justify-center mx-auto text-[#9A6B3B]">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="font-display text-xl font-bold text-[#161514] uppercase tracking-wide">
            {activeSegment === 'upcoming' ? 'No tienes citas agendadas' : 'No hay historial de citas'}
          </h3>
          <p className="text-xs text-[#5C5852] max-w-xs mx-auto leading-relaxed">
            {activeSegment === 'upcoming'
              ? 'Reserva ahora tu corte o afeitado con tu barbero favorito.'
              : 'Las citas que completes o canceles aparecerán aquí.'}
          </p>
          {activeSegment === 'upcoming' && (
            <button
              onClick={onStartBooking}
              className="mt-2 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] font-semibold text-xs transition-colors"
            >
              <Scissors className="w-4 h-4 text-[#C69765]" />
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
                className="group rounded-2xl bg-white hover:bg-[#F7F5F0] border border-[#E6E1D6] hover:border-[#9A6B3B]/60 p-4 transition-all cursor-pointer space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={app.barberPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'}
                      alt={app.barberName}
                      className="w-12 h-12 rounded-xl object-cover border border-[#E6E1D6]"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h4 className="font-display text-lg font-bold text-[#161514] uppercase tracking-wide group-hover:text-[#9A6B3B] transition-colors">
                        {app.serviceNameSnapshot}
                      </h4>
                      <p className="text-xs text-[#5C5852]">
                        Con <strong className="text-[#161514]">{app.barberName}</strong>
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border uppercase tracking-wider shrink-0 ${
                      isConfirmed
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : isCompleted
                        ? 'bg-sky-50 text-sky-800 border-sky-200'
                        : isCancelled
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {app.status === 'confirmed' && 'Confirmada'}
                    {app.status === 'pending' && 'Pendiente'}
                    {app.status === 'completed' && 'Completada'}
                    {app.status === 'cancelled' && 'Cancelada'}
                    {app.status === 'rejected' && 'Rechazada'}
                    {app.status === 'no_show' && 'No Asistió'}
                  </span>
                </div>

                <div className="pt-2.5 border-t border-[#E6E1D6] flex items-center justify-between text-xs tabular-nums">
                  <div className="flex items-center gap-2 text-[#5C5852]">
                    <CalendarCheck className="w-4 h-4 text-[#9A6B3B]" />
                    <span>{formatDateSpanish(app.date)}</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono font-semibold text-[#161514]">
                    <Clock className="w-3.5 h-3.5 text-[#9A6B3B]" />
                    <span>{formatTime12h(app.startTime)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-[#5C5852]">
                  <span className="tabular-nums">
                    Precio: <strong className="font-mono text-[#161514]">{formatCurrency(app.servicePriceSnapshot)}</strong>
                  </span>
                  <span className="text-[#9A6B3B] font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
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
