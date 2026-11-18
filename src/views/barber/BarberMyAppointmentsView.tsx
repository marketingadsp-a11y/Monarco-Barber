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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 bg-white border border-[#E6E1D6] p-5 rounded-3xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#9A6B3B]" />
            <h1 className="font-display text-2xl font-bold text-[#161514] uppercase tracking-wide">Mis Citas & Agenda</h1>
          </div>
          <p className="text-xs text-[#5C5852] mt-0.5">
            Citas agendadas para <strong className="text-[#161514]">{activeBarber.displayName}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenQrScanner}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-[#F2EFE9] hover:bg-[#E8E3D9] border border-[#D2CBBF] text-[#161514] text-xs font-semibold transition-all"
          >
            <span>Escanear QR</span>
          </button>
          <button
            onClick={onOpenBookingModal}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] text-xs font-semibold shadow-sm active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 text-[#C69765]" />
            <span>Agendar Cita</span>
          </button>
        </div>
      </div>

      {/* Daily Metrics Banner */}
      <div className="grid grid-cols-3 gap-2.5 text-xs">
        <div className="p-3.5 rounded-2xl bg-white border border-[#E6E1D6] shadow-xs">
          <span className="text-[#5C5852] block text-[10px] uppercase font-semibold tracking-wider">Citas Hoy</span>
          <span className="font-mono tabular-nums text-lg font-bold text-[#161514] mt-0.5 block">{todayApps.length}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-white border border-[#E6E1D6] shadow-xs">
          <span className="text-[#5C5852] block text-[10px] uppercase font-semibold tracking-wider">Completadas</span>
          <span className="font-mono tabular-nums text-lg font-bold text-emerald-700 mt-0.5 block">{todayCompleted.length}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-white border border-[#E6E1D6] shadow-xs">
          <span className="text-[#5C5852] block text-[10px] uppercase font-semibold tracking-wider">Ganado Hoy</span>
          <span className="font-mono tabular-nums text-lg font-bold text-[#9A6B3B] mt-0.5 block">{formatCurrency(todayRevenue)}</span>
        </div>
      </div>

      {/* Date Filter Tabs & Custom Date Picker */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-[#F2EFE9] border border-[#E6E1D6]">
          <button
            onClick={() => setDateFilter('today')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              dateFilter === 'today' ? 'bg-[#161514] text-[#FAF9F6] shadow-xs' : 'text-[#5C5852] hover:text-[#161514]'
            }`}
          >
            Hoy ({todayApps.length})
          </button>
          <button
            onClick={() => setDateFilter('upcoming')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              dateFilter === 'upcoming' ? 'bg-[#161514] text-[#FAF9F6] shadow-xs' : 'text-[#5C5852] hover:text-[#161514]'
            }`}
          >
            Próximas
          </button>
          <button
            onClick={() => setDateFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              dateFilter === 'all' ? 'bg-[#161514] text-[#FAF9F6] shadow-xs' : 'text-[#5C5852] hover:text-[#161514]'
            }`}
          >
            Todas ({myAppointments.length})
          </button>
          <button
            onClick={() => setDateFilter('custom')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              dateFilter === 'custom' ? 'bg-[#161514] text-[#FAF9F6] shadow-xs' : 'text-[#5C5852] hover:text-[#161514]'
            }`}
          >
            Fecha Específica
          </button>
        </div>

        {dateFilter === 'custom' && (
          <div className="p-3 rounded-2xl bg-white border border-[#E6E1D6] flex items-center justify-between animate-in fade-in">
            <span className="text-xs text-[#161514] font-medium">Seleccionar fecha de agenda:</span>
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="p-1.5 rounded-xl bg-[#FAF9F6] border border-[#D2CBBF] text-[#161514] text-xs font-semibold focus:outline-none focus:border-[#161514]"
            />
          </div>
        )}
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8E887E]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por cliente, teléfono o servicio..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] placeholder-[#8E887E] text-xs focus:outline-none focus:border-[#161514]"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'confirmed', 'completed', 'cancelled'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold uppercase tracking-wider border whitespace-nowrap transition-all ${
                statusFilter === st
                  ? 'bg-[#161514] border-[#161514] text-[#FAF9F6]'
                  : 'bg-white border-[#E6E1D6] text-[#5C5852] hover:text-[#161514]'
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
          <div className="p-10 rounded-3xl bg-white border border-[#E6E1D6] text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#F2EFE9] border border-[#E6E1D6] flex items-center justify-center mx-auto text-[#9A6B3B]">
              <Calendar className="w-6 h-6" />
            </div>
            <p className="text-[#161514] text-xs font-semibold">
              No se encontraron citas con los filtros seleccionados.
            </p>
            <button
              onClick={onOpenBookingModal}
              className="px-4 py-2.5 rounded-xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] font-semibold text-xs shadow-xs transition-all"
            >
              Agendar una Cita Ahora
            </button>
          </div>
        ) : (
          finalAppointments.map((app) => {
            const isConfirmed = app.status === 'confirmed' || app.status === 'pending';
            const isCompleted = app.status === 'completed';

            const cleanPhone = app.clientPhone ? app.clientPhone.replace(/\D/g, '') : '';
            const waPhone = cleanPhone.startsWith('52') ? cleanPhone : `52${cleanPhone}`;

            return (
              <div
                key={app.id}
                className={`p-4 rounded-2xl border transition-all shadow-xs space-y-3 ${
                  isConfirmed
                    ? 'bg-white border-[#9A6B3B]/45'
                    : isCompleted
                    ? 'bg-white border-emerald-200'
                    : 'bg-[#F7F5F0] border-[#E6E1D6] opacity-75'
                }`}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono tabular-nums font-bold text-[#9A6B3B] text-sm">
                        {formatTime12h(app.startTime)} - {formatTime12h(app.endTime)}
                      </span>
                      <span className="text-xs text-[#5C5852] font-medium">
                        · {formatDateSpanish(app.date)}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase ${
                          isConfirmed
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : isCompleted
                            ? 'bg-sky-50 text-sky-800 border border-sky-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
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

                    <h3 className="font-bold text-[#161514] text-base mt-1">
                      {app.serviceNameSnapshot}
                    </h3>
                  </div>

                  <span className="font-mono tabular-nums font-bold text-[#161514] text-base">
                    {formatCurrency(app.servicePriceSnapshot)}
                  </span>
                </div>

                {/* Client Details & Contact Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#E6E1D6] text-xs">
                  <div className="flex items-center gap-2 text-[#5C5852]">
                    <User className="w-4 h-4 text-[#9A6B3B] shrink-0" />
                    <span>
                      Cliente: <strong className="text-[#161514] font-bold">{app.clientName}</strong>
                    </span>
                    {app.clientPhone && (
                      <span className="text-[#5C5852] font-mono text-[11px]">
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
                        className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-semibold text-[11px] transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                      <a
                        href={`tel:${cleanPhone}`}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#F2EFE9] hover:bg-[#E8E3D9] border border-[#D2CBBF] text-[#161514] font-semibold text-[11px] transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Llamar</span>
                      </a>
                    </div>
                  )}
                </div>

                {app.notes && (
                  <p className="text-[11px] text-[#5C5852] bg-[#FAF9F6] border border-[#E6E1D6] p-2 rounded-xl">
                    <strong className="text-[#161514]">Nota:</strong> {app.notes}
                  </p>
                )}

                {/* Action Buttons for Confirmed Appointments */}
                {isConfirmed && (
                  <div className="pt-2 border-t border-[#E6E1D6] flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleCompleteAndReward(app)}
                      className="flex-1 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Completar Cita</span>
                    </button>
                    <button
                      onClick={() => handleNoShow(app.id)}
                      className="px-3 py-2 rounded-xl bg-[#F2EFE9] hover:bg-[#E8E3D9] border border-[#D2CBBF] text-[#161514] text-xs font-semibold transition-colors"
                    >
                      No Asistió
                    </button>
                    <button
                      onClick={() => handleCancelAppointment(app.id)}
                      className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-xs font-semibold transition-colors"
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
