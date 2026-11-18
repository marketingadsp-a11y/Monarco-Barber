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
  KeyRound,
  Eye,
  EyeOff,
  Lock,
  UserPlus,
  Award,
  Search,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { useBarbershop } from '../../contexts/BarbershopContext';
import { useAuth } from '../../contexts/AuthContext';
import { Barber, Service, AvailableTimeSlot, AlternativeBarberSuggestion, Appointment } from '../../types';
import {
  getAvailableSlots,
  findAlternativeBarbers,
  isShopOpenOnDate,
} from '../../services/availabilityEngine';
import {
  formatCurrency,
  formatDateSpanish,
  formatTime12h,
  getTodayDateString,
  getUpcomingDays,
  addMinutesToTime,
} from '../../utils/dateTime';
import { getOrCreateGuestClientId, addGuestAppointmentId } from '../../utils/guestSession';

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
    availabilityAppointments,
    schedules,
    blockedSlots,
    businessSettings,
    bookAppointment,
  } = useBarbershop();
  const {
    userProfile,
    registerWithCard,
    loginWithPhoneOrClientNumber,
    findUser,
  } = useAuth();

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
  const [clientPin, setClientPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [wantToRegister, setWantToRegister] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);

  // Filter state for Step 1 Services
  const [serviceSearchQuery, setServiceSearchQuery] = useState<string>('');
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState<string>('all');

  const upcomingDays = useMemo(() => {
    const daysCount = Math.min(60, Math.max(7, businessSettings?.maxBookingAdvanceDays || 14));
    return getUpcomingDays(daysCount);
  }, [businessSettings?.maxBookingAdvanceDays]);

  // Auto-select first open day if current selectedDate falls on a closed day
  useEffect(() => {
    if (!isShopOpenOnDate(selectedDate, businessSettings)) {
      const firstOpen = upcomingDays.find((d) => isShopOpenOnDate(d.dateStr, businessSettings));
      if (firstOpen) {
        setSelectedDate(firstOpen.dateStr);
        setSelectedTimeSlot(null);
        setSelectedUnavailableTime(null);
      }
    }
  }, [businessSettings, upcomingDays, selectedDate]);

  // Reset selected slot when service or barber changes so duration-adapted slots re-validate cleanly
  useEffect(() => {
    setSelectedTimeSlot(null);
    setSelectedUnavailableTime(null);
  }, [selectedServiceId, selectedBarberId]);

  const activeServices = useMemo(() => services.filter((s) => s.active), [services]);
  const activeBarbers = useMemo(() => barbers.filter((b) => b.active), [barbers]);

  // Dynamic Service Categories for Quick Filters
  const serviceCategories = useMemo(() => {
    const cats = new Set<string>();
    activeServices.forEach((s) => {
      if (s.categoryId) cats.add(s.categoryId);
    });
    return ['all', ...Array.from(cats)];
  }, [activeServices]);

  // Filtered Services for High Density Display
  const filteredServices = useMemo(() => {
    return activeServices.filter((s) => {
      const matchCat = serviceCategoryFilter === 'all' || s.categoryId === serviceCategoryFilter;
      const matchQuery =
        !serviceSearchQuery.trim() ||
        s.name.toLowerCase().includes(serviceSearchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(serviceSearchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [activeServices, serviceCategoryFilter, serviceSearchQuery]);

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
      appointments: availabilityAppointments,
      blockedSlots,
      settings: businessSettings,
    });
  }, [effectiveBarberId, selectedService, selectedDate, schedules, availabilityAppointments, blockedSlots, businessSettings]);

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
      allAppointments: availabilityAppointments,
      allSchedules: schedules,
      allBlockedSlots: blockedSlots,
      settings: businessSettings,
    });
  }, [selectedService, selectedDate, effectiveBarberId, selectedUnavailableTime, selectedTimeSlot, activeBarbers, userProfile, availabilityAppointments, schedules, blockedSlots, businessSettings]);

  // Trigger celebration confetti on success
  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#9A6B3B', '#C69765', '#161514', '#FAF9F6'],
      });
    } catch {
      // ignore
    }
  };

  // Handle final submission with concurrency validation & automatic customer account creation / login
  const handleConfirmBooking = async () => {
    if (!selectedService || !selectedBarber || !selectedTimeSlot) return;

    setIsSubmitting(true);
    setBookingError(null);

    let activeClientId = userProfile?.id;
    let activeClientName = userProfile?.name || clientName.trim();
    let activeClientPhone = userProfile?.phone || clientPhone.trim();

    // Si el cliente aún no ha iniciado sesión:
    // - Siempre validar Nombre Completo y Celular
    // - Solo pedir contraseña/NIP y crear o iniciar cuenta si marcó "¿Quieres registrarte?"
    let isGuestBooking = false;

    if (!userProfile) {
      const cleanName = clientName.trim();
      const rawDigits = clientPhone.replace(/\D/g, '');
      const tenDigits = rawDigits.startsWith('52') && rawDigits.length === 12
        ? rawDigits.substring(2)
        : rawDigits;
      const cleanPin = clientPin.trim();

      if (!cleanName || cleanName.length < 2) {
        setBookingError('Por favor ingresa tu nombre completo.');
        setIsSubmitting(false);
        return;
      }
      if (tenDigits.length !== 10) {
        setBookingError('Por favor ingresa un número celular válido de 10 dígitos numéricos.');
        setIsSubmitting(false);
        return;
      }

      if (wantToRegister) {
        if (cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
          setBookingError('Por favor ingresa una contraseña (NIP) de exactamente 4 dígitos numéricos.');
          setIsSubmitting(false);
          return;
        }

        try {
          const existing = await findUser(tenDigits);
          let authenticatedUser;

          if (existing) {
            authenticatedUser = await loginWithPhoneOrClientNumber(tenDigits, cleanPin);
          } else {
            authenticatedUser = await registerWithCard({
              name: cleanName,
              phone: tenDigits,
              pin: cleanPin,
            });
          }

          activeClientId = authenticatedUser.id;
          activeClientName = authenticatedUser.name;
          activeClientPhone = authenticatedUser.phone;
        } catch (authErr: any) {
          console.error('Auth error during booking:', authErr);
          setBookingError(
            authErr.message || 'No se pudo crear o validar tu cuenta con esta contraseña. Verifica tus datos.'
          );
          setIsSubmitting(false);
          return;
        }
      } else {
        isGuestBooking = true;
        activeClientId = getOrCreateGuestClientId();
        activeClientName = cleanName;
        activeClientPhone = `+52 ${tenDigits.substring(0, 2)} ${tenDigits.substring(2, 6)} ${tenDigits.substring(6)}`;
      }
    }

    try {
      const newAppointment = await bookAppointment({
        clientId: activeClientId || getOrCreateGuestClientId(),
        clientName: activeClientName,
        clientPhone: activeClientPhone,
        clientEmail: clientEmail.trim() || undefined,
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

      if (isGuestBooking) {
        addGuestAppointmentId(newAppointment.id);
      }

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
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#5C5852] mb-2 tabular-nums">
            <span>Paso {currentStep} de 5</span>
            <span className="text-[#9A6B3B]">
              {currentStep === 1 && '1. Servicio'}
              {currentStep === 2 && '2. Barbero'}
              {currentStep === 3 && '3. Fecha'}
              {currentStep === 4 && '4. Horario'}
              {currentStep === 5 && '5. Confirmar'}
            </span>
          </div>

          <div className="w-full h-1.5 bg-[#E6E1D6] rounded-full overflow-hidden flex">
            <motion.div
              className="h-full bg-gradient-to-r from-[#161514] to-[#9A6B3B] rounded-full"
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
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          className="space-y-4"
        >
          <div className="flex items-end justify-between border-b border-[#E6E1D6] pb-3">
            <div>
              <h2 className="font-display text-3xl font-bold text-[#161514] tracking-wide uppercase">
                Elige tu Servicio
              </h2>
              <p className="text-xs text-[#5C5852] mt-0.5">
                Selecciona el tratamiento o corte para tu cita
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#F2EFE9] border border-[#E6E1D6] text-[#9A6B3B]">
              <Scissors className="w-5 h-5" />
            </div>
          </div>

          {activeServices.length > 4 && (
            <div className="space-y-2.5 pt-1">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#5C5852] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={serviceSearchQuery}
                  onChange={(e) => setServiceSearchQuery(e.target.value)}
                  placeholder="Buscar servicio por nombre..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#E6E1D6] text-[#161514] text-xs placeholder:text-[#5C5852]/70 focus:outline-none focus:border-[#9A6B3B]"
                />
              </div>

              {serviceCategories.length > 2 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  {serviceCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setServiceCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all ${
                        serviceCategoryFilter === cat
                          ? 'bg-[#161514] text-[#FAF9F6]'
                          : 'bg-[#F2EFE9] text-[#5C5852] hover:text-[#161514] hover:bg-[#E6E1D6]'
                      }`}
                    >
                      {cat === 'all' ? 'Todos los Servicios' : cat}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {filteredServices.map((service) => {
              const isSelected = selectedServiceId === service.id;
              return (
                <div
                  key={service.id}
                  onClick={() => setSelectedServiceId(service.id)}
                  className={`group relative overflow-hidden rounded-2xl p-3 transition-all cursor-pointer border flex items-center justify-between gap-2.5 ${
                    isSelected
                      ? 'bg-[#F7F5F0] border-[#161514] ring-1 ring-[#161514]'
                      : 'bg-white hover:bg-[#FAF9F6] border-[#E6E1D6] hover:border-[#9A6B3B]/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {service.imageUrl ? (
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#F2EFE9] border border-[#E6E1D6] shrink-0">
                        <img
                          src={service.imageUrl}
                          alt={service.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-[#F2EFE9] border border-[#E6E1D6] flex items-center justify-center text-[#9A6B3B] shrink-0">
                        <Scissors className="w-5 h-5" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <h3 className="font-display text-base font-bold text-[#161514] uppercase tracking-wide truncate">
                          {service.name}
                        </h3>
                        {service.isPopular && (
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[#9A6B3B] shrink-0">
                            · VIP
                          </span>
                        )}
                        {service.barberId && (
                          <span className="text-[10px] font-semibold text-sky-800 shrink-0">
                            · Exclusivo
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-[#5C5852] truncate leading-tight mb-1">
                        {service.description || 'Tratamiento profesional exclusivo'}
                      </p>

                      <div className="flex items-center gap-2 text-[11px] tabular-nums">
                        <span className="font-mono text-[#161514] font-bold text-xs">
                          {formatCurrency(service.price)}
                        </span>
                        <span className="text-[#D2CBBF]">·</span>
                        <span className="flex items-center gap-1 text-[#5C5852]">
                          <Clock className="w-3 h-3 text-[#9A6B3B]" />
                          {service.durationMinutes} min
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all shrink-0 ${
                      isSelected
                        ? 'bg-[#161514] border-[#161514] text-[#FAF9F6]'
                        : 'border-[#D2CBBF] group-hover:border-[#9A6B3B]'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredServices.length === 0 && (
            <div className="p-6 rounded-2xl bg-white border border-[#E6E1D6] text-center text-[#5C5852] text-xs">
              No se encontraron servicios que coincidan con la búsqueda.
            </div>
          )}

          <div className="pt-3 flex justify-end">
            <button
              onClick={() => setCurrentStep(2)}
              disabled={!selectedServiceId}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] font-semibold text-sm active:scale-[0.99] transition-all disabled:opacity-50"
            >
              <span>Continuar con Barbero</span>
              <ChevronRight className="w-4 h-4 text-[#C69765]" />
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 2: SELECT BARBER */}
      {currentStep === 2 && (
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          className="space-y-4"
        >
          <div className="flex items-end justify-between border-b border-[#E6E1D6] pb-3">
            <div>
              <h2 className="font-display text-3xl font-bold text-[#161514] tracking-wide uppercase">
                Selecciona tu Barbero
              </h2>
              <p className="text-xs text-[#5C5852] mt-0.5">
                Elige a tu profesional favorito o selecciona el primer barbero disponible
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#F2EFE9] border border-[#E6E1D6] text-[#9A6B3B]">
              <User className="w-5 h-5" />
            </div>
          </div>

          <div
            onClick={() => setSelectedBarberId('any')}
            className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
              selectedBarberId === 'any'
                ? 'bg-[#F7F5F0] border-[#161514] ring-1 ring-[#161514]'
                : 'bg-white hover:bg-[#FAF9F6] border-[#E6E1D6]'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-[#F2EFE9] border border-[#9A6B3B]/40 flex items-center justify-center text-[#9A6B3B]">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-[#161514] uppercase tracking-wide">
                  Cualquier Barbero Disponible
                </h3>
                <p className="text-xs text-[#5C5852]">
                  Te asignaremos el barbero con mayor disponibilidad rápida
                </p>
              </div>
            </div>
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                selectedBarberId === 'any'
                  ? 'bg-[#161514] border-[#161514] text-[#FAF9F6]'
                  : 'border-[#D2CBBF]'
              }`}
            >
              {selectedBarberId === 'any' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
          </div>

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
                      ? 'bg-[#F7F5F0] border-[#161514] ring-1 ring-[#161514]'
                      : 'bg-white hover:bg-[#FAF9F6] border-[#E6E1D6]'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <img
                      src={barber.photoUrl}
                      alt={barber.displayName}
                      className="w-13 h-13 rounded-xl object-cover border border-[#E6E1D6]"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-display text-lg font-bold text-[#161514] uppercase tracking-wide">
                          {barber.displayName}
                        </h3>
                        {isFavorite && (
                          <span className="text-[10px] font-semibold text-rose-700">
                            · ★ Favorito
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#9A6B3B] font-semibold truncate max-w-[200px]">
                        {barber.specialties.slice(0, 2).join(' · ')}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-[#5C5852] tabular-nums">
                        <span className="flex items-center gap-0.5 text-[#161514] font-semibold">
                          <Star className="w-3 h-3 text-[#9A6B3B] fill-[#9A6B3B]" />
                          {barber.rating.toFixed(1)}
                        </span>
                        <span>· {barber.experienceYears || 5} años exp.</span>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                      isSelected
                        ? 'bg-[#161514] border-[#161514] text-[#FAF9F6]'
                        : 'border-[#D2CBBF]'
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
              className="px-4 py-3 rounded-xl bg-[#F2EFE9] hover:bg-[#E6E1D6] text-[#161514] text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Atrás</span>
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] font-semibold text-sm active:scale-[0.99] transition-all"
            >
              <span>Continuar con Fecha</span>
              <ChevronRight className="w-4 h-4 text-[#C69765]" />
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 3: SELECT DATE */}
      {currentStep === 3 && (
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          className="space-y-4"
        >
          <div className="flex items-end justify-between border-b border-[#E6E1D6] pb-3">
            <div>
              <h2 className="font-display text-3xl font-bold text-[#161514] tracking-wide uppercase">
                Selecciona la Fecha
              </h2>
              <p className="text-xs text-[#5C5852] mt-0.5 tabular-nums">
                Reserva disponible con hasta {businessSettings.maxBookingAdvanceDays} días de anticipación
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#F2EFE9] border border-[#E6E1D6] text-[#9A6B3B]">
              <CalendarIcon className="w-5 h-5" />
            </div>
          </div>

          <div className="py-2 overflow-x-auto no-scrollbar -mx-2 px-2">
            <div className="flex items-center gap-2.5 min-w-max">
              {upcomingDays.map((day) => {
                const isSelected = selectedDate === day.dateStr;
                const isOpen = isShopOpenOnDate(day.dateStr, businessSettings);
                return (
                  <button
                    key={day.dateStr}
                    type="button"
                    disabled={!isOpen}
                    onClick={() => {
                      if (!isOpen) return;
                      setSelectedDate(day.dateStr);
                      setSelectedTimeSlot(null);
                      setSelectedUnavailableTime(null);
                    }}
                    className={`flex flex-col items-center justify-center w-18 py-3.5 px-2 rounded-2xl border transition-all tabular-nums ${
                      !isOpen
                        ? 'bg-[#F2EFE9]/70 border-[#E6E1D6] text-[#9E978D] opacity-55 cursor-not-allowed'
                        : isSelected
                        ? 'bg-[#161514] border-[#161514] text-[#FAF9F6] shadow-md scale-[1.03]'
                        : 'bg-white hover:bg-[#F7F5F0] border-[#E6E1D6] text-[#5C5852]'
                    }`}
                    title={!isOpen ? 'Barbería cerrada este día' : undefined}
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-wider mb-1">
                      {day.dayName}
                    </span>
                    <span className={`font-display text-2xl font-bold ${isSelected && isOpen ? 'text-[#C69765]' : 'text-[#161514]'}`}>
                      {day.dayNumber}
                    </span>
                    <span className="text-[10px] mt-0.5 opacity-80">
                      {day.monthName}
                    </span>
                    {!isOpen ? (
                      <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-rose-700">
                        Cerrado
                      </span>
                    ) : (
                      day.isToday && (
                        <span className={`mt-1 text-[9px] font-bold uppercase tracking-wider ${isSelected ? 'text-[#C69765]' : 'text-[#9A6B3B]'}`}>
                          HOY
                        </span>
                      )
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#E6E1D6] flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#5C5852]">Fecha elegida</p>
              <h4 className="font-display text-xl font-bold text-[#161514] uppercase tracking-wide">
                {formatDateSpanish(selectedDate, true)}
              </h4>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-[#5C5852]">Barbero</p>
              <p className="text-xs font-bold text-[#9A6B3B]">
                {selectedBarber?.displayName || 'Cualquiera disponible'}
              </p>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between gap-3">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-3 rounded-xl bg-[#F2EFE9] hover:bg-[#E6E1D6] text-[#161514] text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Atrás</span>
            </button>
            <button
              onClick={() => setCurrentStep(4)}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] font-semibold text-sm active:scale-[0.99] transition-all"
            >
              <span>Ver Horarios Disponibles</span>
              <ChevronRight className="w-4 h-4 text-[#C69765]" />
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 4: SELECT TIME SLOT & ALTERNATIVES */}
      {currentStep === 4 && (
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          className="space-y-4"
        >
          <div className="flex items-end justify-between border-b border-[#E6E1D6] pb-3">
            <div>
              <h2 className="font-display text-3xl font-bold text-[#161514] tracking-wide uppercase">
                Horarios Disponibles
              </h2>
              <p className="text-xs text-[#5C5852] mt-0.5">
                {formatDateSpanish(selectedDate)} · {selectedBarber?.displayName}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#F2EFE9] border border-[#E6E1D6] text-[#9A6B3B]">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {!isShopOpenOnDate(selectedDate, businessSettings) ? (
            <div className="p-6 rounded-2xl bg-white border border-[#E6E1D6] text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-[#9A6B3B] mx-auto" />
              <h3 className="font-display text-xl font-bold text-[#161514] uppercase tracking-wide">
                Barbería cerrada este día
              </h3>
              <p className="text-xs text-[#5C5852] max-w-xs mx-auto">
                De acuerdo con nuestro horario de atención, no laboramos en la fecha seleccionada. Regresa al paso anterior para elegir otro día.
              </p>
            </div>
          ) : timeSlots.length === 0 || availableSlotsCount === 0 ? (
            <div className="p-6 rounded-2xl bg-white border border-[#E6E1D6] text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-[#9A6B3B] mx-auto" />
              <h3 className="font-display text-xl font-bold text-[#161514] uppercase tracking-wide">
                Sin disponibilidad con {selectedBarber?.displayName || 'este barbero'}
              </h3>
              <p className="text-xs text-[#5C5852] max-w-xs mx-auto">
                No hay turnos libres para la fecha seleccionada.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[#5C5852] px-1 tabular-nums">
                <span>{availableSlotsCount} turnos disponibles</span>
                <span className="font-semibold text-[#9A6B3B]">
                  Duración: {selectedService.durationMinutes} min
                </span>
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
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer tabular-nums ${
                          isTargetedUnavailable
                            ? 'bg-amber-50 border-[#9A6B3B] ring-1 ring-[#9A6B3B] scale-[1.02]'
                            : 'bg-[#F2EFE9]/60 hover:bg-[#F2EFE9] border-[#E6E1D6] opacity-65 hover:opacity-100'
                        }`}
                        title={slot.conflictReason || 'Turno ocupado. Clic para buscar otros barberos disponibles a esta hora'}
                      >
                        <span className="font-mono text-xs font-semibold text-[#5C5852] line-through block">
                          {formatTime12h(slot.startTime)}
                        </span>
                        <span className={`text-[10px] truncate block mt-0.5 font-medium ${isTargetedUnavailable ? 'text-[#9A6B3B]' : 'text-[#5C5852]'}`}>
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
                      className={`p-3 rounded-xl border text-center transition-all focus:outline-none tabular-nums ${
                        isSelected
                          ? 'bg-[#161514] border-[#161514] text-[#FAF9F6] font-bold shadow-md scale-[1.02]'
                          : 'bg-white hover:bg-[#F7F5F0] border-[#E6E1D6] text-[#161514] hover:border-[#9A6B3B]'
                      }`}
                    >
                      <span className="font-mono text-xs font-bold block">
                        {formatTime12h(slot.startTime)}
                      </span>
                      <span className={`text-[10px] block mt-0.5 ${isSelected ? 'text-[#C69765] font-medium' : 'text-[#5C5852]'}`}>
                        hasta {formatTime12h(slot.endTime)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {(availableSlotsCount === 0 || !!selectedUnavailableTime) && alternativeSuggestions.length > 0 && (
            <div className="mt-6 pt-4 border-t border-[#E6E1D6] space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#9A6B3B] shrink-0" />
                  <div>
                    <h4 className="font-display text-base font-bold uppercase tracking-wide text-[#161514]">
                      {selectedUnavailableTime
                        ? `Barberos disponibles a las ${formatTime12h(selectedUnavailableTime)}`
                        : 'Otros Barberos Disponibles para esta Fecha'}
                    </h4>
                    <p className="text-[11px] text-[#5C5852]">
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
                    className="text-[11px] text-[#5C5852] hover:text-[#161514] px-2.5 py-1 rounded-lg bg-[#F2EFE9] hover:bg-[#E6E1D6] transition-colors shrink-0 ml-2"
                  >
                    Ocultar
                  </button>
                )}
              </div>

              <div className="grid gap-2.5">
                {alternativeSuggestions.slice(0, 3).map((alt) => (
                  <div
                    key={alt.barber.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-white border border-[#E6E1D6] hover:border-[#9A6B3B]/60 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={alt.barber.photoUrl}
                        alt={alt.barber.displayName}
                        className="w-10 h-10 rounded-xl object-cover border border-[#E6E1D6]"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-display text-base font-bold uppercase text-[#161514]">
                            {alt.barber.displayName}
                          </span>
                          {alt.isFavorite && (
                            <span className="text-[10px] font-semibold text-rose-700">
                              · Favorito
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#9A6B3B] font-semibold tabular-nums">
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
                      className="px-3.5 py-2 rounded-xl bg-[#161514] hover:bg-[#9A6B3B] text-xs font-semibold text-[#FAF9F6] transition-colors flex items-center gap-1"
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
              className="px-4 py-3 rounded-xl bg-[#F2EFE9] hover:bg-[#E6E1D6] text-[#161514] text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Atrás</span>
            </button>
            <button
              onClick={() => setCurrentStep(5)}
              disabled={!selectedTimeSlot}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] font-semibold text-sm active:scale-[0.99] transition-all disabled:opacity-50"
            >
              <span>Revisar Cita</span>
              <ChevronRight className="w-4 h-4 text-[#C69765]" />
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 5: SUMMARY & CONFIRMATION */}
      {currentStep === 5 && selectedTimeSlot && (
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          className="space-y-4"
        >
          <div className="flex items-end justify-between border-b border-[#E6E1D6] pb-3">
            <div>
              <h2 className="font-display text-3xl font-bold text-[#161514] tracking-wide uppercase">
                Confirmar Reserva
              </h2>
              <p className="text-xs text-[#5C5852] mt-0.5">
                Verifica los detalles de tu cita antes de agendar
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#F2EFE9] border border-[#E6E1D6] text-[#9A6B3B]">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          {bookingError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{bookingError}</span>
            </div>
          )}

          <div className="rounded-2xl bg-white border border-[#E6E1D6] p-5 space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#E6E1D6]">
              <div className="flex items-center gap-3">
                <img
                  src={selectedBarber?.photoUrl}
                  alt={selectedBarber?.displayName}
                  className="w-12 h-12 rounded-xl object-cover border border-[#9A6B3B]/45"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-[#9A6B3B]">
                    Barbero Asignado
                  </span>
                  <h3 className="font-display text-xl font-bold text-[#161514] uppercase tracking-wide">
                    {selectedBarber?.displayName}
                  </h3>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5C5852]">
                  Total
                </span>
                <p className="font-mono text-lg font-bold text-[#161514] tabular-nums">
                  {formatCurrency(selectedService.price)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E6E1D6]">
                <span className="text-[10px] text-[#5C5852] uppercase tracking-wider block">
                  Servicio
                </span>
                <span className="font-bold text-[#161514] block mt-0.5">
                  {selectedService.name}
                </span>
                <span className="text-[11px] text-[#5C5852] tabular-nums">
                  {selectedService.durationMinutes} min
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E6E1D6]">
                <span className="text-[10px] text-[#5C5852] uppercase tracking-wider block">
                  Fecha y Hora
                </span>
                <span className="font-bold text-[#161514] block mt-0.5">
                  {formatDateSpanish(selectedDate)}
                </span>
                <span className="font-mono text-[11px] text-[#9A6B3B] font-semibold tabular-nums">
                  {formatTime12h(selectedTimeSlot.startTime)} - {formatTime12h(selectedTimeSlot.endTime)}
                </span>
              </div>
            </div>

            {userProfile ? (
              <div className="space-y-3 pt-2">
                <div className="p-3.5 rounded-xl bg-[#F2EFE9] border border-[#9A6B3B]/35 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-[#E6E1D6] flex items-center justify-center text-[#9A6B3B]">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#161514]">{userProfile.name}</span>
                        <span className="text-[10px] font-bold uppercase text-[#9A6B3B]">
                          · VIP
                        </span>
                      </div>
                      <p className="text-[11px] text-[#5C5852] font-mono tabular-nums">
                        {userProfile.phone} · #{userProfile.clientNumber || userProfile.id.slice(-6)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#5C5852] block">Puntos VIP</span>
                    <span className="text-xs font-mono font-bold text-[#9A6B3B] tabular-nums">
                      {userProfile.points || 0} pts
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#161514] block mb-1">
                    Notas o requerimientos especiales (opcional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej. Prefiero barba perfilada baja o corte a tijera"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#E6E1D6] text-[#161514] placeholder-[#5C5852]/60 text-xs focus:outline-none focus:border-[#9A6B3B] transition-colors"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-xs font-semibold text-[#161514] block mb-1">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Tu nombre y apellido"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#E6E1D6] text-[#161514] placeholder-[#5C5852]/60 text-xs focus:outline-none focus:border-[#9A6B3B] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#161514] block mb-1">
                      Celular (10 dígitos) *
                    </label>
                    <input
                      type="tel"
                      maxLength={10}
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="Ej. 5512345678"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#E6E1D6] text-[#161514] placeholder-[#5C5852]/60 text-xs font-mono tabular-nums focus:outline-none focus:border-[#9A6B3B] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#161514] block mb-1">
                    Notas (opcional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej. Prefiero corte a tijera o degradado medio"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#E6E1D6] text-[#161514] placeholder-[#5C5852]/60 text-xs focus:outline-none focus:border-[#9A6B3B] transition-colors"
                  />
                </div>

                <div className="pt-0.5 space-y-2.5">
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none group">
                    <input
                      type="checkbox"
                      checked={wantToRegister}
                      onChange={(e) => {
                        setWantToRegister(e.target.checked);
                        if (!e.target.checked) setClientPin('');
                      }}
                      className="w-3.5 h-3.5 rounded border-[#D2CBBF] text-[#9A6B3B] focus:ring-[#9A6B3B]/40 cursor-pointer accent-[#161514]"
                    />
                    <span className="text-[11px] text-[#5C5852] group-hover:text-[#161514] transition-colors">
                      ¿Quieres registrarte? <span className="text-[#8E887E]">(opcional)</span>
                    </span>
                  </label>

                  {wantToRegister && (
                    <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E6E1D6] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-[#161514]">
                          Contraseña / NIP de acceso (4 dígitos) *
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowPin(!showPin)}
                          className="text-[11px] text-[#9A6B3B] hover:underline flex items-center gap-1"
                        >
                          {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          <span>{showPin ? 'Ocultar' : 'Ver'}</span>
                        </button>
                      </div>
                      <input
                        type={showPin ? 'text' : 'password'}
                        maxLength={4}
                        value={clientPin}
                        onChange={(e) => setClientPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="Ej. 1234"
                        className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E6E1D6] text-[#161514] text-xs font-mono tracking-widest tabular-nums focus:outline-none focus:border-[#9A6B3B] transition-colors"
                      />
                      <p className="text-[10px] text-[#5C5852]">
                        Crearemos tu cuenta con este NIP de 4 dígitos para guardar tus citas y puntos VIP.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="p-3 rounded-xl bg-[#F2EFE9] border border-[#E6E1D6] text-[11px] text-[#5C5852] leading-relaxed tabular-nums">
              <span className="font-semibold text-[#161514]">Política de Puntualidad:</span> Puedes cancelar o
              reprogramar gratis hasta {businessSettings.minCancelNoticeHours} horas antes del horario fijado.
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between gap-3">
            <button
              onClick={() => setCurrentStep(4)}
              disabled={isSubmitting}
              className="px-4 py-3 rounded-xl bg-[#F2EFE9] hover:bg-[#E6E1D6] text-[#161514] text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Atrás</span>
            </button>
            <button
              onClick={handleConfirmBooking}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] font-semibold text-sm active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Validando y confirmando cita...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#C69765] stroke-[2.2]" />
                  <span>Confirmar Cita Ahora</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 6: SUCCESS CONFIRMATION SCREEN */}
      {currentStep === 6 && confirmedAppointment && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6 pt-4"
        >
          <div className="w-20 h-20 rounded-full bg-[#161514] mx-auto flex items-center justify-center border-2 border-[#9A6B3B] shadow-md">
            <CheckCircle2 className="w-10 h-10 text-[#C69765]" />
          </div>

          <div>
            <span className="text-xs uppercase font-semibold tracking-[0.2em] text-[#9A6B3B]">
              MONARCA BARBER
            </span>
            <h2 className="font-display text-3xl font-bold text-[#161514] tracking-wide uppercase mt-1">
              ¡Cita Confirmada!
            </h2>
            <p className="text-xs text-[#5C5852] mt-1 max-w-xs mx-auto">
              Te esperamos en nuestra sucursal. Hemos reservado tu lugar con exclusividad.
            </p>
          </div>

          <div className="rounded-2xl bg-white border border-[#E6E1D6] p-5 text-left space-y-4 max-w-md mx-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E1D6]">
              <div>
                <span className="text-[10px] text-[#5C5852] uppercase tracking-wider">Servicio</span>
                <h4 className="font-display text-xl font-bold text-[#161514] uppercase tracking-wide">
                  {confirmedAppointment.serviceNameSnapshot}
                </h4>
              </div>
              <span className="font-mono text-base font-bold text-[#9A6B3B] tabular-nums">
                {formatCurrency(confirmedAppointment.servicePriceSnapshot)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-[#5C5852] block uppercase tracking-wider">Barbero</span>
                <span className="font-bold text-[#161514]">{confirmedAppointment.barberName}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#5C5852] block uppercase tracking-wider">Fecha</span>
                <span className="font-bold text-[#161514]">{formatDateSpanish(confirmedAppointment.date)}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#5C5852] block uppercase tracking-wider">Hora</span>
                <span className="font-mono font-bold text-[#9A6B3B] tabular-nums">
                  {formatTime12h(confirmedAppointment.startTime)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#5C5852] block uppercase tracking-wider">Duración</span>
                <span className="font-bold text-[#161514] tabular-nums">
                  {confirmedAppointment.serviceDurationSnapshot} minutos
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#E6E1D6] text-[11px] text-[#5C5852] flex items-center justify-between tabular-nums">
              <span>
                Folio: <strong className="font-mono text-[#161514]">{confirmedAppointment.id.substring(0, 12)}</strong>
              </span>
              <span className="text-emerald-700 font-semibold">Confirmada en sistema</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 max-w-md mx-auto">
            <button
              onClick={downloadIcsFile}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-[#F2EFE9] text-[#161514] text-xs font-semibold border border-[#E6E1D6] transition-all"
            >
              <CalendarPlus className="w-4 h-4 text-[#9A6B3B]" />
              <span>Agregar al Calendario</span>
            </button>

            <button
              onClick={() => onBookingComplete?.(confirmedAppointment)}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] text-xs font-semibold transition-all"
            >
              <span>Ver Mis Citas</span>
              <ChevronRight className="w-4 h-4 text-[#C69765]" />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
