import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Scissors,
  AlertTriangle,
  CalendarPlus,
  RefreshCw,
  XCircle,
  CheckCircle2,
  Phone,
  MessageCircle,
  FileText,
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
import { getAvailableSlots } from '../../services/availabilityEngine';

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
    services,
    barbers,
    schedules,
    appointments,
    blockedSlots,
    businessSettings,
    cancelAppointment,
    rescheduleAppointment,
    updateAppointmentStatus,
  } = useBarbershop();

  const [mode, setMode] = useState<'view' | 'cancel' | 'reschedule'>('view');
  const [cancelReason, setCancelReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Reschedule state
  const [rescheduleDate, setRescheduleDate] = useState<string>(appointment?.date || getTodayDateString());
  const [selectedSlot, setSelectedSlot] = useState<AvailableTimeSlot | null>(null);

  if (!appointment) return null;

  const upcomingDays = getUpcomingDays(14);
  const barber = barbers.find((b) => b.id === appointment.barberId);
  const service = services.find((s) => s.id === appointment.serviceId);

  // Reschedule slots calculation
  const availableRescheduleSlots = getAvailableSlots({
    barberId: appointment.barberId,
    serviceDurationMinutes: appointment.serviceDurationSnapshot,
    date: rescheduleDate,
    barberSchedule: schedules[appointment.barberId],
    appointments,
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
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-[#14171E] border border-white/15 rounded-3xl overflow-hidden shadow-2xl z-10 p-5 space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">
                Detalle de Cita
              </span>
              <h3 className="text-base font-bold text-white tracking-tight">
                Folio: #{appointment.id.substring(0, 8)}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/5 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* VIEW MODE */}
          {mode === 'view' && (
            <div className="space-y-4">
              {/* Status Badge Banner */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-xs text-slate-400">Estado actual:</span>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${
                    isCancelled
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : isCompleted
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {appointment.status === 'confirmed' && '● Confirmada'}
                  {appointment.status === 'pending' && '● Pendiente'}
                  {appointment.status === 'completed' && '✓ Completada'}
                  {appointment.status === 'cancelled' && '✕ Cancelada'}
                  {appointment.status === 'no_show' && 'No Asistió'}
                </span>
              </div>

              {/* Service & Barber Info Card */}
              <div className="rounded-2xl bg-[#181D26] border border-white/10 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-white text-base">
                      {appointment.serviceNameSnapshot}
                    </h4>
                    <p className="text-xs text-slate-400">
                      {appointment.serviceDurationSnapshot} minutos
                    </p>
                  </div>
                  <span className="text-base font-black text-[#D4AF37]">
                    {formatCurrency(appointment.servicePriceSnapshot)}
                  </span>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={appointment.barberPhoto || barber?.photoUrl}
                      alt={appointment.barberName}
                      className="w-10 h-10 rounded-xl object-cover border border-white/15"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <span className="text-[10px] text-slate-400 block">Barbero</span>
                      <span className="text-xs font-bold text-white">{appointment.barberName}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Schedule Info */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                  <span className="text-[10px] text-slate-400 block uppercase">Fecha</span>
                  <span className="font-bold text-white block mt-0.5">
                    {formatDateSpanish(appointment.date)}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                  <span className="text-[10px] text-slate-400 block uppercase">Horario</span>
                  <span className="font-bold text-[#D4AF37] block mt-0.5">
                    {formatTime12h(appointment.startTime)} - {formatTime12h(appointment.endTime)}
                  </span>
                </div>
              </div>

              {/* Client notes if any */}
              {appointment.notes && (
                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-xs">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">
                    Notas del cliente
                  </span>
                  <p className="text-slate-300 font-normal">{appointment.notes}</p>
                </div>
              )}

              {/* Cancel info if cancelled */}
              {isCancelled && appointment.cancelReason && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                  <span className="font-semibold block">Motivo de cancelación:</span>
                  <p className="mt-0.5">{appointment.cancelReason}</p>
                </div>
              )}

              {/* Actions Footer */}
              <div className="space-y-2 pt-2">
                {!isCancelled && !isCompleted && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setMode('reschedule')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Reprogramar</span>
                    </button>

                    <button
                      onClick={() => setMode('cancel')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/20 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      <span>Cancelar Cita</span>
                    </button>
                  </div>
                )}

                <button
                  onClick={downloadIcs}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium border border-white/10 transition-colors"
                >
                  <CalendarPlus className="w-4 h-4 text-[#D4AF37]" />
                  <span>Descargar Recordatorio (.ICS)</span>
                </button>
              </div>
            </div>
          )}

          {/* CANCEL MODE */}
          {mode === 'cancel' && (
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold">¿Deseas cancelar esta cita?</h5>
                  <p className="opacity-90 mt-0.5">
                    El horario quedará liberado para otros clientes de inmediato.
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Motivo de cancelación (opcional)
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ej. Cambio de planes imprevisto"
                  rows={3}
                  className="w-full p-3 rounded-2xl bg-slate-900 border border-white/15 text-white text-xs focus:outline-none focus:border-rose-400"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setMode('view')}
                  disabled={isProcessing}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
                >
                  Atrás
                </button>
                <button
                  onClick={handleCancelSubmit}
                  disabled={isProcessing}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50"
                >
                  {isProcessing ? 'Cancelando...' : 'Confirmar Cancelación'}
                </button>
              </div>
            </div>
          )}

          {/* RESCHEDULE MODE */}
          {mode === 'reschedule' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Selecciona la nueva fecha
                </label>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
                  {upcomingDays.slice(0, 8).map((d) => (
                    <button
                      key={d.dateStr}
                      onClick={() => {
                        setRescheduleDate(d.dateStr);
                        setSelectedSlot(null);
                      }}
                      className={`flex flex-col items-center px-3 py-2 rounded-xl border text-xs min-w-16 transition-all ${
                        rescheduleDate === d.dateStr
                          ? 'bg-[#D4AF37] text-slate-950 font-bold border-[#D4AF37]'
                          : 'bg-white/5 text-slate-300 border-white/10'
                      }`}
                    >
                      <span className="text-[10px]">{d.dayName}</span>
                      <span className="text-sm font-bold">{d.dayNumber}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Selecciona nuevo horario
                </label>
                <div className="grid grid-cols-3 gap-2 max-h-44 overflow-y-auto pr-1">
                  {availableRescheduleSlots
                    .filter((s) => s.available)
                    .map((s) => (
                      <button
                        key={s.startTime}
                        onClick={() => setSelectedSlot(s)}
                        className={`p-2 rounded-xl border text-xs text-center transition-all ${
                          selectedSlot?.startTime === s.startTime
                            ? 'bg-[#D4AF37] text-slate-950 font-bold border-[#D4AF37]'
                            : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                        }`}
                      >
                        {formatTime12h(s.startTime)}
                      </button>
                    ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setMode('view')}
                  disabled={isProcessing}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
                >
                  Atrás
                </button>
                <button
                  onClick={handleRescheduleSubmit}
                  disabled={!selectedSlot || isProcessing}
                  className="flex-1 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#E5B869] text-slate-950 text-xs font-bold shadow-lg shadow-[#D4AF37]/20 transition-all disabled:opacity-50"
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
