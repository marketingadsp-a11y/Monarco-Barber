import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Scissors,
  User,
  Phone,
  Search,
  CheckCircle2,
  X,
  Sparkles,
  ChevronRight,
  AlertCircle,
  Plus,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useBarbershop } from '../../contexts/BarbershopContext';
import { Barber, Service, UserProfile, Appointment } from '../../types';
import {
  getTodayDateString,
  formatDateSpanish,
  formatTime12h,
  formatCurrency,
  addMinutesToTime,
  timeToMinutes,
  minutesToTime,
} from '../../utils/dateTime';
import { dataService } from '../../services/firebase/dataService';

interface BarberBookAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeBarber: Barber;
  initialClient?: UserProfile | null;
  onBookingSuccess?: (appointment: Appointment) => void;
}

export const BarberBookAppointmentModal: React.FC<BarberBookAppointmentModalProps> = ({
  isOpen,
  onClose,
  activeBarber,
  initialClient,
  onBookingSuccess,
}) => {
  const { services, appointments, blockedSlots, businessSettings, bookAppointment, showToast } =
    useBarbershop();

  // Wizard Steps: 1: Service, 2: Date & Time, 3: Client Info, 4: Summary/Confirm
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');

  // Client Selection State
  const [clientType, setClientType] = useState<'registered' | 'walkin'>('registered');
  const [registeredUsers, setRegisteredUsers] = useState<UserProfile[]>([]);
  const [clientSearchQuery, setClientSearchQuery] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<UserProfile | null>(initialClient || null);

  // Walk-in client form
  const [walkinName, setWalkinName] = useState<string>('');
  const [walkinPhone, setWalkinPhone] = useState<string>('');
  const [appointmentNotes, setAppointmentNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Load registered users on modal open
  useEffect(() => {
    if (isOpen) {
      dataService.getAllUsers().then((users) => {
        setRegisteredUsers(users);
      });
      if (initialClient) {
        setSelectedClient(initialClient);
        setClientType('registered');
      }
    }
  }, [isOpen, initialClient]);

  // Filter services available for this barber
  const barberServices = services.filter((s) => {
    if (!s.active) return false;
    // If service has specific barberId, match it
    if (s.barberId && s.barberId === activeBarber.id) return true;
    // If global service, check if barber offers it (or default to all if no filter set)
    if (!s.barberId || s.createdByType === 'admin') {
      if (!activeBarber.serviceIds || activeBarber.serviceIds.length === 0) return true;
      return activeBarber.serviceIds.includes(s.id);
    }
    return false;
  });

  const activeSelectedService = services.find((s) => s.id === selectedServiceId) || barberServices[0];

  // Auto-select first service if none selected
  useEffect(() => {
    if (barberServices.length > 0 && !selectedServiceId) {
      setSelectedServiceId(barberServices[0].id);
    }
  }, [barberServices, selectedServiceId]);

  // Calculate available time slots for selected date
  const generateSlots = () => {
    const opening = businessSettings.openingTime || '09:00';
    const closing = businessSettings.closingTime || '21:00';
    const interval = businessSettings.slotIntervalMinutes || 30;
    const duration = activeSelectedService?.durationMinutes || 45;

    const slots: { start: string; end: string; available: boolean; conflictReason?: string }[] = [];
    let current = opening;

    // Existing appointments for this barber on selected date
    const dayAppointments = appointments.filter(
      (a) =>
        a.barberId === activeBarber.id &&
        a.date === selectedDate &&
        a.status !== 'cancelled' &&
        a.status !== 'rejected'
    );

    // Blocked slots for this barber on selected date
    const dayBlocks = blockedSlots.filter(
      (b) => b.barberId === activeBarber.id && b.date === selectedDate
    );

    while (current < closing) {
      const end = addMinutesToTime(current, duration);
      if (end > closing) break;

      // Check appointment conflict with rounded-up end times for grid alignment
      const hasAppConflict = dayAppointments.some((a) => {
        const appDuration = timeToMinutes(a.endTime) - timeToMinutes(a.startTime);
        const roundedDuration = Math.ceil(appDuration / interval) * interval;
        const appRoundedEndTime = minutesToTime(timeToMinutes(a.startTime) + roundedDuration);

        return (
          (current >= a.startTime && current < appRoundedEndTime) ||
          (end > a.startTime && end <= appRoundedEndTime) ||
          (current <= a.startTime && end >= appRoundedEndTime)
        );
      });

      // Check block conflict
      const hasBlockConflict = dayBlocks.some(
        (b) =>
          (current >= b.startTime && current < b.endTime) ||
          (end > b.startTime && end <= b.endTime) ||
          (current <= b.startTime && end >= b.endTime)
      );

      slots.push({
        start: current,
        end,
        available: !hasAppConflict && !hasBlockConflict,
        conflictReason: hasAppConflict ? 'Ocupado' : hasBlockConflict ? 'Bloqueado' : undefined,
      });

      current = addMinutesToTime(current, interval);
    }

    return slots;
  };

  const availableSlots = generateSlots();

  // Filter registered clients by search query
  const filteredUsers = registeredUsers.filter((u) => {
    if (!clientSearchQuery.trim()) return true;
    const q = clientSearchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      (u.phone && u.phone.includes(q)) ||
      (u.clientNumber && u.clientNumber.includes(q))
    );
  });

  const handleConfirmBooking = async () => {
    if (!activeSelectedService) {
      showToast('error', 'Selecciona un servicio', 'Debes elegir qué servicio realizarás.');
      return;
    }
    if (!selectedTimeSlot) {
      showToast('error', 'Selecciona un horario', 'Debes elegir la hora de la cita.');
      return;
    }

    let finalClientId = 'walkin_client';
    let finalClientName = walkinName.trim();
    let finalClientPhone = walkinPhone.trim();

    if (clientType === 'registered') {
      if (!selectedClient) {
        showToast('error', 'Selecciona un cliente', 'Elige un cliente registrado o cambia a Cliente en Tienda.');
        return;
      }
      finalClientId = selectedClient.id;
      finalClientName = selectedClient.name;
      finalClientPhone = selectedClient.phone;
    } else {
      if (!finalClientName) {
        showToast('error', 'Nombre requerido', 'Ingresa el nombre del cliente.');
        return;
      }
    }

    const endTime = addMinutesToTime(selectedTimeSlot, activeSelectedService.durationMinutes);

    setIsSubmitting(true);
    try {
      const createdApp = await bookAppointment({
        clientId: finalClientId,
        clientName: finalClientName,
        clientPhone: finalClientPhone,
        barberId: activeBarber.id,
        barberName: activeBarber.displayName,
        barberPhoto: activeBarber.photoUrl,
        serviceId: activeSelectedService.id,
        serviceNameSnapshot: activeSelectedService.name,
        servicePriceSnapshot: activeSelectedService.price,
        serviceDurationSnapshot: activeSelectedService.durationMinutes,
        date: selectedDate,
        startTime: selectedTimeSlot,
        endTime: endTime,
        status: 'confirmed',
        notes: appointmentNotes ? `[Agendado por barbero] ${appointmentNotes}` : 'Agendado directamente por barbero',
      });

      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.5 },
          colors: ['#D4AF37', '#10B981', '#FFFFFF'],
        });
      } catch {
        // ignore
      }

      showToast(
        'success',
        '¡Cita Agendada Exitosamente!',
        `Cita con ${finalClientName} para el ${formatDateSpanish(selectedDate)} a las ${formatTime12h(selectedTimeSlot)}.`
      );

      if (onBookingSuccess) {
        onBookingSuccess(createdApp);
      }
      onClose();
    } catch (err: any) {
      showToast('error', 'Error al agendar', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-[#12151B] border border-white/15 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col my-auto max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-[#181D26] to-[#12151B]">
          <div className="flex items-center gap-3">
            <img
              src={activeBarber.photoUrl}
              alt={activeBarber.displayName}
              className="w-11 h-11 rounded-2xl object-cover border-2 border-[#D4AF37] shadow-md"
              referrerPolicy="no-referrer"
            />
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Agendar Cita en Mi Silla</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">
                  {activeBarber.displayName}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Programa un servicio para un cliente con tu disponibilidad
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator Pills */}
        <div className="grid grid-cols-4 border-b border-white/10 text-center text-xs bg-[#0D0F12]">
          <button
            onClick={() => setCurrentStep(1)}
            className={`py-2.5 px-1 font-bold border-b-2 transition-all ${
              currentStep === 1
                ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/5'
                : 'border-transparent text-slate-400'
            }`}
          >
            1. Servicio
          </button>
          <button
            onClick={() => selectedServiceId && setCurrentStep(2)}
            className={`py-2.5 px-1 font-bold border-b-2 transition-all ${
              currentStep === 2
                ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/5'
                : 'border-transparent text-slate-400'
            }`}
          >
            2. Horario
          </button>
          <button
            onClick={() => selectedTimeSlot && setCurrentStep(3)}
            className={`py-2.5 px-1 font-bold border-b-2 transition-all ${
              currentStep === 3
                ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/5'
                : 'border-transparent text-slate-400'
            }`}
          >
            3. Cliente
          </button>
          <button
            onClick={() => setCurrentStep(4)}
            className={`py-2.5 px-1 font-bold border-b-2 transition-all ${
              currentStep === 4
                ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/5'
                : 'border-transparent text-slate-400'
            }`}
          >
            4. Confirmar
          </button>
        </div>

        {/* Modal Body per Step */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* STEP 1: SELECT SERVICE */}
          {currentStep === 1 && (
            <div className="space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Selecciona el servicio a realizar:
                </h3>
                <span className="text-slate-400 text-[11px] font-medium">
                  {barberServices.length} servicios disponibles
                </span>
              </div>

              <div className="grid gap-2.5">
                {barberServices.map((service) => {
                  const isSelected = selectedServiceId === service.id;
                  return (
                    <div
                      key={service.id}
                      onClick={() => {
                        setSelectedServiceId(service.id);
                        setCurrentStep(2);
                      }}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#181D26] border-[#D4AF37] shadow-lg shadow-[#D4AF37]/10'
                          : 'bg-[#14171E] border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={
                            service.imageUrl ||
                            'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80'
                          }
                          alt={service.name}
                          className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-white text-sm truncate">{service.name}</h4>
                          <p className="text-[11px] text-slate-400">
                            {service.durationMinutes} min •{' '}
                            <strong className="text-[#D4AF37]">{formatCurrency(service.price)}</strong>
                          </p>
                          {service.description && (
                            <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                              {service.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors shrink-0 ${
                          isSelected
                            ? 'bg-[#D4AF37] border-[#D4AF37] text-slate-950 font-bold'
                            : 'border-white/20 text-transparent'
                        }`}
                      >
                        ✓
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: SELECT DATE & TIME */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in">
              {/* Date Picker Bar */}
              <div className="space-y-2">
                <label className="text-slate-300 font-semibold block">Selecciona la Fecha</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDate(getTodayDateString())}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                      selectedDate === getTodayDateString()
                        ? 'bg-[#D4AF37] text-slate-950 border-[#D4AF37]'
                        : 'bg-[#14171E] border-white/10 text-slate-300'
                    }`}
                  >
                    Hoy
                  </button>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setSelectedTimeSlot('');
                    }}
                    className="flex-1 p-2 rounded-xl bg-slate-900 border border-white/15 text-white font-medium text-xs focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              {/* Slots Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold block">
                    Horarios Disponibles para {formatDateSpanish(selectedDate)}
                  </label>
                  <span className="text-slate-400 text-[11px]">
                    Duración: {activeSelectedService?.durationMinutes || 45} min
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[260px] overflow-y-auto p-1">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.start}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setSelectedTimeSlot(slot.start)}
                      className={`p-2.5 rounded-xl text-xs font-bold text-center border transition-all ${
                        selectedTimeSlot === slot.start
                          ? 'bg-[#D4AF37] text-slate-950 border-[#D4AF37] shadow-lg shadow-[#D4AF37]/20 scale-105'
                          : slot.available
                          ? 'bg-[#14171E] hover:bg-[#1C212B] border-white/10 text-white'
                          : 'bg-black/30 border-white/5 text-slate-600 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <span>{formatTime12h(slot.start)}</span>
                      {slot.conflictReason && (
                        <span className="block text-[9px] font-normal text-rose-400/80">
                          {slot.conflictReason}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: CLIENT SELECTION */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in">
              {/* Client Type Switcher */}
              <div className="grid grid-cols-2 p-1 rounded-2xl bg-black/40 border border-white/10">
                <button
                  type="button"
                  onClick={() => setClientType('registered')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    clientType === 'registered' ? 'bg-[#D4AF37] text-slate-950' : 'text-slate-400'
                  }`}
                >
                  Cliente Registrado
                </button>
                <button
                  type="button"
                  onClick={() => setClientType('walkin')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    clientType === 'walkin' ? 'bg-[#D4AF37] text-slate-950' : 'text-slate-400'
                  }`}
                >
                  Cliente en Tienda (Nuevo)
                </button>
              </div>

              {clientType === 'registered' ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={clientSearchQuery}
                      onChange={(e) => setClientSearchQuery(e.target.value)}
                      placeholder="Buscar por nombre, celular o No. de Cliente..."
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  {selectedClient && (
                    <div className="p-3.5 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#D4AF37] text-slate-950 font-black flex items-center justify-center text-sm">
                          {selectedClient.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-xs">{selectedClient.name}</h4>
                          <p className="text-[11px] text-[#D4AF37]">
                            #{selectedClient.clientNumber || 'VIP'} • {selectedClient.phone}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                        Seleccionado
                      </span>
                    </div>
                  )}

                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto p-1">
                    {filteredUsers.slice(0, 15).map((user) => {
                      const isSel = selectedClient?.id === user.id;
                      return (
                        <div
                          key={user.id}
                          onClick={() => setSelectedClient(user)}
                          className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            isSel
                              ? 'bg-[#D4AF37]/20 border-[#D4AF37]'
                              : 'bg-[#14171E] border-white/10 hover:bg-[#1C212B]'
                          }`}
                        >
                          <div>
                            <span className="font-bold text-white text-xs block">{user.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              #{user.clientNumber || 'VIP'} • {user.phone}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#D4AF37] font-bold">
                            {user.points || 0} pts
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-slate-300 block mb-1">Nombre completo del cliente *</label>
                    <input
                      type="text"
                      value={walkinName}
                      onChange={(e) => setWalkinName(e.target.value)}
                      placeholder="Ej. Roberto Gómez"
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1">Teléfono / WhatsApp (Opcional)</label>
                    <input
                      type="tel"
                      value={walkinPhone}
                      onChange={(e) => setWalkinPhone(e.target.value)}
                      placeholder="+52 34 1197 5639"
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-slate-400 block mb-1">Nota o preferencia del corte (Opcional)</label>
                <textarea
                  value={appointmentNotes}
                  onChange={(e) => setAppointmentNotes(e.target.value)}
                  rows={2}
                  placeholder="Ej. Quiere desvanecido bajo con navaja..."
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white"
                />
              </div>
            </div>
          )}

          {/* STEP 4: SUMMARY & CONFIRM */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-3xl bg-gradient-to-b from-[#181D26] to-[#12151B] border border-[#D4AF37]/30 shadow-xl space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <Scissors className="w-5 h-5 text-[#D4AF37]" />
                    <div>
                      <h4 className="font-bold text-white text-sm">
                        {activeSelectedService?.name || 'Servicio'}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {activeSelectedService?.durationMinutes} min de duración
                      </p>
                    </div>
                  </div>
                  <span className="font-black text-[#D4AF37] text-base">
                    {formatCurrency(activeSelectedService?.price || 0)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Fecha</span>
                    <span className="text-white font-bold mt-0.5 block">
                      {formatDateSpanish(selectedDate)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Horario</span>
                    <span className="text-white font-bold mt-0.5 block">
                      {selectedTimeSlot ? formatTime12h(selectedTimeSlot) : 'No seleccionado'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Barbero</span>
                    <span className="text-[#D4AF37] font-bold mt-0.5 block">
                      {activeBarber.displayName} (Tú)
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Cliente</span>
                    <span className="text-white font-bold mt-0.5 block">
                      {clientType === 'registered'
                        ? selectedClient?.name || 'No seleccionado'
                        : walkinName || 'Cliente en Tienda'}
                    </span>
                  </div>
                </div>

                {appointmentNotes && (
                  <p className="text-[11px] text-slate-400 bg-white/5 p-2 rounded-xl">
                    <strong>Nota:</strong> {appointmentNotes}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Navigation */}
        <div className="p-3.5 sm:p-4 border-t border-white/10 bg-[#0D0F12] flex items-center justify-between gap-2">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
            >
              Atrás
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
            >
              Cancelar
            </button>
          )}

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={() => {
                if (currentStep === 1 && !selectedServiceId) {
                  showToast('error', 'Selecciona servicio', 'Elige un servicio para continuar.');
                  return;
                }
                if (currentStep === 2 && !selectedTimeSlot) {
                  showToast('error', 'Selecciona horario', 'Elige una hora para continuar.');
                  return;
                }
                if (currentStep === 3) {
                  if (clientType === 'registered' && !selectedClient) {
                    showToast('error', 'Selecciona cliente', 'Elige un cliente o usa Cliente en Tienda.');
                    return;
                  }
                  if (clientType === 'walkin' && !walkinName.trim()) {
                    showToast('error', 'Nombre requerido', 'Ingresa el nombre del cliente.');
                    return;
                  }
                }
                setCurrentStep((prev) => (prev + 1) as any);
              }}
              className="px-5 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#E5B869] text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-1"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirmBooking}
              disabled={isSubmitting || !selectedTimeSlot}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 font-bold text-xs shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>{isSubmitting ? 'Agendando...' : 'Confirmar y Agendar'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
