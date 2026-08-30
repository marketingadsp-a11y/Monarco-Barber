import React, { useState, useEffect } from 'react';
import {
  Scissors,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  User,
  Sparkles,
  Phone,
  Image as ImageIcon,
  DollarSign,
  Edit2,
  Check,
  ToggleLeft,
  ToggleRight,
  LogOut,
  QrCode,
  ScanLine,
  Bell,
  Volume2,
} from 'lucide-react';
import { useBarbershop } from '../../contexts/BarbershopContext';
import { useAuth } from '../../contexts/AuthContext';
import { Barber, Appointment, Service, UserProfile } from '../../types';
import {
  formatDateSpanish,
  formatTime12h,
  formatCurrency,
  getTodayDateString,
} from '../../utils/dateTime';
import { BarberQRScannerModal } from '../../components/barber/BarberQRScannerModal';
import { BarberBookAppointmentModal } from '../../components/barber/BarberBookAppointmentModal';
import { BarberMyAppointmentsView } from './BarberMyAppointmentsView';
import { BarberProfileView } from './BarberProfileView';
import { getBrowserNotificationPermission, isBrowserNotificationSupported } from '../../services/notificationService';

interface BarberDashboardViewProps {
  externalTab?: string;
  onNavigateTab?: (tab: string) => void;
  isExternalScannerOpen?: boolean;
  onCloseExternalScanner?: () => void;
}

export const BarberDashboardView: React.FC<BarberDashboardViewProps> = ({
  externalTab,
  onNavigateTab,
  isExternalScannerOpen,
  onCloseExternalScanner,
}) => {
  const { currentBarberId, userProfile, logout } = useAuth();
  const {
    barbers,
    services,
    appointments,
    blockedSlots,
    updateAppointmentStatus,
    saveBarber,
    addBlockedSlot,
    deleteBlockedSlot,
    saveService,
    deleteService,
    toggleServiceActive,
    requestBrowserNotifications,
    testNotification,
    showToast,
  } = useBarbershop();

  const [browserPerm, setBrowserPerm] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (isBrowserNotificationSupported()) {
      setBrowserPerm(getBrowserNotificationPermission());
    }
  }, []);

  // Find logged in barber record
  const activeBarber =
    barbers.find(
      (b) =>
        b.id === currentBarberId ||
        b.userId === userProfile?.id ||
        b.phone === userProfile?.phone ||
        b.displayName.toLowerCase() === userProfile?.name?.toLowerCase()
    ) || barbers[0];

  // Tab State
  const [internalTab, setInternalTab] = useState<'home' | 'appointments' | 'services' | 'schedule' | 'profile'>('home');
  const currentTab = (externalTab as any) || internalTab;

  const setCurrentTab = (tab: any) => {
    if (onNavigateTab) {
      onNavigateTab(tab);
    }
    setInternalTab(tab);
  };

  // Modals State
  const [isQrScannerOpen, setIsQrScannerOpen] = useState<boolean>(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);
  const [preselectedClientForBooking, setPreselectedClientForBooking] = useState<UserProfile | null>(null);

  React.useEffect(() => {
    if (externalTab === 'book') {
      setIsBookingModalOpen(true);
    }
  }, [externalTab]);

  // Block Slot Form State
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [blockStart, setBlockStart] = useState('14:00');
  const [blockEnd, setBlockEnd] = useState('15:00');
  const [blockReason, setBlockReason] = useState('Comida / Descanso');
  const [isAddingBlock, setIsAddingBlock] = useState(false);

  // Custom Service Modal State
  const [editingCustomService, setEditingCustomService] = useState<Partial<Service> | null>(null);
  const [isSavingCustomService, setIsSavingCustomService] = useState(false);

  if (!activeBarber) {
    return (
      <div className="p-8 text-center text-slate-400 space-y-3">
        <p>No se encontró el perfil de barbero asignado a tu cuenta.</p>
      </div>
    );
  }

  // Filter barber appointments for Today
  const todayStr = getTodayDateString();
  const barberAppointments = appointments.filter((a) => a.barberId === activeBarber.id);
  const todayAppointments = barberAppointments.filter((a) => a.date === todayStr);
  const completedToday = todayAppointments.filter((a) => a.status === 'completed');
  const pendingToday = todayAppointments.filter((a) => a.status === 'confirmed' || a.status === 'pending');
  const totalRevenueToday = completedToday.reduce((sum, a) => sum + (a.servicePriceSnapshot || 0), 0);

  // Blocked slots for this barber on selected date
  const dateBlockedSlots = blockedSlots.filter(
    (b) => b.barberId === activeBarber.id && b.date === selectedDate
  );

  // Global vs Custom services
  const globalServices = services.filter((s) => !s.barberId || s.createdByType === 'admin');
  const myCustomServices = services.filter((s) => s.barberId === activeBarber.id);

  const handleCreateBlockedSlot = async () => {
    setIsAddingBlock(true);
    try {
      await addBlockedSlot({
        barberId: activeBarber.id,
        date: selectedDate,
        startTime: blockStart,
        endTime: blockEnd,
        reason: blockReason,
      });
      showToast('success', 'Horario Bloqueado', 'El horario ha sido reservado para tu descanso.');
    } catch (err: any) {
      showToast('error', 'Error al bloquear', err.message);
    } finally {
      setIsAddingBlock(false);
    }
  };

  const handleToggleGlobalService = async (serviceId: string) => {
    const currentServiceIds = activeBarber.serviceIds || [];
    let updatedServiceIds: string[];

    if (currentServiceIds.includes(serviceId)) {
      updatedServiceIds = currentServiceIds.filter((id) => id !== serviceId);
      showToast('info', 'Servicio Desactivado', 'Ya no ofreces este servicio en tu perfil.');
    } else {
      updatedServiceIds = [...currentServiceIds, serviceId];
      showToast('success', 'Servicio Añadido', 'Has agregado este servicio a tu menú.');
    }

    try {
      await saveBarber({
        ...activeBarber,
        serviceIds: updatedServiceIds,
      });
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    }
  };

  const handleSaveCustomService = async () => {
    if (!editingCustomService?.name || !editingCustomService?.price || !editingCustomService?.durationMinutes) {
      showToast('error', 'Campos requeridos', 'Ingresa nombre, precio y duración.');
      return;
    }

    setIsSavingCustomService(true);
    try {
      const savedId = await saveService({
        ...editingCustomService,
        barberId: activeBarber.id,
        createdByType: 'barber',
        active: editingCustomService.active !== undefined ? editingCustomService.active : true,
      });

      if (savedId && !activeBarber.serviceIds?.includes(savedId)) {
        await saveBarber({
          ...activeBarber,
          serviceIds: [...(activeBarber.serviceIds || []), savedId],
        });
      }

      setEditingCustomService(null);
      showToast('success', 'Servicio Guardado', 'Tu servicio exclusivo fue publicado.');
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    } finally {
      setIsSavingCustomService(false);
    }
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Barber Header Card with Fast Action Buttons */}
      <div className="rounded-3xl bg-gradient-to-r from-[#181D26] to-[#12151B] border border-white/15 p-5 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <img
            src={activeBarber.photoUrl}
            alt={activeBarber.displayName}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-[#D4AF37] shadow-lg shrink-0"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">
                {activeBarber.displayName}
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-[#D4AF37] border border-[#D4AF37]/30">
                PANEL BARBERO
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {activeBarber.specialties.slice(0, 3).join(' • ')}
            </p>
          </div>
        </div>

        {/* Action Buttons: Scanner & Booking */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsQrScannerOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-b from-[#222834] to-[#141820] hover:from-[#2a3240] hover:to-[#1a1f2a] border border-[#D4AF37]/50 text-white font-bold text-xs shadow-lg hover:scale-105 active:scale-95 transition-all"
            title="Escanear QR de cliente"
          >
            <ScanLine className="w-4 h-4 text-[#D4AF37]" />
            <span>Lector QR</span>
          </button>

          <button
            onClick={() => {
              setPreselectedClientForBooking(null);
              setIsBookingModalOpen(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 font-bold text-xs shadow-lg hover:scale-105 active:scale-95 transition-all"
            title="Agendar cita para mi silla"
          >
            <Plus className="w-4 h-4" />
            <span>Agendar Cita</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/10 overflow-x-auto">
        <button
          onClick={() => setCurrentTab('home')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            currentTab === 'home'
              ? 'bg-[#D4AF37] text-slate-950 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Resumen Hoy
        </button>
        <button
          onClick={() => setCurrentTab('appointments')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            currentTab === 'appointments'
              ? 'bg-[#D4AF37] text-slate-950 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Mis Citas ({barberAppointments.length})
        </button>
        <button
          onClick={() => setCurrentTab('profile')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            currentTab === 'profile'
              ? 'bg-[#D4AF37] text-slate-950 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Mi Perfil & Foto
        </button>
        <button
          onClick={() => setCurrentTab('services')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            currentTab === 'services'
              ? 'bg-[#D4AF37] text-slate-950 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Mis Servicios ({activeBarber.serviceIds?.length || 0})
        </button>
        <button
          onClick={() => setCurrentTab('schedule')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            currentTab === 'schedule'
              ? 'bg-[#D4AF37] text-slate-950 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Horarios & Descansos
        </button>

        <div className="ml-auto flex items-center gap-1.5 shrink-0 pl-2">
          {browserPerm !== 'granted' ? (
            <button
              onClick={async () => {
                const res = await requestBrowserNotifications();
                setBrowserPerm(res);
              }}
              className="px-2.5 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-bold flex items-center gap-1.5 transition-all"
              title="Habilitar notificaciones en tiempo real en este dispositivo"
            >
              <Bell className="w-3 h-3 animate-bounce" />
              <span>Activar Alertas</span>
            </button>
          ) : (
            <button
              onClick={() => testNotification('barber_new_booking')}
              className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center gap-1.5 transition-all"
              title="Probar sonido y toast de nueva reserva"
            >
              <Volume2 className="w-3 h-3 text-[#D4AF37]" />
              <span>Probar Alerta</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: HOME / DAILY SUMMARY */}
      {currentTab === 'home' && (
        <div className="space-y-5">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-[#14171E] border border-white/10 shadow-lg">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Citas Hoy</span>
              <span className="text-xl font-black text-white mt-1 block">{todayAppointments.length}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#14171E] border border-white/10 shadow-lg">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Completadas</span>
              <span className="text-xl font-black text-emerald-400 mt-1 block">{completedToday.length}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#14171E] border border-white/10 shadow-lg">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Ingresos Hoy</span>
              <span className="text-xl font-black text-[#D4AF37] mt-1 block">{formatCurrency(totalRevenueToday)}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#14171E] border border-white/10 shadow-lg">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Calificación</span>
              <span className="text-xl font-black text-amber-400 mt-1 block">★ {activeBarber.rating.toFixed(2)}</span>
            </div>
          </div>

          {/* Quick Shortcuts Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              onClick={() => setIsQrScannerOpen(true)}
              className="p-4 rounded-2xl bg-gradient-to-br from-[#181D26] to-[#12151B] border border-[#D4AF37]/40 hover:border-[#D4AF37] cursor-pointer shadow-lg transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center">
                  <ScanLine className="w-6 h-6 stroke-[2.4]" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm group-hover:text-[#D4AF37] transition-colors">
                    Lector de Códigos QR
                  </h3>
                  <p className="text-slate-400 text-xs">
                    Escanea el pase del cliente para registrar visita y sumar puntos
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-[#D4AF37] shrink-0">Abrir &rarr;</span>
            </div>

            <div
              onClick={() => {
                setPreselectedClientForBooking(null);
                setIsBookingModalOpen(true);
              }}
              className="p-4 rounded-2xl bg-gradient-to-br from-[#181D26] to-[#12151B] border border-white/15 hover:border-[#D4AF37] cursor-pointer shadow-lg transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#D4AF37] text-slate-950 flex items-center justify-center">
                  <Plus className="w-6 h-6 stroke-[3]" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm group-hover:text-[#D4AF37] transition-colors">
                    Agendar en Mi Silla
                  </h3>
                  <p className="text-slate-400 text-xs">
                    Programa un servicio para un cliente con tu disponibilidad
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-[#D4AF37] shrink-0">Agendar &rarr;</span>
            </div>
          </div>

          {/* Today's Appointments List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Agenda de Hoy ({todayAppointments.length} citas)
              </h3>
              <button
                onClick={() => setCurrentTab('appointments')}
                className="text-xs font-bold text-[#D4AF37] hover:underline"
              >
                Ver Todas Mis Citas &rarr;
              </button>
            </div>

            {todayAppointments.length === 0 ? (
              <div className="p-8 rounded-3xl bg-[#14171E] border border-white/10 text-center space-y-2">
                <p className="text-slate-400 text-xs">No tienes citas programadas para hoy.</p>
                <button
                  onClick={() => setIsBookingModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[#D4AF37] text-slate-950 font-bold text-xs shadow hover:scale-105 transition-all"
                >
                  Agendar una Cita
                </button>
              </div>
            ) : (
              todayAppointments.map((app) => {
                const isConfirmed = app.status === 'confirmed' || app.status === 'pending';
                const isCompleted = app.status === 'completed';

                return (
                  <div
                    key={app.id}
                    className={`p-4 rounded-2xl border transition-all shadow space-y-2.5 ${
                      isConfirmed
                        ? 'bg-[#14171E] border-[#D4AF37]/30'
                        : isCompleted
                        ? 'bg-[#12151B] border-emerald-500/20'
                        : 'bg-[#101217] border-white/5 opacity-70'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#D4AF37] text-sm">
                            {formatTime12h(app.startTime)} - {formatTime12h(app.endTime)}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              isConfirmed
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : isCompleted
                                ? 'bg-blue-500/20 text-blue-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {app.status}
                          </span>
                        </div>
                        <h4 className="font-bold text-white text-base mt-1">
                          {app.serviceNameSnapshot}
                        </h4>
                        <p className="text-xs text-slate-300">
                          Cliente: <strong className="text-white">{app.clientName}</strong> ({app.clientPhone || 'Sin teléfono'})
                        </p>
                      </div>

                      <span className="font-black text-[#D4AF37] text-base">
                        {formatCurrency(app.servicePriceSnapshot)}
                      </span>
                    </div>

                    {isConfirmed && (
                      <div className="pt-2 border-t border-white/10 flex items-center gap-2">
                        <button
                          onClick={() => {
                            updateAppointmentStatus(app.id, 'completed');
                            showToast('success', 'Cita Completada', `Has completado el servicio con ${app.clientName}.`);
                          }}
                          className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Completar Cita</span>
                        </button>
                        <button
                          onClick={() => updateAppointmentStatus(app.id, 'no_show')}
                          className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold"
                        >
                          No Asistió
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: MIS CITAS COMPLETO */}
      {currentTab === 'appointments' && (
        <BarberMyAppointmentsView
          activeBarber={activeBarber}
          onOpenBookingModal={() => {
            setPreselectedClientForBooking(null);
            setIsBookingModalOpen(true);
          }}
          onOpenQrScanner={() => setIsQrScannerOpen(true)}
        />
      )}

      {/* VIEW 3: PERFIL & FOTO */}
      {currentTab === 'profile' && <BarberProfileView activeBarber={activeBarber} />}

      {/* VIEW 4: SERVICES MANAGEMENT */}
      {currentTab === 'services' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#14171E] border border-white/10 p-4 rounded-3xl">
            <div>
              <h3 className="text-base font-bold text-white">Servicios en Mi Perfil</h3>
              <p className="text-xs text-slate-400">
                Gestiona los servicios oficiales y exclusivos que ofreces a los clientes
              </p>
            </div>

            <button
              onClick={() =>
                setEditingCustomService({
                  name: '',
                  price: 250,
                  durationMinutes: 45,
                  description: '',
                  imageUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80',
                  active: true,
                  barberId: activeBarber.id,
                  createdByType: 'barber',
                })
              }
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 text-xs font-bold shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Mi Servicio Personalizado</span>
            </button>
          </div>

          {/* Custom Services */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] px-1">
              Servicios Exclusivos Creados por Ti ({myCustomServices.length})
            </h4>

            {myCustomServices.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#14171E] border border-white/10 text-center text-xs text-slate-400">
                Aún no has creado servicios personalizados. Presiona <strong>"Crear Mi Servicio Personalizado"</strong> para agregar tus paquetes exclusivos.
              </div>
            ) : (
              <div className="grid gap-3">
                {myCustomServices.map((service) => (
                  <div
                    key={service.id}
                    className="rounded-2xl bg-[#14171E] border border-[#D4AF37]/30 p-4 flex items-center justify-between gap-3 shadow-lg"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img
                        src={service.imageUrl || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80'}
                        alt={service.name}
                        className="w-14 h-14 rounded-xl object-cover border border-[#D4AF37]/50 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-sm truncate">{service.name}</h4>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#D4AF37]/20 text-[#D4AF37]">
                            Exclusivo
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {service.durationMinutes} min • <strong className="text-[#D4AF37]">{formatCurrency(service.price)}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => toggleServiceActive(service.id, !service.active)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300"
                        title={service.active ? 'Desactivar' : 'Activar'}
                      >
                        {service.active ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-slate-500" />}
                      </button>
                      <button
                        onClick={() => setEditingCustomService(service)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteService(service.id)}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Global Services checklist */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 px-1">
              Servicios Oficiales de la Barbería (Activa los que ofreces)
            </h4>

            <div className="grid gap-2.5">
              {globalServices.map((service) => {
                const isOffered = (activeBarber.serviceIds || []).includes(service.id);
                return (
                  <div
                    key={service.id}
                    onClick={() => handleToggleGlobalService(service.id)}
                    className={`rounded-2xl border p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                      isOffered
                        ? 'bg-[#14171E] border-[#D4AF37] shadow-lg shadow-[#D4AF37]/5'
                        : 'bg-[#101217] border-white/5 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={service.imageUrl || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80'}
                        alt={service.name}
                        className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <h4 className="font-bold text-white text-xs">{service.name}</h4>
                        <p className="text-[11px] text-slate-400">
                          {service.durationMinutes} min • {formatCurrency(service.price)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-semibold ${isOffered ? 'text-[#D4AF37]' : 'text-slate-500'}`}>
                        {isOffered ? 'En mi menú' : 'No ofrecido'}
                      </span>
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${
                          isOffered
                            ? 'bg-[#D4AF37] border-[#D4AF37] text-slate-950'
                            : 'border-white/20 bg-transparent'
                        }`}
                      >
                        {isOffered && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 5: SCHEDULE & BLOCKED SLOTS */}
      {currentTab === 'schedule' && (
        <div className="space-y-5">
          <div className="rounded-3xl bg-[#14171E] border border-white/10 p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#D4AF37]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Bloquear Horario o Descanso
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Fecha</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Hora Inicio</label>
                <input
                  type="time"
                  value={blockStart}
                  onChange={(e) => setBlockStart(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Hora Fin</label>
                <input
                  type="time"
                  value={blockEnd}
                  onChange={(e) => setBlockEnd(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Motivo</label>
                <input
                  type="text"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Ej. Comida / Descanso"
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white"
                />
              </div>
            </div>

            <button
              onClick={handleCreateBlockedSlot}
              disabled={isAddingBlock}
              className="w-full py-2.5 rounded-xl bg-[#D4AF37] text-slate-950 font-bold text-xs shadow transition-all disabled:opacity-50"
            >
              {isAddingBlock ? 'Bloqueando...' : 'Aplicar Bloqueo de Horario'}
            </button>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
              Bloqueos de Horario para {formatDateSpanish(selectedDate)}
            </h4>
            {dateBlockedSlots.length === 0 ? (
              <div className="p-4 rounded-2xl bg-[#14171E] border border-white/10 text-center text-xs text-slate-400">
                No hay bloqueos activos para esta fecha.
              </div>
            ) : (
              dateBlockedSlots.map((block) => (
                <div
                  key={block.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs"
                >
                  <div>
                    <span className="font-bold text-white">
                      {formatTime12h(block.startTime)} - {formatTime12h(block.endTime)}
                    </span>
                    <p className="text-slate-300 text-[11px]">{block.reason || 'Sin motivo'}</p>
                  </div>
                  <button
                    onClick={() => deleteBlockedSlot(block.id)}
                    className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/40"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* QR SCANNER MODAL */}
      <BarberQRScannerModal
        isOpen={isQrScannerOpen || Boolean(isExternalScannerOpen)}
        onClose={() => {
          setIsQrScannerOpen(false);
          if (onCloseExternalScanner) onCloseExternalScanner();
        }}
        activeBarber={activeBarber}
        onBookForClient={(scannedClient) => {
          setPreselectedClientForBooking(scannedClient);
          setIsBookingModalOpen(true);
        }}
      />

      {/* DIRECT BOOKING MODAL FOR THIS BARBER */}
      <BarberBookAppointmentModal
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setPreselectedClientForBooking(null);
        }}
        activeBarber={activeBarber}
        initialClient={preselectedClientForBooking}
        onBookingSuccess={() => {
          setCurrentTab('appointments');
        }}
      />
    </div>
  );
};
