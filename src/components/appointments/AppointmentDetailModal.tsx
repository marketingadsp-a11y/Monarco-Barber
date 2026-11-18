import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  CalendarPlus,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Appointment, AvailableTimeSlot, UserRole } from '../../types';
import { useBarbershop } from '../../contexts/BarbershopContext';
import {
  formatCurrency,
  formatDateSpanish,
  formatTime12h,
  getUpcomingDays,
  getTodayDateString,
} from '../../utils/dateTime';
import { getAvailableSlots, isShopOpenOnDate } from '../../services/availabilityEngine';

interface AppointmentDetailModalProps {
  appointment: Appointment | null;
  onClose: () => void;
  userRole?: UserRole;
}

export const AppointmentDetailModal: React.FC<AppointmentDetailModalProps> = ({
  appointment,
  onClose,
  userRole = 'client',
}) => {
  const {
    barbers,
    schedules,
    availabilityAppointments,
    blockedSlots,
    businessSettings,
    cancelAppointment,
    rescheduleAppointment,
  } = useBarbershop();

  const [mode, setMode] = useState<'view' | 'cancel' | 'reschedule'>('view');
  const [cancelReason, setCancelReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const [rescheduleDate, setRescheduleDate] = useState<string>(appointment?.date || getTodayDateString());
  const [selectedSlot, setSelectedSlot] = useState<AvailableTimeSlot | null>(null);

  if (!appointment) return null;

  const upcomingDays = getUpcomingDays(14);
  const barber = barbers.find((b) => b.id === appointment.barberId);

  const availableRescheduleSlots = getAvailableSlots({
    barberId: appointment.barberId,
    serviceDurationMinutes: appointment.serviceDurationSnapshot,
    date: rescheduleDate,
    barberSchedule: schedules[appointment.barberId],
    appointments: availabilityAppointments,
    blockedSlots,
    settings: businessSettings,
  });

  const handleCancelSubmit = async () => {
    setIsProcessing(true);
    try {
      const byRole: 'client' | 'barber' | 'admin' =
        userRole === 'admin' || userRole === 'superadmin' ? 'admin' : userRole === 'barber' ? 'barber' : 'client';
      await cancelAppointment(appointment.id, cancelReason, byRole);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRescheduleSubmit = async () => {
    if (!selectedSlot) return;
    setIsProcessing(true);
    try {
      await rescheduleAppointment(
        appointment.id,
        rescheduleDate,
        selectedSlot.startTime,
        selectedSlot.endTime
      );
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const isCancelled = appointment.status === 'cancelled' || appointment.status === 'rejected';
  const isCompleted = appointment.status === 'completed';

  const downloadIcs = () => {
    const [year, month, day] = appointment.date.split('-').map(Number);
    const [sh, sm] = appointment.startTime.split(':').map(Number);
    const [eh, em] = appointment.endTime.split(':').map(Number);

    const pad = (n: number) => n.toString().padStart(2, '0');
    const startStr = `${year}${pad(month)}${pad(day)}T${pad(sh)}${pad(sm)}00`;
    const endStr = `${year}${pad(month)}${pad(day)}T${pad(eh)}${pad(em)}00`;

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `UID:monarca_${appointment.id}`,
      `DTSTART:${startStr}`,
      `DTEND:${endStr}`,
      `SUMMARY:Cita: ${appointment.serviceNameSnapshot} - Monarca Barber`,
      `DESCRIPTION:Barbero: ${appointment.barberName}\\nFolio: ${appointment.id}`,
      `LOCATION:${businessSettings.address}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cita_${appointment.id}.ics`;
    a.click();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#161514]/55 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          className="relative w-full max-w-md bg-[#FAF9F6] border border-[#E6E1D6] rounded-3xl overflow-hidden shadow-[0_24px_60px_rgba(22,21,20,0.22)] z-10 p-5 sm:p-6 space-y-5"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[#E6E1D6]">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[#9A6B3B]">
                Detalle de Cita
              </span>
              <h3 className="font-display text-xl font-bold text-[#161514] tracking-wide uppercase tabular-nums">
                Folio: #{appointment.id.substring(0, 8)}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white hover:bg-[#F2EFE9] border border-[#E6E1D6] text-[#5C5852] hover:text-[#161514] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {mode === 'view' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E6E1D6]">
                <span className="text-xs text-[#5C5852]">Estado actual</span>
                <span
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border uppercase tracking-wider ${
                    isCancelled
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : isCompleted
                      ? 'bg-sky-50 text-sky-800 border-sky-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  {appointment.status === 'confirmed' && 'Confirmada'}
                  {appointment.status === 'pending' && 'Pendiente'}
                  {appointment.status === 'completed' && 'Completada'}
                  {appointment.status === 'cancelled' && 'Cancelada'}
                  {appointment.status === 'no_show' && 'No Asistió'}
                </span>
              </div>

              <div className="rounded-2xl bg-white border border-[#E6E1D6] p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-display text-xl font-bold text-[#161514] uppercase tracking-wide">
                      {appointment.serviceNameSnapshot}
                    </h4>
                    <p className="text-xs text-[#5C5852] tabular-nums">
                      {appointment.serviceDurationSnapshot} minutos
                    </p>
                  </div>
                  <span className="font-mono text-base font-bold text-[#9A6B3B] tabular-nums">
                    {formatCurrency(appointment.servicePriceSnapshot)}
                  </span>
                </div>

                <div className="pt-3 border-t border-[#E6E1D6] flex items-center gap-2.5">
                  <img
                    src={appointment.barberPhoto || barber?.photoUrl}
                    alt={appointment.barberName}
                    className="w-10 h-10 rounded-xl object-cover border border-[#E6E1D6]"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <span className="text-[10px] text-[#5C5852] uppercase tracking-wider block">
                      Barbero
                    </span>
                    <span className="text-xs font-bold text-[#161514]">
                      {appointment.barberName}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-white border border-[#E6E1D6]">
                  <span className="text-[10px] text-[#5C5852] block uppercase tracking-wider">Fecha</span>
                  <span className="font-bold text-[#161514] block mt-0.5">
                    {formatDateSpanish(appointment.date)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-[#E6E1D6]">
                  <span className="text-[10px] text-[#5C5852] block uppercase tracking-wider">Horario</span>
                  <span className="font-mono font-bold text-[#9A6B3B] block mt-0.5 tabular-nums">
                    {formatTime12h(appointment.startTime)} - {formatTime12h(appointment.endTime)}
                  </span>
                </div>
              </div>

              {appointment.notes && (
                <div className="p-3 rounded-xl bg-white border border-[#E6E1D6] text-xs">
                  <span className="text-[10px] text-[#5C5852] uppercase tracking-wider block mb-0.5">
                    Notas del cliente
                  </span>
                  <p className="text-[#161514] font-normal">{appointment.notes}</p>
                </div>
              )}

              {isCancelled && appointment.cancelReason && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                  <span className="font-semibold block">Motivo de cancelación:</span>
                  <p className="mt-0.5">{appointment.cancelReason}</p>
                </div>
              )}

              <div className="space-y-2 pt-2">
                {!isCancelled && !isCompleted && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setMode('reschedule')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] text-xs font-semibold transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-[#C69765]" />
                      <span>Reprogramar</span>
                    </button>

                    <button
                      onClick={() => setMode('cancel')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Cancelar Cita</span>
                    </button>
                  </div>
                )}

                <button
                  onClick={downloadIcs}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white hover:bg-[#F2EFE9] text-[#161514] text-xs font-semibold border border-[#E6E1D6] transition-colors"
                >
                  <CalendarPlus className="w-4 h-4 text-[#9A6B3B]" />
                  <span>Descargar Recordatorio (.ICS)</span>
                </button>
              </div>
            </div>
          )}

          {mode === 'cancel' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold">¿Deseas cancelar esta cita?</h5>
                  <p className="text-rose-800 mt-0.5">
                    El horario quedará liberado para otros clientes de inmediato.
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#161514] block mb-1.5">
                  Motivo de cancelación (opcional)
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ej. Cambio de planes imprevisto"
                  rows={3}
                  className="w-full p-3 rounded-xl bg-white border border-[#E6E1D6] text-[#161514] placeholder-[#5C5852]/60 text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setMode('view')}
                  disabled={isProcessing}
                  className="flex-1 py-2.5 rounded-xl bg-[#F2EFE9] hover:bg-[#E6E1D6] text-[#161514] text-xs font-semibold"
                >
                  Atrás
                </button>
                <button
                  onClick={handleCancelSubmit}
                  disabled={isProcessing}
                  className="flex-1 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold transition-all disabled:opacity-50"
                >
                  {isProcessing ? 'Cancelando...' : 'Confirmar Cancelación'}
                </button>
              </div>
            </div>
          )}

          {mode === 'reschedule' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#161514] block mb-1.5">
                  Selecciona la nueva fecha
                </label>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
                  {upcomingDays.slice(0, 14).map((d) => {
                    const isOpen = isShopOpenOnDate(d.dateStr, businessSettings);
                    return (
                      <button
                        key={d.dateStr}
                        type="button"
                        disabled={!isOpen}
                        onClick={() => {
                          if (!isOpen) return;
                          setRescheduleDate(d.dateStr);
                          setSelectedSlot(null);
                        }}
                        className={`flex flex-col items-center px-3 py-2 rounded-xl border text-xs min-w-16 transition-all tabular-nums ${
                          !isOpen
                            ? 'bg-[#F2EFE9]/70 text-[#9E978D] border-[#E6E1D6] opacity-55 cursor-not-allowed'
                            : rescheduleDate === d.dateStr
                            ? 'bg-[#161514] text-[#FAF9F6] font-bold border-[#161514]'
                            : 'bg-white text-[#5C5852] border-[#E6E1D6] hover:border-[#9A6B3B]'
                        }`}
                      >
                        <span className="text-[10px] uppercase">{d.dayName}</span>
                        <span className="text-sm font-bold">{d.dayNumber}</span>
                        {!isOpen && <span className="text-[8px] font-bold text-rose-700 uppercase">Cerrado</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#161514] block mb-1.5">
                  Selecciona nuevo horario
                </label>
                {!isShopOpenOnDate(rescheduleDate, businessSettings) ? (
                  <p className="text-xs text-[#5C5852] p-3 rounded-xl bg-white border border-[#E6E1D6] text-center">
                    La barbería está cerrada en esta fecha. Elige otro día.
                  </p>
                ) : availableRescheduleSlots.filter((s) => s.available).length === 0 ? (
                  <p className="text-xs text-[#5C5852] p-3 rounded-xl bg-white border border-[#E6E1D6] text-center">
                    No hay horarios disponibles para esta fecha.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 max-h-44 overflow-y-auto pr-1">
                    {availableRescheduleSlots
                      .filter((s) => s.available)
                      .map((s) => (
                        <button
                          key={s.startTime}
                          onClick={() => setSelectedSlot(s)}
                          className={`p-2 rounded-xl border text-xs font-mono text-center transition-all tabular-nums ${
                            selectedSlot?.startTime === s.startTime
                              ? 'bg-[#161514] text-[#FAF9F6] font-bold border-[#161514]'
                              : 'bg-white hover:bg-[#F2EFE9] text-[#161514] border-[#E6E1D6]'
                          }`}
                        >
                          {formatTime12h(s.startTime)}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setMode('view')}
                  disabled={isProcessing}
                  className="flex-1 py-2.5 rounded-xl bg-[#F2EFE9] hover:bg-[#E6E1D6] text-[#161514] text-xs font-semibold"
                >
                  Atrás
                </button>
                <button
                  onClick={handleRescheduleSubmit}
                  disabled={!selectedSlot || isProcessing}
                  className="flex-1 py-2.5 rounded-xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] text-xs font-semibold transition-all disabled:opacity-50"
                >
                  {isProcessing ? 'Reprogramando...' : 'Confirmar Cambio'}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
