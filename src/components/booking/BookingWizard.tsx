import React, { useState, useEffect, useMemo } from 'react';
import {
  Scissors,
  User,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  ArrowRight,
  CalendarPlus,
  ShieldCheck,
  Star,
  Users,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { useBarbershop } from '../../contexts/BarbershopContext';
import { useAuth } from '../../contexts/AuthContext';
import { Barber, Service, AvailableTimeSlot, AlternativeBarberSuggestion, Appointment } from '../../types';
import {
  getAvailableSlots,
  findAlternativeBarbers,
} from '../../services/availabilityEngine';
import {
  formatCurrency,
  formatDateSpanish,
  formatTime12h,
  getTodayDateString,
  getUpcomingDays,
  addMinutesToTime,
} from '../../utils/dateTime';

interface BookingWizardProps {
  initialServiceId?: string;
  initialBarberId?: string;
  onBookingComplete?: (appointment: Appointment) => void;
  onCancel?: () => void;
}

export const BookingWizard: React.FC<BookingWizardProps> = ({
  initialServiceId,
  initialBarberId,
  onBookingComplete,
  onCancel,
}) => {
  const {
    services,
    barbers,
    appointments,
    schedules,
    blockedSlots,
    businessSettings,
    bookAppointment,
  } = useBarbershop();
  const { userProfile } = useAuth();

  // Wizard Steps: 1: Service, 2: Barber, 3: Date, 4: Time, 5: Confirm, 6: Success
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Selections
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    initialServiceId || services[0]?.id || ''
  );
  const [selectedBarberId, setSelectedBarberId] = useState<string>(
    initialBarberId || 'any'
  );
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<AvailableTimeSlot | null>(null);
  const [selectedUnavailableTime, setSelectedUnavailableTime] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string>(userProfile?.name || '');
  const [clientPhone, setClientPhone] = useState<string>(userProfile?.phone || '');
  const [clientEmail, setClientEmail] = useState<string>(userProfile?.email || '');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);

  const upcomingDays = useMemo(() => getUpcomingDays(14), []);

  const activeServices = useMemo(() => services.filter((s) => s.active), [services]);
  const activeBarbers = useMemo(() => barbers.filter((b) => b.active), [barbers]);

  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedServiceId) || services[0],
    [services, selectedServiceId]
  );

  // Set default service if empty
  useEffect(() => {
    if (!selectedServiceId && activeServices.length > 0) {
      setSelectedServiceId(activeServices[0].id);
    }
  }, [activeServices, selectedServiceId]);

  // Update profile details when available
  useEffect(() => {
    if (userProfile) {
      if (!clientName) setClientName(userProfile.name || '');
      if (!clientPhone && userProfile.phone) setClientPhone(userProfile.phone);
      if (!clientEmail && userProfile.email) setClientEmail(userProfile.email);
    }
  }, [userProfile]);

  // Determine which barber to query slots for (if 'any', we evaluate the best available barber)
  const effectiveBarberId = useMemo(() => {
    if (selectedBarberId !== 'any') return selectedBarberId;
    // Find first active barber that provides this service
    const match = activeBarbers.find(
      (b) => b.serviceIds.length === 0 || b.serviceIds.includes(selectedServiceId)
    );
    return match?.id || activeBarbers[0]?.id || '';
  }, [selectedBarberId, activeBarbers, selectedServiceId]);

  const selectedBarber = useMemo(
    () => barbers.find((b) => b.id === effectiveBarberId),
    [barbers, effectiveBarberId]
  );

  // Calculate Available Slots in Real-Time
  const timeSlots = useMemo(() => {
    if (!effectiveBarberId || !selectedService || !selectedDate) return [];

    return getAvailableSlots({
      barberId: effectiveBarberId,
      serviceDurationMinutes: selectedService.durationMinutes,
      date: selectedDate,
      barberSchedule: schedules[effectiveBarberId],
      appointments,
      blockedSlots,
      settings: businessSettings,
    });
  }, [effectiveBarberId, selectedService, selectedDate, schedules, appointments, blockedSlots, businessSettings]);

  const availableSlotsCount = useMemo(
    () => timeSlots.filter((s) => s.available).length,
    [timeSlots]
  );

  // Calculate Alternative Barbers Suggestions if selected barber has no availability or user clicked an occupied time
  const alternativeSuggestions = useMemo(() => {
    if (!selectedService || !selectedDate || !effectiveBarberId) return [];

    const desiredTime = selectedUnavailableTime || selectedTimeSlot?.startTime || '12:00';

    return findAlternativeBarbers({
      serviceId: selectedService.id,
      serviceDurationMinutes: selectedService.durationMinutes,
      date: selectedDate,
      desiredTime,
      preferredBarberId: effectiveBarberId,
      allBarbers: activeBarbers,
      favoriteBarberIds: userProfile?.favoriteBarberIds || [],
      allAppointments: appointments,
      allSchedules: schedules,
      allBlockedSlots: blockedSlots,
      settings: businessSettings,
    });
  }, [selectedService, selectedDate, effectiveBarberId, selectedUnavailableTime, selectedTimeSlot, activeBarbers, userProfile, appointments, schedules, blockedSlots, businessSettings]);

  // Trigger celebration confetti on success
  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#D4AF37', '#E5B869', '#FFFFFF', '#996515'],
      });
    } catch {
      // ignore
    }
  };

  // Handle final submission with concurrency validation
  const handleConfirmBooking = async () => {
    if (!selectedService || !selectedBarber || !selectedTimeSlot) return;
    if (!clientName.trim()) {
      setBookingError('Por favor ingresa tu nombre para la reserva.');
      return;
    }

    setIsSubmitting(true);
    setBookingError(null);

    try {
      const newAppointment = await bookAppointment({
        clientId: userProfile?.id || `guest_${Date.now()}`,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientEmail: clientEmail.trim(),
        barberId: selectedBarber.id,
        barberName: selectedBarber.displayName,
        barberPhoto: selectedBarber.photoUrl,
        serviceId: selectedService.id,
        serviceNameSnapshot: selectedService.name,
        servicePriceSnapshot: selectedService.price,
        serviceDurationSnapshot: selectedService.durationMinutes,
        date: selectedDate,
        startTime: selectedTimeSlot.startTime,
        endTime: selectedTimeSlot.endTime,
        status: 'confirmed',
        notes: notes.trim(),
        cancelledAt: null,
        cancelledBy: null,
        cancelReason: null,
      });

      setConfirmedAppointment(newAppointment);
      setCurrentStep(6); // Success screen
      triggerConfetti();
      onBookingComplete?.(newAppointment);
    } catch (err: any) {
      console.error('Booking failed:', err);
      setBookingError(
        err.message || 'El horario seleccionado ya no está disponible. Por favor elige otro horario o barbero.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export .ICS calendar file
  const downloadIcsFile = () => {
    if (!confirmedAppointment) return;
    const [year, month, day] = confirmedAppointment.date.split('-').map(Number);
    const [sh, sm] = confirmedAppointment.startTime.split(':').map(Number);
    const [eh, em] = confirmedAppointment.endTime.split(':').map(Number);

    const pad = (n: number) => n.toString().padStart(2, '0');
    const startStr = `${year}${pad(month)}${pad(day)}T${pad(sh)}${pad(sm)}00`;
    const endStr = `${year}${pad(month)}${pad(day)}T${pad(eh)}${pad(em)}00`;

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Monarca Barber//Appointment Booking//ES',
      'BEGIN:VEVENT',
      `UID:monarca_${confirmedAppointment.id}`,
      `DTSTAMP:${startStr}Z`,
      `DTSTART:${startStr}`,
      `DTEND:${endStr}`,
      `SUMMARY:Cita en MONARCA BARBER: ${confirmedAppointment.serviceNameSnapshot}`,
      `DESCRIPTION:Cita con ${confirmedAppointment.barberName} en Monarca Barber.\\nServicio: ${confirmedAppointment.serviceNameSnapshot}\\nPrecio: $${confirmedAppointment.servicePriceSnapshot} MXN.`,
      `LOCATION:${businessSettings.address}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `Cita_MonarcaBarber_${confirmedAppointment.date}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-xl mx-auto pb-24">
      {/* Step Progress Header (1 to 5) */}
      {currentStep < 6 && (
        <div className="mb-6 px-1">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            <span>Paso {currentStep} de 5</span>
            <span className="text-[#D4AF37]">
              {currentStep === 1 && '1. Servicio'}
              {currentStep === 2 && '2. Barbero'}
              {currentStep === 3 && '3. Fecha'}
              {currentStep === 4 && '4. Horario'}
              {currentStep === 5 && '5. Confirmar'}
            </span>
          </div>

          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden flex">
            <motion.div
              className="h-full bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] rounded-full"
              initial={{ width: '20%' }}
              animate={{ width: `${(currentStep / 5) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* STEP 1: SELECT SERVICE */}
      {currentStep === 1 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Elige tu Servicio</h2>
              <p className="text-xs text-slate-400">Selecciona el tratamiento o corte para tu cita</p>
            </div>
            <div className="p-2 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]">
              <Scissors className="w-5 h-5" />
            </div>
          </div>

          <div className="grid gap-3 pt-2">
            {activeServices.map((service) => {
              const isSelected = selectedServiceId === service.id;
              return (
                <div
                  key={service.id}
                  onClick={() => setSelectedServiceId(service.id)}
                  className={`group relative overflow-hidden rounded-2xl p-3.5 sm:p-4 transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-[#181D26] border-[#D4AF37] shadow-lg shadow-[#D4AF37]/15 scale-[1.01]'
                      : 'bg-[#12151B]/80 hover:bg-[#161A22] border-white/10'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    {/* Service Image / Photo */}
                    {service.imageUrl ? (
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-900 border border-white/10 shrink-0">
                        <img
                          src={service.imageUrl}
                          alt={service.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-800/80 border border-white/10 flex items-center justify-center text-[#D4AF37] shrink-0">
                        <Scissors className="w-6 h-6" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-bold text-white text-sm sm:text-base tracking-tight truncate">
                          {service.name}
                        </h3>
                        {service.isPopular && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-[#D4AF37] border border-[#D4AF37]/30">
                            VIP
                          </span>
                        )}
                        {service.barberId && (
                          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                            Exclusivo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-2.5">
                        {service.description}
                      </p>
                      <div className="flex items-center gap-3 text-xs font-semibold text-slate-300">
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                          {service.durationMinutes} min
                        </span>
                        <span className="text-white font-bold text-xs sm:text-sm bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                          {formatCurrency(service.price)}
                        </span>
                      </div>
                    </div>

                    {/* Radio Indicator */}
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all mt-1 shrink-0 ${
                        isSelected
                          ? 'bg-[#D4AF37] border-[#D4AF37] text-slate-950'
                          : 'border-white/20 group-hover:border-white/40'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={() => setCurrentStep(2)}
              disabled={!selectedServiceId}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 font-bold text-sm shadow-xl shadow-[#D4AF37]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            >
              <span>Continuar con Barbero</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 2: SELECT BARBER */}
      {currentStep === 2 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Selecciona tu Barbero</h2>
              <p className="text-xs text-slate-400">
                Elige a tu profesional favorito o selecciona el primer barbero disponible
              </p>
            </div>
            <div className="p-2 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]">
              <User className="w-5 h-5" />
            </div>
          </div>

          {/* Any Available Barber Option */}
          <div
            onClick={() => setSelectedBarberId('any')}
            className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
              selectedBarberId === 'any'
                ? 'bg-[#181D26] border-[#D4AF37] shadow-lg shadow-[#D4AF37]/10 scale-[1.01]'
                : 'bg-[#12151B]/80 hover:bg-[#161A22] border-white/10'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4AF37]/30 to-[#996515]/20 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Cualquier Barbero Disponible</h3>
                <p className="text-xs text-slate-400">Te asignaremos el barbero con mayor disponibilidad rápida</p>
              </div>
            </div>
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                selectedBarberId === 'any'
                  ? 'bg-[#D4AF37] border-[#D4AF37] text-slate-950'
                  : 'border-white/20'
              }`}
            >
              {selectedBarberId === 'any' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
          </div>

          {/* Specific Barbers List */}
          <div className="grid gap-3 pt-1">
            {activeBarbers.map((barber) => {
              const isSelected = selectedBarberId === barber.id;
              const isFavorite = userProfile?.favoriteBarberIds?.includes(barber.id);

              return (
                <div
                  key={barber.id}
                  onClick={() => setSelectedBarberId(barber.id)}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#181D26] border-[#D4AF37] shadow-lg shadow-[#D4AF37]/10 scale-[1.01]'
                      : 'bg-[#12151B]/80 hover:bg-[#161A22] border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <img
                      src={barber.photoUrl}
                      alt={barber.displayName}
                      className="w-13 h-13 rounded-2xl object-cover border border-white/15"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-white text-sm tracking-tight">
                          {barber.displayName}
                        </h3>
                        {isFavorite && (
                          <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded-full border border-rose-500/30">
                            ★ Favorito
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#D4AF37] font-medium truncate max-w-[200px]">
                        {barber.specialties.slice(0, 2).join(' • ')}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                        <span className="flex items-center gap-0.5 text-amber-400 font-semibold">
                          <Star className="w-3 h-3 fill-amber-400" />
                          {barber.rating.toFixed(1)}
                        </span>
                        <span>• {barber.experienceYears || 5} años exp.</span>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                      isSelected
                        ? 'bg-[#D4AF37] border-[#D4AF37] text-slate-950'
                        : 'border-white/20'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 flex items-center justify-between gap-3">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Atrás</span>
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 font-bold text-sm shadow-xl shadow-[#D4AF37]/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <span>Continuar con Fecha</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 3: SELECT DATE */}
      {currentStep === 3 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Selecciona la Fecha</h2>
              <p className="text-xs text-slate-400">
                Reserva disponible con hasta {businessSettings.maxBookingAdvanceDays} días de anticipación
              </p>
            </div>
            <div className="p-2 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]">
              <CalendarIcon className="w-5 h-5" />
            </div>
          </div>

          {/* Horizontal Day Selector */}
          <div className="py-2 overflow-x-auto no-scrollbar -mx-2 px-2">
            <div className="flex items-center gap-2.5 min-w-max">
              {upcomingDays.map((day) => {
                const isSelected = selectedDate === day.dateStr;
                return (
                  <button
                    key={day.dateStr}
                    onClick={() => {
                      setSelectedDate(day.dateStr);
                      setSelectedTimeSlot(null);
                      setSelectedUnavailableTime(null);
                    }}
                    className={`flex flex-col items-center justify-center w-18 py-3.5 px-2 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-gradient-to-b from-[#1E232E] to-[#14171E] border-[#D4AF37] text-white shadow-xl shadow-[#D4AF37]/15 scale-105'
                        : 'bg-[#12151B]/80 hover:bg-[#161A22] border-white/10 text-slate-400'
                    }`}
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-wider mb-1">
                      {day.dayName}
                    </span>
                    <span className={`text-xl font-bold ${isSelected ? 'text-[#D4AF37]' : 'text-white'}`}>
                      {day.dayNumber}
                    </span>
                    <span className="text-[10px] mt-0.5 opacity-70">
                      {day.monthName}
                    </span>
                    {day.isToday && (
                      <span className="mt-1 text-[8px] font-bold px-1.5 py-0.2 rounded-full bg-[#D4AF37]/20 text-[#D4AF37]">
                        HOY
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Date Summary Card */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400">Fecha elegida</p>
              <h4 className="font-bold text-white text-base">
                {formatDateSpanish(selectedDate, true)}
              </h4>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-slate-400">Barbero</p>
              <p className="text-xs font-semibold text-[#D4AF37]">
                {selectedBarber?.displayName || 'Cualquiera disponible'}
              </p>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between gap-3">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Atrás</span>
            </button>
            <button
              onClick={() => setCurrentStep(4)}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 font-bold text-sm shadow-xl shadow-[#D4AF37]/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <span>Ver Horarios Disponibles</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 4: SELECT TIME SLOT & ALTERNATIVES */}
      {currentStep === 4 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Horarios Disponibles</h2>
              <p className="text-xs text-slate-400">
                {formatDateSpanish(selectedDate)} con {selectedBarber?.displayName}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {/* Time Slots Grid */}
          {timeSlots.length === 0 || availableSlotsCount === 0 ? (
            <div className="p-6 rounded-3xl bg-[#14171E] border border-white/10 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
              <h3 className="font-bold text-white text-base">Sin disponibilidad con {selectedBarber?.displayName || 'este barbero'}</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                No hay turnos libres para la fecha seleccionada.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>{availableSlotsCount} turnos disponibles</span>
                <span className="text-[#D4AF37]">Duración: {selectedService.durationMinutes} min</span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 pt-1">
                {timeSlots.map((slot) => {
                  const isSelected = selectedTimeSlot?.startTime === slot.startTime;
                  const isTargetedUnavailable = selectedUnavailableTime === slot.startTime;

                  if (!slot.available) {
                    return (
                      <button
                        key={slot.startTime}
                        type="button"
                        onClick={() => {
                          setSelectedUnavailableTime(slot.startTime);
                          setSelectedTimeSlot(null);
                        }}
                        className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                          isTargetedUnavailable
                            ? 'bg-amber-500/15 border-amber-400/70 shadow-lg ring-1 ring-amber-400/40 scale-[1.02]'
                            : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/5 opacity-50 hover:opacity-85'
                        }`}
                        title={slot.conflictReason || 'Turno ocupado. Clic para buscar otros barberos disponibles a esta hora'}
                      >
                        <span className="text-xs font-semibold text-slate-400 line-through block">
                          {formatTime12h(slot.startTime)}
                        </span>
                        <span className={`text-[9px] truncate block mt-0.5 font-medium ${isTargetedUnavailable ? 'text-[#D4AF37]' : 'text-slate-500'}`}>
                          {isTargetedUnavailable ? 'Buscando...' : 'Ocupado'}
                        </span>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={slot.startTime}
                      onClick={() => {
                        setSelectedTimeSlot(slot);
                        setSelectedUnavailableTime(null);
                      }}
                      className={`p-3 rounded-2xl border text-center transition-all focus:outline-none ${
                        isSelected
                          ? 'bg-[#D4AF37] border-[#D4AF37] text-slate-950 font-bold shadow-lg shadow-[#D4AF37]/25 scale-105'
                          : 'bg-[#14171E] hover:bg-[#1B202B] border-white/10 text-slate-200 hover:border-white/25'
                      }`}
                    >
                      <span className="text-xs font-bold block">
                        {formatTime12h(slot.startTime)}
                      </span>
                      <span className={`text-[10px] block mt-0.5 ${isSelected ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
                        hasta {formatTime12h(slot.endTime)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ALTERNATIVE BARBERS - SHOWN ONLY IF SELECTED BARBER HAS ZERO SLOTS OR USER CLICKED AN OCCUPIED SLOT */}
          {(availableSlotsCount === 0 || !!selectedUnavailableTime) && alternativeSuggestions.length > 0 && (
            <div className="mt-6 pt-4 border-t border-white/10 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#D4AF37] shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      {selectedUnavailableTime
                        ? `Barberos disponibles a las ${formatTime12h(selectedUnavailableTime)}`
                        : 'Otros Barberos Disponibles para esta Fecha'}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {selectedUnavailableTime
                        ? `${selectedBarber?.displayName || 'El barbero'} no tiene disponible a esa hora, pero estos profesionales sí:`
                        : `${selectedBarber?.displayName || 'El barbero'} no tiene turnos libres hoy. Puedes agendar con:`}
                    </p>
                  </div>
                </div>
                {selectedUnavailableTime && (
                  <button
                    type="button"
                    onClick={() => setSelectedUnavailableTime(null)}
                    className="text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors shrink-0 ml-2"
                  >
                    Ocultar
                  </button>
                )}
              </div>

              <div className="grid gap-2.5">
                {alternativeSuggestions.slice(0, 3).map((alt) => (
                  <div
                    key={alt.barber.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-[#161B24] to-[#12151B] border border-white/10 hover:border-[#D4AF37]/40 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={alt.barber.photoUrl}
                        alt={alt.barber.displayName}
                        className="w-10 h-10 rounded-xl object-cover border border-white/15"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-xs">{alt.barber.displayName}</span>
                          {alt.isFavorite && (
                            <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded-full">
                              Favorito
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#D4AF37] font-semibold">
                          Disponible a las {formatTime12h(alt.availableSlot.startTime)}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedBarberId(alt.barber.id);
                        setSelectedTimeSlot(alt.availableSlot);
                        setSelectedUnavailableTime(null);
                        setCurrentStep(5);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-[#D4AF37] hover:text-slate-950 text-xs font-bold text-slate-200 transition-all flex items-center gap-1"
                    >
                      <span>Agendar</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 flex items-center justify-between gap-3">
            <button
              onClick={() => setCurrentStep(3)}
              className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Atrás</span>
            </button>
            <button
              onClick={() => setCurrentStep(5)}
              disabled={!selectedTimeSlot}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 font-bold text-sm shadow-xl shadow-[#D4AF37]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            >
              <span>Revisar Cita</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 5: SUMMARY & CONFIRMATION */}
      {currentStep === 5 && selectedTimeSlot && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Confirmar Reserva</h2>
              <p className="text-xs text-slate-400">Verifica los detalles de tu cita antes de agendar</p>
            </div>
            <div className="p-2 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          {bookingError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{bookingError}</span>
            </div>
          )}

          {/* Summary Spatial Card */}
          <div className="rounded-3xl bg-gradient-to-b from-[#1A1E27] to-[#12151B] border border-white/15 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <img
                  src={selectedBarber?.photoUrl}
                  alt={selectedBarber?.displayName}
                  className="w-12 h-12 rounded-2xl object-cover border border-[#D4AF37]/40 shadow-md"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">
                    Barbero Asignado
                  </span>
                  <h3 className="font-bold text-white text-base">{selectedBarber?.displayName}</h3>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-semibold text-slate-400">Total</span>
                <p className="text-lg font-black text-[#D4AF37]">
                  {formatCurrency(selectedService.price)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Servicio</span>
                <span className="font-bold text-white block mt-0.5">{selectedService.name}</span>
                <span className="text-[11px] text-slate-400">{selectedService.durationMinutes} min</span>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Fecha y Hora</span>
                <span className="font-bold text-white block mt-0.5">{formatDateSpanish(selectedDate)}</span>
                <span className="text-[11px] text-[#D4AF37] font-semibold">
                  {formatTime12h(selectedTimeSlot.startTime)} - {formatTime12h(selectedTimeSlot.endTime)}
                </span>
              </div>
            </div>

            {/* Client Inputs */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Tu nombre y apellido"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/15 text-white text-xs focus:outline-none focus:border-[#D4AF37] transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="+52 55 1234 5678"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/15 text-white text-xs focus:outline-none focus:border-[#D4AF37] transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Email para confirmación
                  </label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/15 text-white text-xs focus:outline-none focus:border-[#D4AF37] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Notas o requerimientos especiales (opcional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej. Prefiero barba perfilada baja o corte a tijera"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/15 text-white text-xs focus:outline-none focus:border-[#D4AF37] transition-colors"
                />
              </div>
            </div>

            {/* Cancellation Policy Reminder */}
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 leading-relaxed">
              💡 <span className="font-semibold text-amber-300">Política de Puntualidad:</span> Puedes cancelar o
              reprogramar gratis hasta {businessSettings.minCancelNoticeHours} horas antes del horario fijado.
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between gap-3">
            <button
              onClick={() => setCurrentStep(4)}
              disabled={isSubmitting}
              className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Atrás</span>
            </button>
            <button
              onClick={handleConfirmBooking}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 font-bold text-sm shadow-xl shadow-[#D4AF37]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="animate-pulse">Validando y confirmando cita...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Confirmar Cita Ahora</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 6: SUCCESS CONFIRMATION SCREEN (Section 38) */}
      {currentStep === 6 && confirmedAppointment && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6 pt-4"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#996515] via-[#D4AF37] to-[#F3E5AB] mx-auto p-[2px] shadow-2xl shadow-[#D4AF37]/30">
            <div className="w-full h-full bg-[#12151B] rounded-full flex items-center justify-center text-[#D4AF37]">
              <CheckCircle2 className="w-10 h-10 text-[#D4AF37]" />
            </div>
          </div>

          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-[#D4AF37]">
              MONARCA BARBER
            </span>
            <h2 className="text-2xl font-black text-white tracking-tight mt-1">
              ¡Cita Confirmada!
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Te esperamos en nuestra sucursal. Hemos reservado tu lugar con exclusividad.
            </p>
          </div>

          {/* Ticket Card */}
          <div className="rounded-3xl bg-[#161A22] border border-white/15 p-5 text-left shadow-2xl space-y-4 max-w-md mx-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Servicio</span>
                <h4 className="font-bold text-white text-base">{confirmedAppointment.serviceNameSnapshot}</h4>
              </div>
              <span className="text-sm font-black text-[#D4AF37]">
                {formatCurrency(confirmedAppointment.servicePriceSnapshot)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Barbero</span>
                <span className="font-semibold text-white">{confirmedAppointment.barberName}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Fecha</span>
                <span className="font-semibold text-white">{formatDateSpanish(confirmedAppointment.date)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Hora</span>
                <span className="font-bold text-[#D4AF37]">
                  {formatTime12h(confirmedAppointment.startTime)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Duración</span>
                <span className="font-semibold text-white">
                  {confirmedAppointment.serviceDurationSnapshot} minutos
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Folio: <strong className="text-slate-200">{confirmedAppointment.id.substring(0, 12)}</strong></span>
              <span className="text-emerald-400 font-semibold">● Confirmada en sistema</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 max-w-md mx-auto">
            <button
              onClick={downloadIcsFile}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/15 transition-all"
            >
              <CalendarPlus className="w-4 h-4 text-[#D4AF37]" />
              <span>Agregar al Calendario</span>
            </button>

            <button
              onClick={() => onBookingComplete?.(confirmedAppointment)}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 text-xs font-bold shadow-lg shadow-[#D4AF37]/20 hover:scale-[1.02] transition-all"
            >
              <span>Ver Mis Citas</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
