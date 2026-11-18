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
} from '../../utils/dateTime';
import { getAvailableSlots, isShopOpenOnDate } from '../../services/availabilityEngine';
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
  const { services, availabilityAppointments, schedules, blockedSlots, businessSettings, bookAppointment, showToast } =
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

  const isShopOpen = isShopOpenOnDate(selectedDate, businessSettings);

  // Calculate available time slots using unified availability engine (barbershop schedule + duration-adaptive grid)
  const availableSlots = getAvailableSlots({
    barberId: activeBarber.id,
    serviceDurationMinutes: activeSelectedService?.durationMinutes || 45,
    date: selectedDate,
    barberSchedule: schedules[activeBarber.id],
    appointments: availabilityAppointments,
    blockedSlots,
    settings: businessSettings,
    ignoreMinNotice: true,
  });

  // Reset selectedTimeSlot if it is no longer valid after switching service or date
  useEffect(() => {
    if (!selectedTimeSlot) return;
    const stillValid = availableSlots.some(
      (s) => s.startTime === selectedTimeSlot && s.available
    );
    if (!stillValid) {
      setSelectedTimeSlot('');
    }
  }, [selectedServiceId, selectedDate, availableSlots, selectedTimeSlot]);

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
          colors: ['#9A6B3B', '#161514', '#C69765'],
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
    <div className="fixed inset-0 z-50 bg-[#161514]/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-[#FAF9F6] border border-[#D2CBBF] rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col my-auto max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#E6E1D6] flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <img
              src={activeBarber.photoUrl}
              alt={activeBarber.displayName}
              className="w-11 h-11 rounded-2xl object-cover border border-[#9A6B3B]/60 shadow-xs"
              referrerPolicy="no-referrer"
            />
            <div>
              <h2 className="font-display text-lg font-bold text-[#161514] uppercase tracking-wide flex items-center gap-2 flex-wrap">
                <span>Agendar Cita en Mi Silla</span>
                <span className="font-sans normal-case text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#FBF6EE] text-[#7D542B] border border-[#9A6B3B]/30">
                  {activeBarber.displayName}
                </span>
              </h2>
              <p className="text-xs text-[#5C5852]">
                Programa un servicio para un cliente con tu disponibilidad
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F2EFE9] hover:bg-[#E8E3D9] text-[#5C5852] hover:text-[#161514] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator Tabs */}
        <div className="grid grid-cols-4 border-b border-[#E6E1D6] text-center text-xs bg-[#F2EFE9]">
          <button
            onClick={() => setCurrentStep(1)}
            className={`py-2.5 px-1 font-semibold border-b-2 transition-all ${
              currentStep === 1
                ? 'border-[#161514] text-[#161514] bg-white'
                : 'border-transparent text-[#5C5852] hover:text-[#161514]'
            }`}
          >
            1. Servicio
          </button>
          <button
            onClick={() => selectedServiceId && setCurrentStep(2)}
            className={`py-2.5 px-1 font-semibold border-b-2 transition-all ${
              currentStep === 2
                ? 'border-[#161514] text-[#161514] bg-white'
                : 'border-transparent text-[#5C5852] hover:text-[#161514]'
            }`}
          >
            2. Horario
          </button>
          <button
            onClick={() => selectedTimeSlot && setCurrentStep(3)}
            className={`py-2.5 px-1 font-semibold border-b-2 transition-all ${
              currentStep === 3
                ? 'border-[#161514] text-[#161514] bg-white'
                : 'border-transparent text-[#5C5852] hover:text-[#161514]'
            }`}
          >
            3. Cliente
          </button>
          <button
            onClick={() => setCurrentStep(4)}
            className={`py-2.5 px-1 font-semibold border-b-2 transition-all ${
              currentStep === 4
                ? 'border-[#161514] text-[#161514] bg-white'
                : 'border-transparent text-[#5C5852] hover:text-[#161514]'
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
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#5C5852]">
                  Selecciona el servicio a realizar:
                </h3>
                <span className="text-[#5C5852] text-[11px] font-medium">
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
                          ? 'bg-[#FAF7F0] border-[#161514] shadow-xs'
                          : 'bg-white border-[#E6E1D6] hover:border-[#9A6B3B]/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={
                            service.imageUrl ||
                            'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80'
                          }
                          alt={service.name}
                          className="w-12 h-12 rounded-xl object-cover border border-[#E6E1D6] shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-[#161514] text-sm truncate">{service.name}</h4>
                          <p className="text-[11px] text-[#5C5852] font-mono tabular-nums">
                            {service.durationMinutes} min ·{' '}
                            <strong className="text-[#9A6B3B]">{formatCurrency(service.price)}</strong>
                          </p>
                          {service.description && (
                            <p className="text-[10px] text-[#767067] line-clamp-1 mt-0.5">
                              {service.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors shrink-0 ${
                          isSelected
                            ? 'bg-[#161514] border-[#161514] text-[#FAF9F6] font-bold'
                            : 'border-[#D2CBBF] text-transparent bg-white'
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
                <label className="text-[#161514] font-semibold block">Selecciona la Fecha</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDate(getTodayDateString())}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      selectedDate === getTodayDateString()
                        ? 'bg-[#161514] text-[#FAF9F6] border-[#161514]'
                        : 'bg-white border-[#D2CBBF] text-[#5C5852] hover:text-[#161514]'
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
                    className="flex-1 p-2 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] font-medium text-xs focus:outline-none focus:border-[#161514]"
                  />
                </div>
              </div>

              {/* Slots Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[#161514] font-semibold block">
                    Horarios Disponibles para {formatDateSpanish(selectedDate)}
                  </label>
                  <span className="text-[#5C5852] text-[11px] font-mono tabular-nums">
                    Duración: {activeSelectedService?.durationMinutes || 45} min
                  </span>
                </div>

                {availableSlots.length === 0 ? (
                  <div className="p-5 rounded-2xl bg-white border border-[#E6E1D6] text-center space-y-1.5">
                    <AlertCircle className="w-6 h-6 text-[#9A6B3B] mx-auto" />
                    <p className="font-bold text-[#161514] text-xs">
                      {!isShopOpen ? 'Barbería cerrada en esta fecha' : 'Sin horarios disponibles'}
                    </p>
                    <p className="text-[11px] text-[#5C5852]">
                      {!isShopOpen
                        ? 'De acuerdo con el horario de la barbería, este día no hay atención. Elige otra fecha.'
                        : 'No hay bloques libres para este servicio en la fecha elegida.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[260px] overflow-y-auto p-1">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.startTime}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => setSelectedTimeSlot(slot.startTime)}
                        className={`p-2.5 rounded-xl text-xs font-mono tabular-nums font-semibold text-center border transition-all ${
                          selectedTimeSlot === slot.startTime
                            ? 'bg-[#161514] text-[#FAF9F6] border-[#161514] shadow-sm scale-[1.02]'
                            : slot.available
                            ? 'bg-white hover:bg-[#FAF7F0] hover:border-[#9A6B3B] border-[#E6E1D6] text-[#161514]'
                            : 'bg-[#F2EFE9] border-[#E6E1D6] text-[#9E978D] cursor-not-allowed opacity-60'
                        }`}
                      >
                        <span>{formatTime12h(slot.startTime)}</span>
                        {slot.available ? (
                          <span className={`font-sans block text-[9px] font-medium mt-0.5 ${
                            selectedTimeSlot === slot.startTime ? 'text-[#C69765]' : 'text-[#5C5852]'
                          }`}>
                            hasta {formatTime12h(slot.endTime)}
                          </span>
                        ) : (
                          slot.conflictReason && (
                            <span className="font-sans block text-[9px] font-medium text-rose-700 mt-0.5 truncate">
                              {slot.conflictReason}
                            </span>
                          )
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: CLIENT SELECTION */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in">
              {/* Client Type Switcher */}
              <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#F2EFE9] border border-[#E6E1D6]">
                <button
                  type="button"
                  onClick={() => setClientType('registered')}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                    clientType === 'registered' ? 'bg-[#161514] text-[#FAF9F6] shadow-xs' : 'text-[#5C5852] hover:text-[#161514]'
                  }`}
                >
                  Cliente Registrado
                </button>
                <button
                  type="button"
                  onClick={() => setClientType('walkin')}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                    clientType === 'walkin' ? 'bg-[#161514] text-[#FAF9F6] shadow-xs' : 'text-[#5C5852] hover:text-[#161514]'
                  }`}
                >
                  Cliente en Tienda (Nuevo)
                </button>
              </div>

              {clientType === 'registered' ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8E887E]" />
                    <input
                      type="text"
                      value={clientSearchQuery}
                      onChange={(e) => setClientSearchQuery(e.target.value)}
                      placeholder="Buscar por nombre, celular o No. de Cliente..."
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] placeholder-[#8E887E] text-xs focus:outline-none focus:border-[#161514]"
                    />
                  </div>

                  {selectedClient && (
                    <div className="p-3.5 rounded-2xl bg-[#FAF7F0] border border-[#9A6B3B] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#161514] text-[#FAF9F6] font-bold flex items-center justify-center text-sm">
                          {selectedClient.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-[#161514] text-xs">{selectedClient.name}</h4>
                          <p className="text-[11px] text-[#9A6B3B] font-mono tabular-nums">
                            #{selectedClient.clientNumber || 'VIP'} · {selectedClient.phone}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
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
                              ? 'bg-[#FAF7F0] border-[#161514]'
                              : 'bg-white border-[#E6E1D6] hover:bg-[#FAF9F6]'
                          }`}
                        >
                          <div>
                            <span className="font-bold text-[#161514] text-xs block">{user.name}</span>
                            <span className="text-[10px] text-[#5C5852] font-mono">
                              #{user.clientNumber || 'VIP'} · {user.phone}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#9A6B3B] font-mono tabular-nums font-bold">
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
                    <label className="text-[#5C5852] font-semibold block mb-1">Nombre completo del cliente *</label>
                    <input
                      type="text"
                      value={walkinName}
                      onChange={(e) => setWalkinName(e.target.value)}
                      placeholder="Ej. Roberto Gómez"
                      className="w-full p-2.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] placeholder-[#8E887E] focus:outline-none focus:border-[#161514]"
                    />
                  </div>

                  <div>
                    <label className="text-[#5C5852] font-semibold block mb-1">Teléfono / WhatsApp (Opcional)</label>
                    <input
                      type="tel"
                      value={walkinPhone}
                      onChange={(e) => setWalkinPhone(e.target.value)}
                      placeholder="+52 34 1197 5639"
                      className="w-full p-2.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] placeholder-[#8E887E] focus:outline-none focus:border-[#161514]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-[#5C5852] font-semibold block mb-1">Nota o preferencia del corte (Opcional)</label>
                <textarea
                  value={appointmentNotes}
                  onChange={(e) => setAppointmentNotes(e.target.value)}
                  rows={2}
                  placeholder="Ej. Quiere desvanecido bajo con navaja..."
                  className="w-full p-2.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] placeholder-[#8E887E] focus:outline-none focus:border-[#161514]"
                />
              </div>
            </div>
          )}

          {/* STEP 4: SUMMARY & CONFIRM */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-3xl bg-white border border-[#9A6B3B]/45 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-[#E6E1D6]">
                  <div className="flex items-center gap-2.5">
                    <Scissors className="w-5 h-5 text-[#9A6B3B]" />
                    <div>
                      <h4 className="font-bold text-[#161514] text-sm">
                        {activeSelectedService?.name || 'Servicio'}
                      </h4>
                      <p className="text-[11px] text-[#5C5852] font-mono tabular-nums">
                        {activeSelectedService?.durationMinutes} min de duración
                      </p>
                    </div>
                  </div>
                  <span className="font-mono tabular-nums font-bold text-[#9A6B3B] text-base">
                    {formatCurrency(activeSelectedService?.price || 0)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[#5C5852] block text-[10px] uppercase font-semibold tracking-wider">Fecha</span>
                    <span className="text-[#161514] font-bold mt-0.5 block">
                      {formatDateSpanish(selectedDate)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#5C5852] block text-[10px] uppercase font-semibold tracking-wider">Horario</span>
                    <span className="text-[#161514] font-mono tabular-nums font-bold mt-0.5 block">
                      {selectedTimeSlot ? formatTime12h(selectedTimeSlot) : 'No seleccionado'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#5C5852] block text-[10px] uppercase font-semibold tracking-wider">Barbero</span>
                    <span className="text-[#9A6B3B] font-bold mt-0.5 block">
                      {activeBarber.displayName} (Tú)
                    </span>
                  </div>

                  <div>
                    <span className="text-[#5C5852] block text-[10px] uppercase font-semibold tracking-wider">Cliente</span>
                    <span className="text-[#161514] font-bold mt-0.5 block">
                      {clientType === 'registered'
                        ? selectedClient?.name || 'No seleccionado'
                        : walkinName || 'Cliente en Tienda'}
                    </span>
                  </div>
                </div>

                {appointmentNotes && (
                  <p className="text-[11px] text-[#5C5852] bg-[#FAF9F6] border border-[#E6E1D6] p-2 rounded-xl">
                    <strong className="text-[#161514]">Nota:</strong> {appointmentNotes}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Navigation */}
        <div className="p-3.5 sm:p-4 border-t border-[#E6E1D6] bg-white flex items-center justify-between gap-2">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
              className="px-4 py-2 rounded-xl bg-[#F2EFE9] hover:bg-[#E8E3D9] border border-[#D2CBBF] text-[#161514] text-xs font-semibold transition-colors"
            >
              Atrás
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#F2EFE9] hover:bg-[#E8E3D9] border border-[#D2CBBF] text-[#161514] text-xs font-semibold transition-colors"
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
              className="px-5 py-2 rounded-xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] font-semibold text-xs shadow-xs transition-all flex items-center gap-1"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirmBooking}
              disabled={isSubmitting || !selectedTimeSlot}
              className="px-6 py-2.5 rounded-xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] font-semibold text-xs shadow-sm active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4 text-[#C69765]" />
              <span>{isSubmitting ? 'Agendando...' : 'Confirmar y Agendar'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
