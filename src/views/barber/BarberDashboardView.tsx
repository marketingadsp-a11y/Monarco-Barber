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
  Package,
  ShoppingBag,
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
import { BarberPosView } from '../../components/pos/BarberPosView';
import { BarberProductsSection } from '../../components/products/BarberProductsSection';
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

  // Find logged in barber record with safe fallback
  const normalizePhone10 = (val?: string) => {
    if (!val) return '';
    const d = val.replace(/\D/g, '');
    return d.startsWith('52') && d.length === 12 ? d.substring(2) : d;
  };
  const userPhone10 = normalizePhone10(userProfile?.phone);

  const activeBarber: Barber =
    barbers.find(
      (b) =>
        b.id === currentBarberId ||
        (b.userId && userProfile?.id && b.userId === userProfile.id) ||
        (b.accessCode &&
          userProfile?.clientNumber &&
          b.accessCode.trim().toLowerCase() === userProfile.clientNumber.trim().toLowerCase()) ||
        (userPhone10.length === 10 && normalizePhone10(b.phone) === userPhone10) ||
        (b.phone && userProfile?.phone && b.phone === userProfile.phone) ||
        b.displayName.toLowerCase() === userProfile?.name?.toLowerCase()
    ) ||
    barbers[0] || {
      id: currentBarberId || 'barber_1',
      displayName: userProfile?.name || 'Barbero Monarca',
      firstName: (userProfile?.name || 'Barbero').split(' ')[0],
      lastName: (userProfile?.name || '').split(' ').slice(1).join(' '),
      email: userProfile?.email || 'barbero@monarcabarber.com',
      phone: userProfile?.phone || '',
      bio: 'Barbero profesional en Monarca Barber.',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      gallery: [],
      specialties: ['Corte Clásico', 'Barba'],
      serviceIds: [],
      active: true,
      rating: 5.0,
      reviewCount: 0,
      experienceYears: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

  // Tab State
  const [internalTab, setInternalTab] = useState<'home' | 'appointments' | 'services' | 'schedule' | 'profile' | 'pos' | 'products'>('home');
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
  const [preselectedClientForPos, setPreselectedClientForPos] = useState<UserProfile | null>(null);

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
      <div className="p-8 text-center text-[#5C5852] space-y-3 bg-white border border-[#E6E1D6] rounded-3xl">
        <p className="text-sm font-medium">No se encontró el perfil de barbero asignado a tu cuenta.</p>
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
      <div className="rounded-3xl bg-white border border-[#E6E1D6] p-5 shadow-[0_6px_24px_-12px_rgba(22,21,20,0.08)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <img
            src={activeBarber.photoUrl}
            alt={activeBarber.displayName}
            className="w-16 h-16 rounded-2xl object-cover border border-[#9A6B3B]/60 shadow-sm shrink-0"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-[#161514] uppercase tracking-wide">
                {activeBarber.displayName}
              </h1>
            </div>
            <p className="text-xs text-[#5C5852] mt-0.5">
              {activeBarber.specialties.slice(0, 3).join(' · ')}
            </p>
          </div>
        </div>

        {/* Action Buttons: Scanner, POS & Booking */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsQrScannerOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl bg-[#F2EFE9] hover:bg-[#E8E3D9] border border-[#D2CBBF] text-[#161514] font-semibold text-xs active:scale-95 transition-all"
            title="Escanear QR de cliente"
          >
            <ScanLine className="w-4 h-4 text-[#9A6B3B]" />
            <span>Lector QR</span>
          </button>

          <button
            onClick={() => setCurrentTab('pos')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl border text-xs font-semibold active:scale-95 transition-all ${
              currentTab === 'pos'
                ? 'bg-[#9A6B3B] text-white border-[#9A6B3B] font-bold shadow-sm'
                : 'bg-white border-[#D2CBBF] text-[#161514] hover:bg-[#FAF7F0] hover:border-[#9A6B3B]/50'
            }`}
            title="Abrir terminal de punto de venta POS"
          >
            <ShoppingBag className={`w-4 h-4 ${currentTab === 'pos' ? 'text-white' : 'text-[#9A6B3B]'}`} />
            <span>Punto de Venta POS</span>
          </button>

          <button
            onClick={() => {
              setPreselectedClientForBooking(null);
              setIsBookingModalOpen(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] font-semibold text-xs shadow-sm active:scale-95 transition-all"
            title="Agendar cita para mi silla"
          >
            <Plus className="w-4 h-4 text-[#C69765]" />
            <span>Agendar Cita</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#F2EFE9] border border-[#E6E1D6] overflow-x-auto">
        <button
          onClick={() => setCurrentTab('home')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            currentTab === 'home'
              ? 'bg-[#161514] text-[#FAF9F6] shadow-xs'
              : 'text-[#5C5852] hover:text-[#161514]'
          }`}
        >
          Resumen Hoy
        </button>
        <button
          onClick={() => setCurrentTab('appointments')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            currentTab === 'appointments'
              ? 'bg-[#161514] text-[#FAF9F6] shadow-xs'
              : 'text-[#5C5852] hover:text-[#161514]'
          }`}
        >
          Mis Citas ({barberAppointments.length})
        </button>
        <button
          onClick={() => setCurrentTab('pos')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            currentTab === 'pos'
              ? 'bg-[#161514] text-[#FAF9F6] shadow-xs'
              : 'text-[#5C5852] hover:text-[#161514]'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Mi POS</span>
        </button>
        <button
          onClick={() => setCurrentTab('products')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            currentTab === 'products'
              ? 'bg-[#161514] text-[#FAF9F6] shadow-xs'
              : 'text-[#5C5852] hover:text-[#161514]'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Catálogo Productos</span>
        </button>
        <button
          onClick={() => setCurrentTab('profile')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            currentTab === 'profile'
              ? 'bg-[#161514] text-[#FAF9F6] shadow-xs'
              : 'text-[#5C5852] hover:text-[#161514]'
          }`}
        >
          Mi Perfil & Foto
        </button>
        <button
          onClick={() => setCurrentTab('services')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            currentTab === 'services'
              ? 'bg-[#161514] text-[#FAF9F6] shadow-xs'
              : 'text-[#5C5852] hover:text-[#161514]'
          }`}
        >
          Mis Servicios ({activeBarber.serviceIds?.length || 0})
        </button>
        <button
          onClick={() => setCurrentTab('schedule')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            currentTab === 'schedule'
              ? 'bg-[#161514] text-[#FAF9F6] shadow-xs'
              : 'text-[#5C5852] hover:text-[#161514]'
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
              className="px-2.5 py-1 rounded-xl bg-[#FBF6EE] hover:bg-[#F5EBD9] border border-[#9A6B3B]/35 text-[#7D542B] text-[11px] font-semibold flex items-center gap-1.5 transition-all"
              title="Habilitar notificaciones en tiempo real en este dispositivo"
            >
              <Bell className="w-3 h-3 text-[#9A6B3B]" />
              <span>Activar Alertas</span>
            </button>
          ) : (
            <button
              onClick={() => testNotification('barber_new_booking')}
              className="px-2.5 py-1 rounded-xl bg-white hover:bg-[#FAF7F0] border border-[#E6E1D6] text-[#5C5852] hover:text-[#161514] text-[11px] font-semibold flex items-center gap-1.5 transition-all"
              title="Probar sonido y toast de nueva reserva"
            >
              <Volume2 className="w-3 h-3 text-[#9A6B3B]" />
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
            <div className="p-4 rounded-2xl bg-white border border-[#E6E1D6] shadow-xs">
              <span className="text-[#5C5852] block text-[10px] uppercase font-semibold tracking-wider">Citas Hoy</span>
              <span className="font-mono tabular-nums text-xl font-bold text-[#161514] mt-1 block">{todayAppointments.length}</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#E6E1D6] shadow-xs">
              <span className="text-[#5C5852] block text-[10px] uppercase font-semibold tracking-wider">Completadas</span>
              <span className="font-mono tabular-nums text-xl font-bold text-emerald-700 mt-1 block">{completedToday.length}</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#E6E1D6] shadow-xs">
              <span className="text-[#5C5852] block text-[10px] uppercase font-semibold tracking-wider">Ingresos Hoy</span>
              <span className="font-mono tabular-nums text-xl font-bold text-[#9A6B3B] mt-1 block">{formatCurrency(totalRevenueToday)}</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#E6E1D6] shadow-xs">
              <span className="text-[#5C5852] block text-[10px] uppercase font-semibold tracking-wider">Calificación</span>
              <span className="font-mono tabular-nums text-xl font-bold text-[#161514] mt-1 block">
                <span className="text-[#9A6B3B]">★</span> {activeBarber.rating.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Today's Appointments List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#5C5852]">
                Agenda de Hoy ({todayAppointments.length} citas)
              </h3>
              <button
                onClick={() => setCurrentTab('appointments')}
                className="text-xs font-semibold text-[#9A6B3B] hover:text-[#7D542B] hover:underline"
              >
                Ver Todas Mis Citas &rarr;
              </button>
            </div>

            {todayAppointments.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white border border-[#E6E1D6] text-center space-y-3">
                <p className="text-[#5C5852] text-xs">No tienes citas programadas para hoy.</p>
                <button
                  onClick={() => setIsBookingModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] font-semibold text-xs shadow-xs transition-all"
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
                    className={`p-4 rounded-2xl border transition-all shadow-xs space-y-2.5 ${
                      isConfirmed
                        ? 'bg-white border-[#9A6B3B]/45'
                        : isCompleted
                        ? 'bg-white border-emerald-200'
                        : 'bg-[#F7F5F0] border-[#E6E1D6] opacity-75'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono tabular-nums font-bold text-[#9A6B3B] text-sm">
                            {formatTime12h(app.startTime)} - {formatTime12h(app.endTime)}
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
                            {app.status}
                          </span>
                        </div>
                        <h4 className="font-bold text-[#161514] text-base mt-1">
                          {app.serviceNameSnapshot}
                        </h4>
                        <p className="text-xs text-[#5C5852]">
                          Cliente: <strong className="text-[#161514]">{app.clientName}</strong> ({app.clientPhone || 'Sin teléfono'})
                        </p>
                      </div>

                      <span className="font-mono tabular-nums font-bold text-[#161514] text-base">
                        {formatCurrency(app.servicePriceSnapshot)}
                      </span>
                    </div>

                    {isConfirmed && (
                      <div className="pt-2 border-t border-[#E6E1D6] flex items-center gap-2">
                        <button
                          onClick={() => {
                            updateAppointmentStatus(app.id, 'completed');
                            showToast('success', 'Cita Completada', `Has completado el servicio con ${app.clientName}.`);
                          }}
                          className="flex-1 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Completar Cita</span>
                        </button>
                        <button
                          onClick={() => updateAppointmentStatus(app.id, 'no_show')}
                          className="px-3 py-2 rounded-xl bg-[#F2EFE9] hover:bg-[#E8E3D9] border border-[#D2CBBF] text-[#5C5852] hover:text-[#161514] text-xs font-semibold transition-colors"
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#E6E1D6] p-4 rounded-3xl shadow-xs">
            <div>
              <h3 className="font-display text-lg font-bold text-[#161514] uppercase tracking-wide">Servicios en Mi Perfil</h3>
              <p className="text-xs text-[#5C5852]">
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
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] text-xs font-semibold shadow-sm active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 text-[#C69765]" />
              <span>Crear Mi Servicio Personalizado</span>
            </button>
          </div>

          {/* Custom Services */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#9A6B3B] px-1">
              Servicios Exclusivos Creados por Ti ({myCustomServices.length})
            </h4>

            {myCustomServices.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white border border-[#E6E1D6] text-center text-xs text-[#5C5852]">
                Aún no has creado servicios personalizados. Presiona <strong>"Crear Mi Servicio Personalizado"</strong> para agregar tus paquetes exclusivos.
              </div>
            ) : (
              <div className="grid gap-3">
                {myCustomServices.map((service) => (
                  <div
                    key={service.id}
                    className="rounded-2xl bg-white border border-[#9A6B3B]/40 p-4 flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img
                        src={service.imageUrl || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80'}
                        alt={service.name}
                        className="w-14 h-14 rounded-xl object-cover border border-[#E6E1D6] shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-[#161514] text-sm truncate">{service.name}</h4>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#FBF6EE] text-[#7D542B] border border-[#9A6B3B]/30 uppercase">
                            Exclusivo
                          </span>
                        </div>
                        <p className="text-xs text-[#5C5852] mt-0.5 font-mono tabular-nums">
                          {service.durationMinutes} min · <strong className="text-[#9A6B3B]">{formatCurrency(service.price)}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => toggleServiceActive(service.id, !service.active)}
                        className="p-2 rounded-xl bg-[#F2EFE9] hover:bg-[#E8E3D9] text-[#5C5852]"
                        title={service.active ? 'Desactivar' : 'Activar'}
                      >
                        {service.active ? <ToggleRight className="w-5 h-5 text-emerald-700" /> : <ToggleLeft className="w-5 h-5 text-[#8E887E]" />}
                      </button>
                      <button
                        onClick={() => setEditingCustomService(service)}
                        className="p-2 rounded-xl bg-[#F2EFE9] hover:bg-[#E8E3D9] text-[#161514]"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteService(service.id)}
                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
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
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#5C5852] px-1">
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
                        ? 'bg-[#FAF7F0] border-[#161514] shadow-xs'
                        : 'bg-white border-[#E6E1D6] opacity-75 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={service.imageUrl || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80'}
                        alt={service.name}
                        className="w-12 h-12 rounded-xl object-cover border border-[#E6E1D6] shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <h4 className="font-bold text-[#161514] text-xs">{service.name}</h4>
                        <p className="text-[11px] text-[#5C5852] font-mono tabular-nums">
                          {service.durationMinutes} min · {formatCurrency(service.price)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-semibold ${isOffered ? 'text-[#9A6B3B]' : 'text-[#8E887E]'}`}>
                        {isOffered ? 'En mi menú' : 'No ofrecido'}
                      </span>
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${
                          isOffered
                            ? 'bg-[#161514] border-[#161514] text-[#FAF9F6]'
                            : 'border-[#D2CBBF] bg-white'
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
          <div className="rounded-3xl bg-white border border-[#E6E1D6] p-5 space-y-4 shadow-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#9A6B3B]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#161514]">
                Bloquear Horario o Descanso
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-[#5C5852] font-semibold block mb-1">Fecha</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] focus:outline-none focus:border-[#161514]"
                />
              </div>
              <div>
                <label className="text-[#5C5852] font-semibold block mb-1">Hora Inicio</label>
                <input
                  type="time"
                  value={blockStart}
                  onChange={(e) => setBlockStart(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] focus:outline-none focus:border-[#161514]"
                />
              </div>
              <div>
                <label className="text-[#5C5852] font-semibold block mb-1">Hora Fin</label>
                <input
                  type="time"
                  value={blockEnd}
                  onChange={(e) => setBlockEnd(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] focus:outline-none focus:border-[#161514]"
                />
              </div>
              <div>
                <label className="text-[#5C5852] font-semibold block mb-1">Motivo</label>
                <input
                  type="text"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Ej. Comida / Descanso"
                  className="w-full p-2.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] placeholder:text-[#8E887E] focus:outline-none focus:border-[#161514]"
                />
              </div>
            </div>

            <button
              onClick={handleCreateBlockedSlot}
              disabled={isAddingBlock}
              className="w-full py-2.5 rounded-xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] font-semibold text-xs shadow-xs transition-all disabled:opacity-50"
            >
              {isAddingBlock ? 'Bloqueando...' : 'Aplicar Bloqueo de Horario'}
            </button>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#5C5852] px-1">
              Bloqueos de Horario para {formatDateSpanish(selectedDate)}
            </h4>
            {dateBlockedSlots.length === 0 ? (
              <div className="p-4 rounded-2xl bg-white border border-[#E6E1D6] text-center text-xs text-[#5C5852]">
                No hay bloqueos activos para esta fecha.
              </div>
            ) : (
              dateBlockedSlots.map((block) => (
                <div
                  key={block.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs"
                >
                  <div>
                    <span className="font-mono tabular-nums font-bold text-[#161514]">
                      {formatTime12h(block.startTime)} - {formatTime12h(block.endTime)}
                    </span>
                    <p className="text-[#5C5852] text-[11px]">{block.reason || 'Sin motivo'}</p>
                  </div>
                  <button
                    onClick={() => deleteBlockedSlot(block.id)}
                    className="p-1.5 rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* VIEW 6: BARBER POS (PUNTO DE VENTA) */}
      {currentTab === 'pos' && (
        <BarberPosView
          initialCustomer={preselectedClientForPos}
          onClearInitialCustomer={() => setPreselectedClientForPos(null)}
          onOpenNewProductModal={() => setCurrentTab('products')}
        />
      )}

      {/* VIEW 7: GENERAL PRODUCTS CATALOG */}
      {currentTab === 'products' && (
        <BarberProductsSection onGoToPos={() => setCurrentTab('pos')} />
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
        onOpenPosForClient={(scannedClient) => {
          setPreselectedClientForPos(scannedClient);
          setIsQrScannerOpen(false);
          if (onCloseExternalScanner) onCloseExternalScanner();
          setCurrentTab('pos');
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
