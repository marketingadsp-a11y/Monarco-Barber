import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Phone,
  MessageCircle,
  Search,
  Plus,
  Filter,
  DollarSign,
  User,
  Scissors,
} from 'lucide-react';
import { useBarbershop } from '../../contexts/BarbershopContext';
import { Barber, Appointment } from '../../types';
import {
  formatDateSpanish,
  formatTime12h,
  formatCurrency,
  getTodayDateString,
} from '../../utils/dateTime';

interface BarberMyAppointmentsViewProps {
  activeBarber: Barber;
  onOpenBookingModal: () => void;
  onOpenQrScanner: () => void;
  onSelectAppointmentDetail?: (appointment: Appointment) => void;
}

export const BarberMyAppointmentsView: React.FC<BarberMyAppointmentsViewProps> = ({
  activeBarber,
  onOpenBookingModal,
  onOpenQrScanner,
  onSelectAppointmentDetail,
}) => {
  const { appointments, updateAppointmentStatus, showToast } = useBarbershop();

  const [dateFilter, setDateFilter] = useState<'today' | 'upcoming' | 'all' | 'custom'>('today');
  const [customDate, setCustomDate] = useState<string>(getTodayDateString());
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const todayStr = getTodayDateString();

  // Filter appointments for this barber
  const myAppointments = appointments.filter((a) => a.barberId === activeBarber.id);

  // Filter by date
  const dateFiltered = myAppointments.filter((app) => {
    if (dateFilter === 'today') return app.date === todayStr;
    if (dateFilter === 'upcoming') return app.date >= todayStr && (app.status === 'confirmed' || app.status === 'pending');
    if (dateFilter === 'custom') return app.date === customDate;
    return true; // 'all'
  });

  // Filter by status
  const statusFiltered = dateFiltered.filter((app) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'confirmed') return app.status === 'confirmed' || app.status === 'pending';
    if (statusFilter === 'completed') return app.status === 'completed';
    if (statusFilter === 'cancelled') return app.status === 'cancelled' || app.status === 'no_show' || app.status === 'rejected';
    return true;
  });

  // Filter by search query
  const finalAppointments = statusFiltered.filter((app) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      app.clientName.toLowerCase().includes(q) ||
      (app.clientPhone && app.clientPhone.includes(q)) ||
      app.serviceNameSnapshot.toLowerCase().includes(q)
    );
  });

  // Quick Metrics for Today
  const todayApps = myAppointments.filter((a) => a.date === todayStr);
  const todayCompleted = todayApps.filter((a) => a.status === 'completed');
  const todayRevenue = todayCompleted.reduce((sum, a) => sum + (a.servicePriceSnapshot || 0), 0);

  const handleCompleteAndReward = async (appointment: Appointment) => {
    try {
      await updateAppointmentStatus(appointment.id, 'completed');
      showToast(
        'success',
        'Cita Completada',
        `Has completado la cita con ${appointment.clientName}. Puedes escanear su QR para registrar visita y abonar puntos.`
      );
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    }
  };

  const handleNoShow = async (appointmentId: string) => {
    try {
      await updateAppointmentStatus(appointmentId, 'no_show');
      showToast('info', 'No Asistió', 'La cita fue marcada como no asistida.');
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    const reason = prompt('Motivo de la cancelación:') || 'Cancelado por el barbero';
    try {
      await updateAppointmentStatus(appointmentId, 'cancelled', {
        cancelledBy: 'barber',
        cancelReason: reason,
      });
      showToast('info', 'Cita Cancelada', 'La cita ha sido cancelada.');
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Fast Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 bg-gradient-to-r from-[#181D26] to-[#12151B] border border-white/10 p-5 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#D4AF37]" />
            <h1 className="text-xl font-black text-white tracking-tight">Mis Citas & Agenda</h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Citas agendadas para <strong>{activeBarber.displayName}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenQrScanner}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-slate-200 text-xs font-bold transition-all shadow"
          >
            <span>Escanear QR</span>
          </button>
          <button
            onClick={onOpenBookingModal}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 text-xs font-bold shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Agendar Cita</span>
          </button>
        </div>
      </div>

      {/* Daily Metrics Pill Banner */}
      <div className="grid grid-cols-3 gap-2.5 text-xs">
        <div className="p-3 rounded-2xl bg-[#14171E] border border-white/10 shadow">
          <span className="text-slate-400 block text-[10px] uppercase font-bold">Citas Hoy</span>
          <span className="text-lg font-black text-white mt-0.5 block">{todayApps.length}</span>
        </div>
        <div className="p-3 rounded-2xl bg-[#14171E] border border-white/10 shadow">
          <span className="text-slate-400 block text-[10px] uppercase font-bold">Completadas</span>
          <span className="text-lg font-black text-emerald-400 mt-0.5 block">{todayCompleted.length}</span>
        </div>
        <div className="p-3 rounded-2xl bg-[#14171E] border border-white/10 shadow">
          <span className="text-slate-400 block text-[10px] uppercase font-bold">Ganado Hoy</span>
          <span className="text-lg font-black text-[#D4AF37] mt-0.5 block">{formatCurrency(todayRevenue)}</span>
        </div>
      </div>

      {/* Date Filter Tabs & Custom Date Picker */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/10">
          <button
            onClick={() => setDateFilter('today')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              dateFilter === 'today' ? 'bg-[#D4AF37] text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Hoy ({todayApps.length})
          </button>
          <button
            onClick={() => setDateFilter('upcoming')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              dateFilter === 'upcoming' ? 'bg-[#D4AF37] text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Próximas
          </button>
          <button
            onClick={() => setDateFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              dateFilter === 'all' ? 'bg-[#D4AF37] text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Todas ({myAppointments.length})
          </button>
          <button
            onClick={() => setDateFilter('custom')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              dateFilter === 'custom' ? 'bg-[#D4AF37] text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Fecha Específica
          </button>
        </div>

        {dateFilter === 'custom' && (
          <div className="p-3 rounded-2xl bg-[#14171E] border border-white/10 flex items-center justify-between animate-in fade-in">
            <span className="text-xs text-slate-300 font-medium">Seleccionar fecha de agenda:</span>
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="p-1.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs font-bold"
            />
          </div>
        )}
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por cliente, teléfono o servicio..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#D4AF37]"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'confirmed', 'completed', 'cancelled'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold uppercase tracking-wider border whitespace-nowrap transition-all ${
                statusFilter === st
                  ? 'bg-white/15 border-white/30 text-white'
                  : 'bg-[#14171E] border-white/5 text-slate-400 hover:text-slate-200'
              }`}
            >
              {st === 'all'
                ? 'Todos'
                : st === 'confirmed'
                ? 'Confirmadas'
                : st === 'completed'
                ? 'Completadas'
                : 'Canceladas'}
            </button>
          ))}
        </div>
      </div>

      {/* Appointments List */}
      <div className="space-y-3">
        {finalAppointments.length === 0 ? (
          <div className="p-10 rounded-3xl bg-[#14171E] border border-white/10 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
              <Calendar className="w-6 h-6" />
            </div>
            <p className="text-slate-300 text-xs font-semibold">
              No se encontraron citas con los filtros seleccionados.
            </p>
            <button
              onClick={onOpenBookingModal}
              className="px-4 py-2 rounded-xl bg-[#D4AF37] text-slate-950 font-bold text-xs shadow hover:scale-105 transition-all"
            >
              Agendar una Cita Ahora
            </button>
          </div>
        ) : (
          finalAppointments.map((app) => {
            const isConfirmed = app.status === 'confirmed' || app.status === 'pending';
            const isCompleted = app.status === 'completed';
            const isCancelled = app.status === 'cancelled' || app.status === 'no_show' || app.status === 'rejected';

            const cleanPhone = app.clientPhone ? app.clientPhone.replace(/\D/g, '') : '';
            const waPhone = cleanPhone.startsWith('52') ? cleanPhone : `52${cleanPhone}`;

            return (
              <div
                key={app.id}
                className={`p-4 rounded-2xl border transition-all shadow-lg space-y-3 ${
                  isConfirmed
                    ? 'bg-[#14171E] border-[#D4AF37]/30 shadow-[#D4AF37]/5'
                    : isCompleted
                    ? 'bg-[#12151B] border-emerald-500/20'
                    : 'bg-[#101217] border-white/5 opacity-75'
                }`}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#D4AF37] text-sm">
                        {formatTime12h(app.startTime)} - {formatTime12h(app.endTime)}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        • {formatDateSpanish(app.date)}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          isConfirmed
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : isCompleted
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {app.status === 'confirmed'
                          ? 'Confirmada'
                          : app.status === 'pending'
                          ? 'Pendiente'
                          : app.status === 'completed'
                          ? 'Completada'
                          : app.status === 'no_show'
                          ? 'No Asistió'
                          : 'Cancelada'}
                      </span>
                    </div>

                    <h3 className="font-bold text-white text-base mt-1">
                      {app.serviceNameSnapshot}
                    </h3>
                  </div>

                  <span className="font-black text-[#D4AF37] text-base">
                    {formatCurrency(app.servicePriceSnapshot)}
                  </span>
                </div>

                {/* Client Details & Contact Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-white/5 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>
                      Cliente: <strong className="text-white font-bold">{app.clientName}</strong>
                    </span>
                    {app.clientPhone && (
                      <span className="text-slate-400 font-mono text-[11px]">
                        ({app.clientPhone})
                      </span>
                    )}
                  </div>

                  {app.clientPhone && (
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`https://wa.me/${waPhone}?text=${encodeURIComponent(
                          `¡Hola ${app.clientName}! Te escribe ${activeBarber.displayName} de Monarca Barber respecto a tu cita de ${app.serviceNameSnapshot} para hoy.`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold text-[11px] transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                      <a
                        href={`tel:${cleanPhone}`}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-semibold text-[11px] transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Llamar</span>
                      </a>
                    </div>
                  )}
                </div>

                {app.notes && (
                  <p className="text-[11px] text-slate-400 bg-white/5 p-2 rounded-xl">
                    <strong>Nota:</strong> {app.notes}
                  </p>
                )}

                {/* Action Buttons for Confirmed Appointments */}
                {isConfirmed && (
                  <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleCompleteAndReward(app)}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow flex items-center justify-center gap-1.5 transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Completar Cita</span>
                    </button>
                    <button
                      onClick={() => handleNoShow(app.id)}
                      className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold transition-colors"
                    >
                      No Asistió
                    </button>
                    <button
                      onClick={() => handleCancelAppointment(app.id)}
                      className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-semibold transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
