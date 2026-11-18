import React, { useState, useRef, useEffect } from 'react';
import {
  Shield,
  Users,
  Scissors,
  Calendar,
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Settings,
  Save,
  Clock,
  Sparkles,
  Search,
  Filter,
  Upload,
  Image as ImageIcon,
  Check,
  RefreshCw,
  LogOut,
  Crown,
  Layout,
  Type,
  MousePointerClick,
  RotateCcw,
  ChevronRight,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  Smartphone,
  Monitor,
  CheckCircle,
  Info,
  Radio,
  Send,
  Package,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Phone,
  Hash,
} from 'lucide-react';
import { useBarbershop } from '../../contexts/BarbershopContext';
import { useAuth } from '../../contexts/AuthContext';
import { Barber, Service, Appointment, BusinessSettings, NotificationSettings, UserProfile, WeeklySchedule } from '../../types';
import { formatCurrency, formatDateSpanish, formatTime12h, getTodayDateString, timeToMinutes } from '../../utils/dateTime';
import { imageService } from '../../services/imgbb/imageService';
import { dataService } from '../../services/firebase/dataService';
import { DEFAULT_WEEKLY_SCHEDULE } from '../../services/firebase/seedData';
import { AdminUsersSection } from '../../components/admin/AdminUsersSection';
import { AdminProductsSection } from '../../components/products/AdminProductsSection';
import { AdminMetricsSection } from '../../components/admin/AdminMetricsSection';
import { getBrowserNotificationPermission, isBrowserNotificationSupported } from '../../services/notificationService';

export const AdminDashboardView: React.FC = () => {
  const { logout } = useAuth();
  const {
    services,
    barbers,
    products,
    posSales,
    appointments,
    businessSettings,
    notificationSettings,
    saveService,
    deleteService,
    toggleServiceActive,
    saveBarber,
    saveBarberWithCredentials,
    deleteBarber,
    toggleBarberActive,
    updateAppointmentStatus,
    saveSettings,
    updateNotificationSettings,
    requestBrowserNotifications,
    testNotification,
    showToast,
  } = useBarbershop();

  const [activeSection, setActiveSection] = useState<'overview' | 'users' | 'appointments' | 'barbers' | 'services' | 'products' | 'notifications' | 'settings'>('overview');
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (isBrowserNotificationSupported()) {
      setBrowserPermission(getBrowserNotificationPermission());
    }
  }, []);

  useEffect(() => {
    const unsub = dataService.subscribeToUsers((users) => {
      setAllUsers(users);
    });
    return () => unsub();
  }, []);

  // Service Edit/Create Modal State
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);
  const [isSavingService, setIsSavingService] = useState(false);
  const [isUploadingServicePhoto, setIsUploadingServicePhoto] = useState(false);
  const servicePhotoInputRef = useRef<HTMLInputElement>(null);

  // Barber Edit/Create Modal State
  const [editingBarber, setEditingBarber] = useState<Partial<Barber> | null>(null);
  const [barberAccessCode, setBarberAccessCode] = useState('');
  const [barberAccessPhone, setBarberAccessPhone] = useState('');
  const [barberAccessPin, setBarberAccessPin] = useState('');
  const [showBarberAccessPin, setShowBarberAccessPin] = useState(false);
  const [isLoadingBarberCreds, setIsLoadingBarberCreds] = useState(false);
  const [isSavingBarber, setIsSavingBarber] = useState(false);
  const [isUploadingBarberPhoto, setIsUploadingBarberPhoto] = useState(false);
  const [isUploadingBarberGallery, setIsUploadingBarberGallery] = useState(false);
  const [barberGalleryUrlInput, setBarberGalleryUrlInput] = useState('');
  const barberPhotoInputRef = useRef<HTMLInputElement>(null);
  const barberGalleryInputRef = useRef<HTMLInputElement>(null);

  // Settings State
  const [settingsForm, setSettingsForm] = useState<BusinessSettings>(businessSettings);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (businessSettings) {
      setSettingsForm(businessSettings);
    }
  }, [businessSettings]);

  // Appointment filter
  const [appointmentFilterBarber, setAppointmentFilterBarber] = useState<string>('all');
  const [appointmentFilterStatus, setAppointmentFilterStatus] = useState<string>('all');

  // Stats
  const todayStr = getTodayDateString();
  const todayAppointments = appointments.filter((a) => a.date === todayStr);
  const completedAppointments = appointments.filter((a) => a.status === 'completed');
  const totalRevenue = completedAppointments.reduce((sum, a) => sum + (a.servicePriceSnapshot || 0), 0);

  const filteredAppointments = appointments.filter((a) => {
    if (appointmentFilterBarber !== 'all' && a.barberId !== appointmentFilterBarber) return false;
    if (appointmentFilterStatus !== 'all' && a.status !== appointmentFilterStatus) return false;
    return true;
  });

  // Upload Logo for App
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const uploadedResult = await imageService.uploadImage(file);
      const cleanUrl = typeof uploadedResult === 'string' ? uploadedResult : (uploadedResult as any)?.url || '';
      setSettingsForm((prev) => ({ ...prev, logoUrl: cleanUrl }));
      showToast('success', 'Logotipo cargado', 'El nuevo logotipo se ha subido. Recuerda guardar la configuración.');
    } catch (err: any) {
      showToast('error', 'Error al subir logotipo', err.message);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Upload Photo for Service
  const handleServicePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingServicePhoto(true);
    try {
      const uploadedResult = await imageService.uploadImage(file);
      const cleanUrl = typeof uploadedResult === 'string' ? uploadedResult : (uploadedResult as any)?.url || '';
      setEditingService((prev) => ({ ...prev, imageUrl: cleanUrl }));
      showToast('success', 'Foto de servicio subida', 'Imagen cargada correctamente.');
    } catch (err: any) {
      showToast('error', 'Error al subir foto', err.message);
    } finally {
      setIsUploadingServicePhoto(false);
    }
  };

  // Upload Photo for Barber
  const handleBarberPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingBarberPhoto(true);
    try {
      const uploadedResult = await imageService.uploadImage(file);
      const cleanUrl = typeof uploadedResult === 'string' ? uploadedResult : (uploadedResult as any)?.url || '';
      setEditingBarber((prev) => ({ ...prev, photoUrl: cleanUrl }));
      showToast('success', 'Foto de barbero subida', 'Imagen cargada correctamente.');
    } catch (err: any) {
      showToast('error', 'Error al subir foto', err.message);
    } finally {
      setIsUploadingBarberPhoto(false);
      if (barberPhotoInputRef.current) barberPhotoInputRef.current.value = '';
    }
  };

  // Upload Portfolio Gallery Photos for Barber (supports multiple files)
  const handleBarberGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    setIsUploadingBarberGallery(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const uploadedResult = await imageService.uploadImage(file);
        const cleanUrl = typeof uploadedResult === 'string' ? uploadedResult : (uploadedResult as any)?.url || '';
        if (cleanUrl) uploadedUrls.push(cleanUrl);
      }

      if (uploadedUrls.length > 0) {
        setEditingBarber((prev) =>
          prev
            ? {
                ...prev,
                gallery: [...(prev.gallery || []), ...uploadedUrls],
              }
            : prev
        );
        showToast(
          'success',
          uploadedUrls.length > 1 ? 'Fotos agregadas al portafolio' : 'Foto agregada al portafolio',
          `Se ${uploadedUrls.length > 1 ? `agregaron ${uploadedUrls.length} imágenes` : 'agregó 1 imagen'}. Recuerda guardar los cambios del barbero.`
        );
      }
    } catch (err: any) {
      showToast('error', 'Error al subir portafolio', err.message);
    } finally {
      setIsUploadingBarberGallery(false);
      if (barberGalleryInputRef.current) barberGalleryInputRef.current.value = '';
    }
  };

  const handleAddBarberGalleryUrl = () => {
    const url = barberGalleryUrlInput.trim();
    if (!url) return;
    setEditingBarber((prev) =>
      prev
        ? {
            ...prev,
            gallery: [...(prev.gallery || []), url],
          }
        : prev
    );
    setBarberGalleryUrlInput('');
  };

  const handleRemoveBarberGalleryPhoto = (indexToRemove: number) => {
    setEditingBarber((prev) =>
      prev
        ? {
            ...prev,
            gallery: (prev.gallery || []).filter((_, idx) => idx !== indexToRemove),
          }
        : prev
    );
  };

  const handleSaveServiceSubmit = async () => {
    if (!editingService?.name || !editingService?.price || !editingService?.durationMinutes) {
      showToast('error', 'Campos incompletos', 'Nombre, precio y duración son requeridos.');
      return;
    }
    setIsSavingService(true);
    try {
      await saveService(editingService);
      setEditingService(null);
    } catch (err: any) {
      showToast('error', 'Error al guardar', err.message);
    } finally {
      setIsSavingService(false);
    }
  };

  const handleDeleteServiceSubmit = async (serviceId: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este servicio?')) {
      try {
        await deleteService(serviceId);
      } catch (err: any) {
        showToast('error', 'Error al eliminar', err.message);
      }
    }
  };

  const normalizeDigits10 = (val?: string) => {
    if (!val) return '';
    const d = val.replace(/\D/g, '');
    return d.startsWith('52') && d.length === 12 ? d.substring(2) : d;
  };

  const findLinkedUserForBarber = (barber: Barber): UserProfile | undefined => {
    if (barber.userId) {
      const byId = allUsers.find((u) => u.id === barber.userId);
      if (byId) return byId;
    }
    if (barber.accessCode) {
      const byCode = allUsers.find(
        (u) =>
          u.role === 'barber' &&
          u.clientNumber &&
          u.clientNumber.trim().toLowerCase() === barber.accessCode!.trim().toLowerCase()
      );
      if (byCode) return byCode;
    }
    const barberPhone10 = normalizeDigits10(barber.phone);
    if (barberPhone10.length === 10) {
      const byPhone = allUsers.find(
        (u) => u.role === 'barber' && normalizeDigits10(u.phone) === barberPhone10
      );
      if (byPhone) return byPhone;
    }
    return undefined;
  };

  const handleOpenNewBarber = () => {
    const suggestedCode = Math.floor(100000 + Math.random() * 900000).toString();
    setEditingBarber({
      displayName: '',
      firstName: '',
      lastName: '',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      bio: 'Maestro barbero especialista en cortes modernos.',
      specialties: ['Corte Clásico', 'Fade'],
      rating: 5.0,
      reviewCount: 0,
      experienceYears: 5,
      active: true,
      featured: false,
      serviceIds: [],
      gallery: [],
    });
    setBarberAccessCode(suggestedCode);
    setBarberAccessPhone('');
    setBarberAccessPin('');
    setShowBarberAccessPin(false);
    setBarberGalleryUrlInput('');
    setIsLoadingBarberCreds(false);
  };

  const handleOpenEditBarber = async (barber: Barber) => {
    const linked = findLinkedUserForBarber(barber);
    setEditingBarber(barber);
    setBarberAccessCode(linked?.clientNumber || barber.accessCode || '');
    setBarberAccessPhone(linked?.phone || barber.phone || '');
    setBarberAccessPin(linked?.pin || '');
    setShowBarberAccessPin(false);
    setBarberGalleryUrlInput('');

    setIsLoadingBarberCreds(true);
    try {
      const creds = await dataService.getBarberAccessCredentials(barber);
      setBarberAccessCode(creds.accessCode || '');
      setBarberAccessPhone(creds.phone || '');
      setBarberAccessPin(creds.pin || '');
      if (creds.userId && !barber.userId) {
        setEditingBarber((prev) => (prev && prev.id === barber.id ? { ...prev, userId: creds.userId } : prev));
      }
    } catch {
      // keep prefilled values from allUsers
    } finally {
      setIsLoadingBarberCreds(false);
    }
  };

  const handleSaveBarberSubmit = async () => {
    if (!editingBarber?.displayName) {
      showToast('error', 'Nombre requerido', 'El barbero debe tener un nombre.');
      return;
    }
    setIsSavingBarber(true);
    try {
      await saveBarberWithCredentials(editingBarber, {
        accessCode: barberAccessCode,
        phone: barberAccessPhone,
        pin: barberAccessPin,
      });
      setEditingBarber(null);
    } catch (err: any) {
      showToast('error', 'Error al guardar', err.message);
    } finally {
      setIsSavingBarber(false);
    }
  };

  const handleDeleteBarberSubmit = async (barberId: string, barberName: string) => {
    if (confirm(`¿Estás seguro de eliminar al barbero "${barberName}" del equipo? Esta acción no se puede deshacer.`)) {
      try {
        await deleteBarber(barberId);
      } catch (err: any) {
        showToast('error', 'Error al eliminar barbero', err.message);
      }
    }
  };

  const SHOP_DAYS: Array<{ key: 0 | 1 | 2 | 3 | 4 | 5 | 6; label: string }> = [
    { key: 1, label: 'Lunes' },
    { key: 2, label: 'Martes' },
    { key: 3, label: 'Miércoles' },
    { key: 4, label: 'Jueves' },
    { key: 5, label: 'Viernes' },
    { key: 6, label: 'Sábado' },
    { key: 0, label: 'Domingo' },
  ];

  const activeWeeklySchedule: WeeklySchedule = settingsForm.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE;

  const updateShopDaySchedule = (
    dayKey: 0 | 1 | 2 | 3 | 4 | 5 | 6,
    updater: (prevDay: WeeklySchedule[0]) => WeeklySchedule[0]
  ) => {
    setSettingsForm((prev) => {
      const baseWeekly = prev.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE;
      const currentDay = baseWeekly[dayKey] || { isOpen: false, slots: [] };
      const nextWeekly: WeeklySchedule = {
        ...baseWeekly,
        [dayKey]: updater(currentDay),
      };
      return {
        ...prev,
        weeklySchedule: nextWeekly,
      };
    });
  };

  const handleSaveSettingsSubmit = async () => {
    const weekly = settingsForm.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE;
    for (const d of SHOP_DAYS) {
      const cfg = weekly[d.key];
      if (cfg?.isOpen) {
        if (!cfg.slots || cfg.slots.length === 0) {
          showToast('error', 'Horario incompleto', `Agrega al menos un bloque de horario para ${d.label} o márcalo como cerrado.`);
          return;
        }
        for (const slot of cfg.slots) {
          if (!slot.start || !slot.end || timeToMinutes(slot.end) <= timeToMinutes(slot.start)) {
            showToast('error', 'Horario inválido', `En ${d.label}, la hora de cierre (${slot.end}) debe ser mayor a la hora de apertura (${slot.start}).`);
            return;
          }
        }
      }
    }

    setIsSavingSettings(true);
    try {
      await saveSettings({
        ...settingsForm,
        weeklySchedule: weekly,
      });
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Admin Header */}
      <div className="rounded-3xl bg-white border border-[#E6E1D6] p-4 sm:p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 shrink-0">
          {businessSettings.logoUrl ? (
            <img
              src={businessSettings.logoUrl}
              alt="Logo Monarca Barber"
              className="h-10 sm:h-12 w-auto max-w-[170px] object-contain shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex items-center gap-2 text-[#9A6B3B]">
              <Shield className="w-6 h-6" />
              <span className="font-display font-black text-[#161514] text-lg tracking-wider uppercase">MONARCA</span>
            </div>
          )}
        </div>

        {/* Navigation Section Pills & Logout */}
        <div className="flex flex-wrap items-center p-1 rounded-2xl bg-[#F2EFE9] border border-[#E6E1D6] w-full sm:w-auto gap-1">
          <button
            onClick={() => setActiveSection('overview')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSection === 'overview' ? 'bg-[#161514] text-[#FAF9F6] shadow-sm' : 'text-[#5C5852] hover:text-[#161514]'
            }`}
          >
            Métricas
          </button>
          <button
            onClick={() => setActiveSection('users')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSection === 'users' ? 'bg-[#161514] text-[#FAF9F6] shadow-sm' : 'text-[#5C5852] hover:text-[#161514]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Usuarios</span>
          </button>
          <button
            onClick={() => setActiveSection('appointments')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSection === 'appointments' ? 'bg-[#161514] text-[#FAF9F6] shadow-sm' : 'text-[#5C5852] hover:text-[#161514]'
            }`}
          >
            Citas ({appointments.length})
          </button>
          <button
            onClick={() => setActiveSection('services')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSection === 'services' ? 'bg-[#161514] text-[#FAF9F6] shadow-sm' : 'text-[#5C5852] hover:text-[#161514]'
            }`}
          >
            Servicios ({services.length})
          </button>
          <button
            onClick={() => setActiveSection('barbers')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSection === 'barbers' ? 'bg-[#161514] text-[#FAF9F6] shadow-sm' : 'text-[#5C5852] hover:text-[#161514]'
            }`}
          >
            Barberos ({barbers.length})
          </button>
          <button
            onClick={() => setActiveSection('products')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSection === 'products' ? 'bg-[#161514] text-[#FAF9F6] shadow-sm' : 'text-[#5C5852] hover:text-[#161514]'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Productos & POS</span>
          </button>
          <button
            onClick={() => setActiveSection('notifications')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSection === 'notifications' ? 'bg-[#161514] text-[#FAF9F6] shadow-sm' : 'text-[#5C5852] hover:text-[#161514]'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Notificaciones</span>
          </button>
          <button
            onClick={() => setActiveSection('settings')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSection === 'settings' ? 'bg-[#161514] text-[#FAF9F6] shadow-sm' : 'text-[#5C5852] hover:text-[#161514]'
            }`}
          >
            Logo & Ajustes
          </button>
          <button
            onClick={async () => {
              await logout();
              showToast('info', 'Sesión cerrada', 'Has cerrado sesión del panel de administración.');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all ml-auto sm:ml-1"
            title="Cerrar sesión de administrador"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* SECTION: OVERVIEW / METRICS */}
      {activeSection === 'overview' && (
        <div className="space-y-6">
          {/* Quick Access to Users Banner */}
          <div
            onClick={() => setActiveSection('users')}
            className="rounded-3xl bg-[#FBF6EE] border border-[#9A6B3B]/35 hover:border-[#9A6B3B] p-5 cursor-pointer shadow-sm transition-all duration-150 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#161514] border border-[#161514] flex items-center justify-center text-[#C69765] group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-display font-bold text-[#161514] text-base uppercase tracking-wide group-hover:text-[#9A6B3B] transition-colors">
                  Directorio y Expedientes de Clientes
                </h4>
                <p className="text-xs text-[#5C5852]">
                  Ver usuarios registrados, consultar QR, modificar puntos, ajustar visitas o asignar roles de barbero/admin.
                </p>
              </div>
            </div>

            <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#161514] text-[#FAF9F6] font-bold text-xs shadow-sm group-hover:bg-[#2A2826] transition-colors self-end sm:self-auto">
              <span>Abrir Directorio</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#C69765]" />
            </button>
          </div>

          {/* Full Interactive Metrics Dashboard with Date Range & Barber Filtering */}
          <AdminMetricsSection
            appointments={appointments}
            posSales={posSales}
            barbers={barbers}
            services={services}
            onNavigateToSection={(sec) => setActiveSection(sec)}
          />
        </div>
      )}

      {/* SECTION: USERS MANAGEMENT */}
      {activeSection === 'users' && (
        <AdminUsersSection appointments={appointments} />
      )}

      {/* SECTION: APPOINTMENTS LIST */}
      {activeSection === 'appointments' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white border border-[#E6E1D6] p-3.5 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#9A6B3B]" />
              <span className="font-display text-sm font-bold text-[#161514] uppercase tracking-wide">Filtros de Citas</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={appointmentFilterBarber}
                onChange={(e) => setAppointmentFilterBarber(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#FAF9F6] border border-[#D2CBBF] text-[#161514] text-xs focus:outline-none focus:border-[#9A6B3B]"
              >
                <option value="all">Todos los Barberos</option>
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.displayName}
                  </option>
                ))}
              </select>

              <select
                value={appointmentFilterStatus}
                onChange={(e) => setAppointmentFilterStatus(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#FAF9F6] border border-[#D2CBBF] text-[#161514] text-xs focus:outline-none focus:border-[#9A6B3B]"
              >
                <option value="all">Todos los Estados</option>
                <option value="confirmed">Confirmadas</option>
                <option value="completed">Completadas</option>
                <option value="cancelled">Canceladas</option>
                <option value="no_show">No asistió</option>
              </select>
            </div>
          </div>

          <div className="space-y-2.5">
            {filteredAppointments.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white border border-[#E6E1D6] text-center text-xs text-[#767067] shadow-sm">
                No se encontraron citas con los filtros seleccionados.
              </div>
            ) : (
              filteredAppointments.map((app) => (
                <div
                  key={app.id}
                  className="rounded-2xl bg-white border border-[#E6E1D6] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#161514] text-sm">
                        {app.serviceNameSnapshot}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                          app.status === 'confirmed'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : app.status === 'completed'
                            ? 'bg-sky-50 text-sky-800 border-sky-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {app.status}
                      </span>
                    </div>

                    <div className="text-xs text-[#5C5852] mt-1 flex flex-wrap gap-3">
                      <span>Cliente: <strong className="text-[#161514]">{app.clientName}</strong></span>
                      <span>Barbero: <strong className="text-[#9A6B3B]">{app.barberName}</strong></span>
                      <span className="font-mono">{formatDateSpanish(app.date)} • {formatTime12h(app.startTime)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-black text-[#161514] text-sm mr-2 tabular-nums">
                      {formatCurrency(app.servicePriceSnapshot)}
                    </span>
                    {app.status === 'confirmed' && (
                      <>
                        <button
                          onClick={() => updateAppointmentStatus(app.id, 'completed')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all"
                        >
                          Completar
                        </button>
                        <button
                          onClick={() => updateAppointmentStatus(app.id, 'cancelled', { cancelledBy: 'admin', cancelReason: 'Cancelada por administración' })}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold"
                        >
                          Cancelar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SECTION: SERVICES CATALOG (WITH PHOTO UPLOAD) */}
      {activeSection === 'services' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl font-bold text-[#161514] uppercase tracking-wide">Catálogo de Servicios</h3>
              <p className="text-xs text-[#5C5852]">
                Gestiona precios, duraciones, fotografías y beneficios de cada servicio
              </p>
            </div>
            <button
              onClick={() =>
                setEditingService({
                  name: '',
                  price: 250,
                  durationMinutes: 45,
                  description: '',
                  imageUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80',
                  active: true,
                  isPopular: false,
                  includesWash: false,
                  createdByType: 'admin',
                })
              }
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#161514] text-[#FAF9F6] text-xs font-bold shadow-sm hover:bg-[#2A2826] transition-all"
            >
              <Plus className="w-4 h-4 text-[#C69765]" />
              <span>Nuevo Servicio</span>
            </button>
          </div>

          <div className="grid gap-3">
            {services.map((service) => (
              <div
                key={service.id}
                className="rounded-2xl bg-white border border-[#E6E1D6] p-4 flex items-center justify-between gap-3 shadow-sm"
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
                      {service.isPopular && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#FBF6EE] border border-[#9A6B3B]/30 text-[#7D542B]">
                          VIP
                        </span>
                      )}
                      {service.barberId && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-sky-50 border border-sky-200 text-sky-800">
                          Personalizado por Barbero
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#5C5852] mt-0.5 font-mono tabular-nums">
                      {service.durationMinutes} min • <strong className="text-[#9A6B3B]">{formatCurrency(service.price)}</strong>
                    </p>
                    <p className="text-[11px] text-[#767067] line-clamp-1">{service.description}</p>
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
                    onClick={() => setEditingService(service)}
                    className="p-2 rounded-xl bg-[#F2EFE9] hover:bg-[#E8E3D9] text-[#5C5852] hover:text-[#161514]"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteServiceSubmit(service.id)}
                    className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Service Edit / Create Modal (with Photo Upload) */}
          {editingService && (
            <div className="fixed inset-0 z-50 bg-[#161514]/55 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-[#FAF9F6] border border-[#D2CBBF] rounded-3xl p-5 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
                <h3 className="font-display text-lg font-bold text-[#161514] uppercase tracking-wide">
                  {editingService.id ? 'Editar Servicio' : 'Crear Nuevo Servicio'}
                </h3>

                <div className="space-y-3.5 text-xs">
                  {/* Photo of Service */}
                  <div className="space-y-2">
                    <label className="text-[#161514] font-semibold block">Fotografía del Servicio</label>
                    <div className="flex items-center gap-3">
                      {editingService.imageUrl && (
                        <img
                          src={editingService.imageUrl}
                          alt="Preview servicio"
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-[#9A6B3B]"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div className="flex-1 space-y-1.5">
                        <label className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#F2EFE9] hover:bg-[#E8E3D9] border border-[#D2CBBF] text-[#161514] cursor-pointer font-bold transition-all">
                          <Upload className="w-4 h-4 text-[#9A6B3B]" />
                          <span>{isUploadingServicePhoto ? 'Subiendo imagen...' : 'Subir Foto'}</span>
                          <input
                            type="file"
                            ref={servicePhotoInputRef}
                            accept="image/*"
                            onChange={handleServicePhotoUpload}
                            disabled={isUploadingServicePhoto}
                            className="hidden"
                          />
                        </label>
                        <input
                          type="url"
                          value={editingService.imageUrl || ''}
                          onChange={(e) => setEditingService({ ...editingService, imageUrl: e.target.value })}
                          placeholder="O escribe URL de imagen"
                          className="w-full p-2 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] placeholder:text-[#8E887E] text-[11px] focus:outline-none focus:border-[#9A6B3B]"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[#5C5852] font-semibold block mb-1">Nombre del Servicio *</label>
                    <input
                      type="text"
                      value={editingService.name || ''}
                      onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                      placeholder="Ej. Corte Imperial & Ritual Navaja"
                      className="w-full p-2.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] placeholder:text-[#8E887E] focus:outline-none focus:border-[#9A6B3B]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[#5C5852] font-semibold block mb-1">Precio ($ MXN) *</label>
                      <input
                        type="number"
                        value={editingService.price || 0}
                        onChange={(e) => setEditingService({ ...editingService, price: Number(e.target.value) })}
                        className="w-full p-2.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] font-mono focus:outline-none focus:border-[#9A6B3B]"
                      />
                    </div>
                    <div>
                      <label className="text-[#5C5852] font-semibold block mb-1">Duración (minutos) *</label>
                      <input
                        type="number"
                        value={editingService.durationMinutes || 30}
                        onChange={(e) => setEditingService({ ...editingService, durationMinutes: Number(e.target.value) })}
                        className="w-full p-2.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] font-mono focus:outline-none focus:border-[#9A6B3B]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[#5C5852] font-semibold block mb-1">Descripción detallada</label>
                    <textarea
                      value={editingService.description || ''}
                      onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                      rows={3}
                      placeholder="Describe qué incluye el servicio..."
                      className="w-full p-2.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] placeholder:text-[#8E887E] focus:outline-none focus:border-[#9A6B3B]"
                    />
                  </div>

                  <div className="flex items-center gap-4 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingService.isPopular || false}
                        onChange={(e) => setEditingService({ ...editingService, isPopular: e.target.checked })}
                        className="rounded accent-[#9A6B3B]"
                      />
                      <span className="text-[#161514] font-semibold">Destacado VIP</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingService.includesWash || false}
                        onChange={(e) => setEditingService({ ...editingService, includesWash: e.target.checked })}
                        className="rounded accent-[#9A6B3B]"
                      />
                      <span className="text-[#161514] font-semibold">Incluye Lavado</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setEditingService(null)}
                    className="flex-1 py-2.5 rounded-xl bg-[#F2EFE9] border border-[#D2CBBF] text-[#161514] text-xs font-semibold hover:bg-[#E8E3D9]"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveServiceSubmit}
                    disabled={isSavingService || isUploadingServicePhoto}
                    className="flex-1 py-2.5 rounded-xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] text-xs font-bold shadow-sm"
                  >
                    {isSavingService ? 'Guardando...' : 'Guardar Servicio'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION: BARBERS TEAM */}
      {activeSection === 'barbers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-xl font-bold text-[#161514] uppercase tracking-wide">Equipo de Barberos</h3>
              <p className="text-xs text-[#5C5852]">
                Gestiona perfiles, credenciales de acceso al panel de barbero y estados
              </p>
            </div>
            <button
              onClick={handleOpenNewBarber}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#161514] text-[#FAF9F6] text-xs font-bold shadow-sm hover:bg-[#2A2826] transition-all shrink-0"
            >
              <Plus className="w-4 h-4 text-[#C69765]" />
              <span>Nuevo Barbero</span>
            </button>
          </div>

          <div className="grid gap-3">
            {barbers.map((barber) => {
              const linkedUser = findLinkedUserForBarber(barber);
              const displayCode = linkedUser?.clientNumber || barber.accessCode || '';
              const displayPhone = linkedUser?.phone || barber.phone || '';
              const hasPin = Boolean(linkedUser?.pin);
              const hasPanelAccess = Boolean(hasPin && (displayCode || displayPhone));

              return (
                <div
                  key={barber.id}
                  className="rounded-2xl bg-white border border-[#E6E1D6] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <img
                      src={barber.photoUrl}
                      alt={barber.displayName}
                      className="w-12 h-12 rounded-xl object-cover border border-[#E6E1D6] shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-[#161514] text-sm">{barber.displayName}</h4>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            hasPanelAccess
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          <KeyRound className="w-2.5 h-2.5" />
                          <span>{hasPanelAccess ? 'Acceso activo' : 'Sin acceso configurado'}</span>
                        </span>
                      </div>
                      <p className="text-xs text-[#9A6B3B] font-semibold truncate">
                        ★ {barber.rating.toFixed(1)} ({barber.reviewCount} citas) • <span className="text-[#5C5852] font-normal">{barber.specialties.join(', ')}</span>
                      </p>
                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-[#5C5852] pt-0.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#FAF9F6] border border-[#E6E1D6] font-mono tabular-nums">
                          <Hash className="w-3 h-3 text-[#9A6B3B]" />
                          {displayCode ? `Cód: ${displayCode}` : 'Sin código'}
                        </span>
                        {displayPhone && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#FAF9F6] border border-[#E6E1D6] font-mono tabular-nums">
                            <Phone className="w-3 h-3 text-[#9A6B3B]" />
                            {displayPhone}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#FAF9F6] border border-[#E6E1D6] font-mono tabular-nums">
                          <Lock className="w-3 h-3 text-[#9A6B3B]" />
                          {hasPin ? 'NIP: ••••' : 'Sin NIP'}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#FAF9F6] border border-[#E6E1D6] font-mono tabular-nums">
                          <ImageIcon className="w-3 h-3 text-[#9A6B3B]" />
                          {(barber.gallery || []).length > 0
                            ? `${barber.gallery.length} ${(barber.gallery.length === 1 ? 'foto' : 'fotos')} portafolio`
                            : 'Sin portafolio'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => toggleBarberActive(barber.id, !barber.active)}
                      className="p-2 rounded-xl bg-[#F2EFE9] hover:bg-[#E8E3D9] text-[#5C5852] transition-all"
                      title={barber.active ? 'Desactivar barbero' : 'Activar barbero'}
                    >
                      {barber.active ? <ToggleRight className="w-5 h-5 text-emerald-700" /> : <ToggleLeft className="w-5 h-5 text-[#8E887E]" />}
                    </button>
                    <button
                      onClick={() => handleOpenEditBarber(barber)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F2EFE9] hover:bg-[#E8E3D9] text-[#161514] text-xs font-semibold transition-all"
                      title="Editar datos y acceso al panel"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#9A6B3B]" />
                      <span className="hidden sm:inline">Editar</span>
                    </button>
                    <button
                      onClick={() => handleDeleteBarberSubmit(barber.id, barber.displayName)}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 transition-all"
                      title="Eliminar barbero del equipo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Barber Edit Modal */}
          {editingBarber && (
            <div className="fixed inset-0 z-50 bg-[#161514]/55 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-[#FAF9F6] border border-[#D2CBBF] rounded-3xl p-5 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
                <h3 className="font-display text-lg font-bold text-[#161514] uppercase tracking-wide">
                  {editingBarber.id ? 'Editar Barbero' : 'Nuevo Barbero'}
                </h3>

                <div className="space-y-3.5 text-xs">
                  {/* Photo of Barber */}
                  <div className="space-y-2">
                    <label className="text-[#161514] font-semibold block">Fotografía del Barbero</label>
                    <div className="flex items-center gap-3">
                      {editingBarber.photoUrl && (
                        <img
                          src={editingBarber.photoUrl}
                          alt="Preview barbero"
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-[#9A6B3B] shadow-sm shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div className="flex-1 space-y-1.5">
                        <label className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#F2EFE9] hover:bg-[#E8E3D9] border border-[#D2CBBF] text-[#161514] cursor-pointer font-bold transition-all">
                          <Upload className="w-4 h-4 text-[#9A6B3B]" />
                          <span>{isUploadingBarberPhoto ? 'Subiendo foto...' : 'Subir Foto'}</span>
                          <input
                            type="file"
                            ref={barberPhotoInputRef}
                            accept="image/*"
                            onChange={handleBarberPhotoUpload}
                            disabled={isUploadingBarberPhoto}
                            className="hidden"
                          />
                        </label>
                        <input
                          type="url"
                          value={editingBarber.photoUrl || ''}
                          onChange={(e) => setEditingBarber({ ...editingBarber, photoUrl: e.target.value })}
                          placeholder="O escribe URL de foto"
                          className="w-full p-2 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] placeholder:text-[#8E887E] text-[11px] focus:outline-none focus:border-[#9A6B3B]"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[#5C5852] font-semibold block mb-1">Nombre Completo *</label>
                    <input
                      type="text"
                      value={editingBarber.displayName || ''}
                      onChange={(e) =>
                        setEditingBarber({
                          ...editingBarber,
                          displayName: e.target.value,
                          firstName: e.target.value.split(' ')[0] || '',
                        })
                      }
                      placeholder="Ej. Carlos Mendoza"
                      className="w-full p-2.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] placeholder:text-[#8E887E] focus:outline-none focus:border-[#9A6B3B]"
                    />
                  </div>

                  {/* Acceso al Panel de Barbero */}
                  <div className="p-3.5 rounded-2xl bg-[#FBF6EE] border border-[#9A6B3B]/35 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-[#161514] text-[#C69765] flex items-center justify-center shrink-0">
                          <KeyRound className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="font-display text-sm font-bold text-[#161514] uppercase tracking-wide leading-tight">
                            Acceso al Panel de Barbero
                          </h4>
                          <p className="text-[11px] text-[#5C5852] leading-snug">
                            Credenciales para iniciar sesión y entrar a su panel
                          </p>
                        </div>
                      </div>
                      {isLoadingBarberCreds && (
                        <RefreshCw className="w-3.5 h-3.5 text-[#9A6B3B] animate-spin shrink-0 mt-1" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[#5C5852] font-semibold">Código de Acceso</label>
                        <button
                          type="button"
                          onClick={() =>
                            setBarberAccessCode(Math.floor(100000 + Math.random() * 900000).toString())
                          }
                          className="text-[10px] font-bold text-[#9A6B3B] hover:text-[#161514] flex items-center gap-1"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                          <span>Generar 6 dígitos</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        maxLength={12}
                        value={barberAccessCode}
                        onChange={(e) => setBarberAccessCode(e.target.value.replace(/\s+/g, ''))}
                        placeholder="Ej. 849201 o CARLOS01"
                        className="w-full p-2.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] placeholder:text-[#8E887E] font-mono tabular-nums tracking-wider focus:outline-none focus:border-[#9A6B3B]"
                      />
                    </div>

                    <div>
                      <label className="text-[#5C5852] font-semibold block mb-1">Celular de Acceso (10 dígitos)</label>
                      <input
                        type="tel"
                        value={barberAccessPhone}
                        onChange={(e) => setBarberAccessPhone(e.target.value)}
                        placeholder="Ej. 55 1234 5678"
                        className="w-full p-2.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] placeholder:text-[#8E887E] font-mono tabular-nums focus:outline-none focus:border-[#9A6B3B]"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[#5C5852] font-semibold">Contraseña / NIP (4 dígitos)</label>
                        <button
                          type="button"
                          onClick={() => {
                            setBarberAccessPin(Math.floor(1000 + Math.random() * 9000).toString());
                            setShowBarberAccessPin(true);
                          }}
                          className="text-[10px] font-bold text-[#9A6B3B] hover:text-[#161514] flex items-center gap-1"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                          <span>Generar NIP</span>
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showBarberAccessPin ? 'text' : 'password'}
                          inputMode="numeric"
                          maxLength={4}
                          value={barberAccessPin}
                          onChange={(e) => setBarberAccessPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="•••• (4 dígitos)"
                          className="w-full p-2.5 pr-10 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] placeholder:text-[#8E887E] font-mono tabular-nums tracking-[0.35em] focus:outline-none focus:border-[#9A6B3B]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowBarberAccessPin(!showBarberAccessPin)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#5C5852] hover:text-[#161514]"
                          title={showBarberAccessPin ? 'Ocultar contraseña' : 'Ver contraseña'}
                        >
                          {showBarberAccessPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-[#767067] mt-1">
                        El barbero podrá entrar desde "Iniciar Sesión" usando su código o celular junto con este NIP de 4 dígitos.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-[#5C5852] font-semibold block mb-1">Especialidades (separadas por coma)</label>
                    <input
                      type="text"
                      value={(editingBarber.specialties || []).join(', ')}
                      onChange={(e) =>
                        setEditingBarber({
                          ...editingBarber,
                          specialties: e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="Ej. Corte Clásico, Fade, Barba Perfilada"
                      className="w-full p-2.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] placeholder:text-[#8E887E] focus:outline-none focus:border-[#9A6B3B]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[#5C5852] font-semibold block mb-1">Años de Experiencia</label>
                      <input
                        type="number"
                        min={0}
                        max={50}
                        value={editingBarber.experienceYears !== undefined ? editingBarber.experienceYears : 5}
                        onChange={(e) =>
                          setEditingBarber({
                            ...editingBarber,
                            experienceYears: Number(e.target.value) || 0,
                          })
                        }
                        className="w-full p-2.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] font-mono focus:outline-none focus:border-[#9A6B3B]"
                      />
                    </div>

                    <div>
                      <label className="text-[#5C5852] font-semibold block mb-1">Instagram (opcional)</label>
                      <input
                        type="text"
                        value={editingBarber.instagram || ''}
                        onChange={(e) => setEditingBarber({ ...editingBarber, instagram: e.target.value })}
                        placeholder="@carlos.monarca"
                        className="w-full p-2.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] placeholder:text-[#8E887E] focus:outline-none focus:border-[#9A6B3B]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[#5C5852] font-semibold block mb-1">Biografía</label>
                    <textarea
                      value={editingBarber.bio || ''}
                      onChange={(e) => setEditingBarber({ ...editingBarber, bio: e.target.value })}
                      rows={2}
                      placeholder="Breve reseña del estilo y trayectoria del barbero..."
                      className="w-full p-2.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] placeholder:text-[#8E887E] focus:outline-none focus:border-[#9A6B3B]"
                    />
                  </div>

                  {/* Portafolio de Trabajos del Barbero */}
                  <div className="p-3.5 rounded-2xl bg-white border border-[#E6E1D6] space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h4 className="font-display text-sm font-bold text-[#161514] uppercase tracking-wide flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-[#9A6B3B]" />
                          <span>Portafolio de Trabajos ({(editingBarber.gallery || []).length})</span>
                        </h4>
                        <p className="text-[11px] text-[#5C5852]">
                          Sube fotos de sus mejores cortes para mostrar en su perfil público
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => barberGalleryInputRef.current?.click()}
                        disabled={isUploadingBarberGallery}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] font-bold text-[11px] transition-all shrink-0 disabled:opacity-60"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#C69765]" />
                        <span>{isUploadingBarberGallery ? 'Subiendo...' : 'Subir Fotos'}</span>
                      </button>
                      <input
                        type="file"
                        ref={barberGalleryInputRef}
                        accept="image/*"
                        multiple
                        onChange={handleBarberGalleryUpload}
                        disabled={isUploadingBarberGallery}
                        className="hidden"
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="url"
                        value={barberGalleryUrlInput}
                        onChange={(e) => setBarberGalleryUrlInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddBarberGalleryUrl();
                          }
                        }}
                        placeholder="O pega la URL de una foto de trabajo..."
                        className="flex-1 p-2 rounded-xl bg-[#FAF9F6] border border-[#D2CBBF] text-[#161514] placeholder:text-[#8E887E] text-[11px] focus:outline-none focus:border-[#9A6B3B]"
                      />
                      <button
                        type="button"
                        onClick={handleAddBarberGalleryUrl}
                        disabled={!barberGalleryUrlInput.trim()}
                        className="px-3 py-2 rounded-xl bg-[#F2EFE9] hover:bg-[#E8E3D9] border border-[#D2CBBF] text-[#161514] font-semibold text-[11px] disabled:opacity-50"
                      >
                        Agregar
                      </button>
                    </div>

                    {(editingBarber.gallery || []).length === 0 ? (
                      <div className="p-4 rounded-xl bg-[#FAF9F6] border border-dashed border-[#D2CBBF] text-center text-[#767067] text-[11px]">
                        Este barbero aún no tiene fotos en su portafolio.
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {(editingBarber.gallery || []).map((imgUrl, idx) => (
                          <div
                            key={`${imgUrl}-${idx}`}
                            className="relative aspect-square rounded-xl overflow-hidden bg-[#F2EFE9] border border-[#E6E1D6] group"
                          >
                            <img
                              src={imgUrl}
                              alt={`Trabajo ${idx + 1}`}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveBarberGalleryPhoto(idx)}
                              className="absolute top-1 right-1 p-1 rounded-lg bg-white/95 text-rose-700 hover:bg-rose-600 hover:text-white border border-[#E6E1D6] shadow-xs transition-colors"
                              title="Eliminar foto del portafolio"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setEditingBarber(null)}
                    className="flex-1 py-2.5 rounded-xl bg-[#F2EFE9] border border-[#D2CBBF] text-[#161514] text-xs font-semibold hover:bg-[#E8E3D9]"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveBarberSubmit}
                    disabled={isSavingBarber || isUploadingBarberPhoto || isUploadingBarberGallery}
                    className="flex-1 py-2.5 rounded-xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] text-xs font-bold disabled:opacity-60"
                  >
                    {isSavingBarber ? 'Guardando...' : 'Guardar Barbero'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION: PRODUCTS & POS MANAGEMENT */}
      {activeSection === 'products' && (
        <AdminProductsSection />
      )}

      {/* SECTION: NOTIFICATIONS & REMINDERS CONTROL CENTER */}
      {activeSection === 'notifications' && (
        <div className="rounded-3xl bg-white border border-[#E6E1D6] p-5 space-y-6 shadow-sm">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#FBF6EE] border border-[#9A6B3B]/35">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#161514] border border-[#161514] flex items-center justify-center text-[#C69765] shadow-sm">
                <BellRing className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg font-bold text-[#161514] uppercase tracking-wide">
                    Centro de Notificaciones & Recordatorios
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Tiempo Real
                  </span>
                </div>
                <p className="text-xs text-[#5C5852] mt-0.5">
                  Controla las alertas de nuevas citas para barberos y recordatorios automáticos (24h y 2h antes) para clientes.
                </p>
              </div>
            </div>

            {/* Browser Permission Status Badge & Action */}
            <div className="flex flex-wrap items-center gap-2">
              <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 ${
                browserPermission === 'granted'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : browserPermission === 'denied'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                <Radio className="w-3 h-3" />
                <span>
                  {browserPermission === 'granted'
                    ? 'Navegador Autorizado'
                    : browserPermission === 'denied'
                    ? 'Navegador Bloqueado'
                    : 'Permiso Pendiente'}
                </span>
              </div>

              {browserPermission !== 'granted' && (
                <button
                  onClick={async () => {
                    const result = await requestBrowserNotifications();
                    setBrowserPermission(result);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Smartphone className="w-3.5 h-3.5 text-[#C69765]" />
                  <span>Activar Permisos</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* 1. NOTIFICACIONES PARA BARBEROS */}
            <div className="p-5 rounded-2xl bg-[#FAF9F6] border border-[#E6E1D6] space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#E6E1D6]">
                <div className="flex items-center gap-2.5">
                  <Scissors className="w-4 h-4 text-[#9A6B3B]" />
                  <h3 className="font-display text-sm font-bold text-[#161514] uppercase tracking-wider">
                    Panel del Barbero (En Vivo)
                  </h3>
                </div>
                <span className="text-[10px] text-[#767067] font-medium">Alertas de Agenda</span>
              </div>
              <p className="text-xs text-[#5C5852] leading-relaxed">
                Cuando un cliente reserva un corte o servicio directamente en la agenda del barbero:
              </p>

              <div className="space-y-3 pt-1">
                {/* Toggle: Toast en pantalla */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E6E1D6]">
                  <div className="pr-3">
                    <span className="text-xs font-bold text-[#161514] block">Mensaje Toast en Pantalla</span>
                    <span className="text-[11px] text-[#5C5852] block">
                      Aviso emergente instantáneo con nombre del cliente, servicio y hora
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      updateNotificationSettings({
                        barberNewBookingToast: !notificationSettings.barberNewBookingToast,
                      })
                    }
                    className={`shrink-0 transition-colors ${
                      notificationSettings.barberNewBookingToast ? 'text-[#9A6B3B]' : 'text-[#8E887E]'
                    }`}
                  >
                    {notificationSettings.barberNewBookingToast ? (
                      <ToggleRight className="w-8 h-8" />
                    ) : (
                      <ToggleLeft className="w-8 h-8" />
                    )}
                  </button>
                </div>

                {/* Toggle: Sonido de alerta */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E6E1D6]">
                  <div className="pr-3">
                    <span className="text-xs font-bold text-[#161514] block">Sonido / Chime de Notificación</span>
                    <span className="text-[11px] text-[#5C5852] block">
                      Tono sonoro elegante compatible con Chrome y Safari
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      updateNotificationSettings({
                        barberNewBookingSound: !notificationSettings.barberNewBookingSound,
                      })
                    }
                    className={`shrink-0 transition-colors ${
                      notificationSettings.barberNewBookingSound ? 'text-[#9A6B3B]' : 'text-[#8E887E]'
                    }`}
                  >
                    {notificationSettings.barberNewBookingSound ? (
                      <ToggleRight className="w-8 h-8" />
                    ) : (
                      <ToggleLeft className="w-8 h-8" />
                    )}
                  </button>
                </div>

                {/* Toggle: Push de navegador */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E6E1D6]">
                  <div className="pr-3">
                    <span className="text-xs font-bold text-[#161514] block">Notificación de Navegador (Push)</span>
                    <span className="text-[11px] text-[#5C5852] block">
                      Aviso de escritorio o smartphone cuando la pestaña esté minimizada
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      updateNotificationSettings({
                        barberBrowserPush: !notificationSettings.barberBrowserPush,
                      })
                    }
                    className={`shrink-0 transition-colors ${
                      notificationSettings.barberBrowserPush ? 'text-[#9A6B3B]' : 'text-[#8E887E]'
                    }`}
                  >
                    {notificationSettings.barberBrowserPush ? (
                      <ToggleRight className="w-8 h-8" />
                    ) : (
                      <ToggleLeft className="w-8 h-8" />
                    )}
                  </button>
                </div>
              </div>

              {/* Botón de prueba para Barbero */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => testNotification('barber_new_booking')}
                  className="w-full py-2.5 rounded-xl bg-[#FBF6EE] hover:bg-[#F2EFE9] text-[#7D542B] border border-[#9A6B3B]/35 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Probar Notificación de Nueva Cita (Barbero)</span>
                </button>
              </div>
            </div>

            {/* 2. NOTIFICACIONES Y RECORDATORIOS PARA CLIENTES */}
            <div className="p-5 rounded-2xl bg-[#FAF9F6] border border-[#E6E1D6] space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#E6E1D6]">
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-emerald-700" />
                  <h3 className="font-display text-sm font-bold text-[#161514] uppercase tracking-wider">
                    Panel del Cliente (Recordatorios)
                  </h3>
                </div>
                <span className="text-[10px] text-[#767067] font-medium">Experiencia VIP</span>
              </div>
              <p className="text-xs text-[#5C5852] leading-relaxed">
                Recordatorios automatizados para evitar inasistencias y confirmar citas:
              </p>

              <div className="space-y-3 pt-1">
                {/* Toggle: Confirmación instantánea */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E6E1D6]">
                  <div className="pr-3">
                    <span className="text-xs font-bold text-[#161514] block">Confirmación al Reservar</span>
                    <span className="text-[11px] text-[#5C5852] block">
                      Toast y notificación al momento en que el cliente confirma su cita
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      updateNotificationSettings({
                        clientBookingConfirmation: !notificationSettings.clientBookingConfirmation,
                      })
                    }
                    className={`shrink-0 transition-colors ${
                      notificationSettings.clientBookingConfirmation ? 'text-emerald-700' : 'text-[#8E887E]'
                    }`}
                  >
                    {notificationSettings.clientBookingConfirmation ? (
                      <ToggleRight className="w-8 h-8" />
                    ) : (
                      <ToggleLeft className="w-8 h-8" />
                    )}
                  </button>
                </div>

                {/* Toggle: Recordatorio 1 día antes */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E6E1D6]">
                  <div className="pr-3">
                    <span className="text-xs font-bold text-[#161514] block">Recordatorio 1 Día Antes (24 Horas)</span>
                    <span className="text-[11px] text-[#5C5852] block">
                      Aviso automático previo al día de la cita con los datos de su barbero
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      updateNotificationSettings({
                        clientReminder24h: !notificationSettings.clientReminder24h,
                      })
                    }
                    className={`shrink-0 transition-colors ${
                      notificationSettings.clientReminder24h ? 'text-emerald-700' : 'text-[#8E887E]'
                    }`}
                  >
                    {notificationSettings.clientReminder24h ? (
                      <ToggleRight className="w-8 h-8" />
                    ) : (
                      <ToggleLeft className="w-8 h-8" />
                    )}
                  </button>
                </div>

                {/* Toggle: Recordatorio 2 horas antes */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E6E1D6]">
                  <div className="pr-3">
                    <span className="text-xs font-bold text-[#161514] block">Recordatorio 2 Horas Antes</span>
                    <span className="text-[11px] text-[#5C5852] block">
                      Aviso prioritario el mismo día para preparar su llegada a la barbería
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      updateNotificationSettings({
                        clientReminder2h: !notificationSettings.clientReminder2h,
                      })
                    }
                    className={`shrink-0 transition-colors ${
                      notificationSettings.clientReminder2h ? 'text-emerald-700' : 'text-[#8E887E]'
                    }`}
                  >
                    {notificationSettings.clientReminder2h ? (
                      <ToggleRight className="w-8 h-8" />
                    ) : (
                      <ToggleLeft className="w-8 h-8" />
                    )}
                  </button>
                </div>

                {/* Toggle: Push de navegador para clientes */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E6E1D6]">
                  <div className="pr-3">
                    <span className="text-xs font-bold text-[#161514] block">Notificación de Navegador para Clientes</span>
                    <span className="text-[11px] text-[#5C5852] block">
                      Habilitar alertas de sistema para clientes en Chrome, Safari y PWA
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      updateNotificationSettings({
                        clientBrowserPush: !notificationSettings.clientBrowserPush,
                      })
                    }
                    className={`shrink-0 transition-colors ${
                      notificationSettings.clientBrowserPush ? 'text-emerald-700' : 'text-[#8E887E]'
                    }`}
                  >
                    {notificationSettings.clientBrowserPush ? (
                      <ToggleRight className="w-8 h-8" />
                    ) : (
                      <ToggleLeft className="w-8 h-8" />
                    )}
                  </button>
                </div>
              </div>

              {/* Botones de prueba para Cliente */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => testNotification('client_reminder_24h')}
                  className="py-2.5 px-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all text-center"
                >
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>Probar 1 Día Antes</span>
                </button>
                <button
                  type="button"
                  onClick={() => testNotification('client_reminder_2h')}
                  className="py-2.5 px-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all text-center"
                >
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>Probar 2 Horas Antes</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3. AJUSTES GLOBALES DE AUDIO Y COMPATIBILIDAD */}
          <div className="p-5 rounded-2xl bg-[#FAF9F6] border border-[#E6E1D6] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Volume2 className="w-4 h-4 text-[#9A6B3B]" />
                <h3 className="font-display text-sm font-bold text-[#161514] uppercase tracking-wider">
                  Motor de Audio & Compatibilidad Multidispositivo
                </h3>
              </div>
              <button
                type="button"
                onClick={() =>
                  updateNotificationSettings({
                    enableAudioChime: !notificationSettings.enableAudioChime,
                  })
                }
                className={`transition-colors ${
                  notificationSettings.enableAudioChime ? 'text-[#9A6B3B]' : 'text-[#8E887E]'
                }`}
              >
                {notificationSettings.enableAudioChime ? (
                  <ToggleRight className="w-8 h-8" />
                ) : (
                  <ToggleLeft className="w-8 h-8" />
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-white border border-[#E6E1D6]">
                <span className="text-[#161514] font-bold block flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5 text-[#9A6B3B]" />
                  Google Chrome (PC / Mac / Android)
                </span>
                <p className="text-[11px] text-[#5C5852] mt-1 leading-relaxed">
                  Soporta síntesis Web Audio y notificaciones nativas de sistema en primer y segundo plano.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-[#E6E1D6]">
                <span className="text-[#161514] font-bold block flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-sky-700" />
                  Apple Safari (iOS & macOS)
                </span>
                <p className="text-[11px] text-[#5C5852] mt-1 leading-relaxed">
                  El motor sintetiza audio tras la primera interacción y envía push nativo en macOS e iOS 16.4+.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-[#E6E1D6] flex flex-col justify-between">
                <div>
                  <span className="text-[#161514] font-bold block">Prueba Rápida de Chime</span>
                  <p className="text-[11px] text-[#5C5852] mt-0.5">Escucha el tono armónico de Monarca</p>
                </div>
                <button
                  type="button"
                  onClick={() => testNotification('sound_only')}
                  className="mt-2 py-1.5 px-3 rounded-lg bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Volume2 className="w-3 h-3 text-[#C69765]" />
                  <span>Reproducir Sonido</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: BRAND IDENTITY & LOGO UPLOAD / SETTINGS */}
      {activeSection === 'settings' && (
        <div className="rounded-3xl bg-white border border-[#E6E1D6] p-5 space-y-6 shadow-sm">
          {/* 1. BRAND LOGO UPLOADER */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF9F6] border border-[#E6E1D6] space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#9A6B3B]" />
              <h3 className="font-display text-base font-bold text-[#161514] uppercase tracking-wider">
                Logotipo Oficial de Monarca Barber
              </h3>
            </div>
            <p className="text-xs text-[#5C5852] leading-relaxed">
              Sube el logo de tu barbería. Este logotipo se mostrará en el encabezado de la app, tarjetas, tickets de reserva y perfiles.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
              {/* Logo Preview */}
              <div className="w-24 h-24 rounded-2xl bg-white border-2 border-[#9A6B3B]/45 flex items-center justify-center p-2 shrink-0 shadow-sm relative group">
                {settingsForm.logoUrl ? (
                  <img
                    src={settingsForm.logoUrl}
                    alt="Logo Monarca"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-xs font-bold text-[#8E887E] text-center">Sin Logo</span>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-2.5 w-full">
                <div className="flex flex-wrap gap-2">
                  <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] text-xs font-bold cursor-pointer transition-all shadow-sm">
                    <Upload className="w-4 h-4 text-[#C69765]" />
                    <span>{isUploadingLogo ? 'Subiendo archivo...' : 'Subir Logotipo desde Dispositivo'}</span>
                    <input
                      type="file"
                      ref={logoInputRef}
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={isUploadingLogo}
                      className="hidden"
                    />
                  </label>

                  {settingsForm.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setSettingsForm((prev) => ({ ...prev, logoUrl: '' }))}
                      className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold"
                    >
                      Remover Logo
                    </button>
                  )}
                </div>

                <div>
                  <label className="text-[11px] text-[#5C5852] font-semibold block mb-1">O escribe enlace URL directo:</label>
                  <input
                    type="url"
                    value={settingsForm.logoUrl || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, logoUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full p-2 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] placeholder:text-[#8E887E] text-xs focus:outline-none focus:border-[#9A6B3B]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. BANNER DE INICIO / HERO MODULE EDITOR */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF9F6] border border-[#9A6B3B]/35 space-y-5 shadow-sm">
            {/* Header with Master Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E6E1D6]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#161514] border border-[#161514] flex items-center justify-center text-[#C69765]">
                  <Layout className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-[#161514] uppercase tracking-wider">
                    Módulo de Inicio / Banner Principal (Hero)
                  </h3>
                  <p className="text-[11px] text-[#5C5852]">
                    Controla la visibilidad y cada elemento independiente del banner de bienvenida.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[11px] font-bold text-[#161514] block">
                    {settingsForm.showHeroSection !== false ? 'Módulo Activo' : 'Módulo Desactivado'}
                  </span>
                  <span className="text-[10px] text-[#767067] block">
                    {settingsForm.showHeroSection !== false ? 'Visible en Inicio' : 'Oculto en Inicio'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      showHeroSection: prev.showHeroSection !== undefined ? !prev.showHeroSection : false,
                    }))
                  }
                  className={`transition-colors ${
                    settingsForm.showHeroSection !== false ? 'text-[#9A6B3B]' : 'text-[#8E887E]'
                  }`}
                  title="Activar o desactivar todo el banner principal de inicio"
                >
                  {settingsForm.showHeroSection !== false ? (
                    <ToggleRight className="w-9 h-9" />
                  ) : (
                    <ToggleLeft className="w-9 h-9" />
                  )}
                </button>
              </div>
            </div>

            {/* Quick Layout Presets Bar */}
            <div className="p-3.5 rounded-2xl bg-white border border-[#E6E1D6] space-y-2">
              <span className="text-[11px] font-bold text-[#9A6B3B] uppercase tracking-wider block">
                Plantillas Rápidas de Configuración:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      showHeroSection: true,
                      heroShowLogo: true,
                      heroShowBadge: false,
                      heroShowTitle: false,
                      heroShowSubtitle: false,
                      heroShowButton: false,
                    }))
                  }
                  className="px-3 py-1.5 rounded-xl bg-[#F2EFE9] hover:bg-[#FBF6EE] hover:border-[#9A6B3B]/45 border border-[#D2CBBF] text-[#161514] text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#9A6B3B]" />
                  <span>Solo Logotipo</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      showHeroSection: true,
                      heroShowLogo: true,
                      heroShowBadge: false,
                      heroShowTitle: false,
                      heroShowSubtitle: false,
                      heroShowButton: true,
                    }))
                  }
                  className="px-3 py-1.5 rounded-xl bg-[#F2EFE9] hover:bg-[#FBF6EE] hover:border-[#9A6B3B]/45 border border-[#D2CBBF] text-[#161514] text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <MousePointerClick className="w-3.5 h-3.5 text-[#9A6B3B]" />
                  <span>Logotipo + Botón</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      showHeroSection: true,
                      heroShowLogo: false,
                      heroShowBadge: true,
                      heroShowTitle: true,
                      heroShowSubtitle: true,
                      heroShowButton: true,
                    }))
                  }
                  className="px-3 py-1.5 rounded-xl bg-[#F2EFE9] hover:bg-[#FBF6EE] hover:border-[#9A6B3B]/45 border border-[#D2CBBF] text-[#161514] text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Type className="w-3.5 h-3.5 text-[#9A6B3B]" />
                  <span>Estándar Editorial (Textos + Botón)</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      showHeroSection: true,
                      heroShowLogo: true,
                      heroShowBadge: true,
                      heroShowTitle: true,
                      heroShowSubtitle: true,
                      heroShowButton: true,
                    }))
                  }
                  className="px-3 py-1.5 rounded-xl bg-[#F2EFE9] hover:bg-[#FBF6EE] hover:border-[#9A6B3B]/45 border border-[#D2CBBF] text-[#161514] text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Crown className="w-3.5 h-3.5 text-[#9A6B3B]" />
                  <span>Todo Incluido (Logo + Textos + Botón)</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      showHeroSection: true,
                      heroShowLogo: false,
                      heroShowBadge: true,
                      heroShowTitle: true,
                      heroShowSubtitle: true,
                      heroShowButton: true,
                      heroBadge: 'EXPERIENCIA EXCLUSIVA EN POLANCO',
                      heroTitle: 'El arte del corte clásico y la barbería contemporánea.',
                      heroSubtitle: 'Donde la elegancia y la maestría se encuentran.',
                      heroButtonText: 'Reservar Cita Ahora',
                    }))
                  }
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#F2EFE9] border border-[#D2CBBF] text-[#5C5852] hover:text-[#161514] text-xs font-semibold flex items-center gap-1.5 transition-all ml-auto"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#9A6B3B]" />
                  <span>Restaurar Predeterminados</span>
                </button>
              </div>
            </div>

            {/* LIVE PREVIEW OF THE HERO BANNER */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-[#9A6B3B] uppercase tracking-wider block">
                Vista Previa en Tiempo Real:
              </span>

              {settingsForm.showHeroSection === false ? (
                <div className="p-6 rounded-2xl bg-white border-2 border-dashed border-[#D2CBBF] text-center space-y-2">
                  <EyeOff className="w-7 h-7 text-[#8E887E] mx-auto" />
                  <p className="text-xs font-bold text-[#5C5852]">
                    El módulo Hero está actualmente DESHABILITADO
                  </p>
                  <p className="text-[11px] text-[#767067] max-w-sm mx-auto">
                    Los clientes no verán este banner en la pantalla de inicio; entrarán directo a las citas y servicios destacados.
                  </p>
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#FFFFFF] via-[#FAF9F6] to-[#F2EFE9] border border-[#D2CBBF] p-5 sm:p-6 shadow-sm">
                  <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#9A6B3B]/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-[#C69765]/10 rounded-full blur-2xl pointer-events-none" />

                  {/* Logo-only centered preview */}
                  {settingsForm.heroShowLogo &&
                  settingsForm.heroShowBadge === false &&
                  settingsForm.heroShowTitle === false &&
                  settingsForm.heroShowSubtitle === false &&
                  settingsForm.heroShowButton === false ? (
                    <div className="relative z-10 flex flex-col items-center justify-center py-4 text-center">
                      {settingsForm.logoUrl ? (
                        <img
                          src={settingsForm.logoUrl}
                          alt={settingsForm.name || 'Logo'}
                          className="h-16 sm:h-20 w-auto max-w-[240px] object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex items-center gap-2 text-[#9A6B3B]">
                          <Crown className="w-8 h-8" />
                          <span className="font-display text-2xl font-black text-[#161514] tracking-widest uppercase">
                            {settingsForm.name || 'MONARCA BARBER'}
                          </span>
                        </div>
                      )}
                      <span className="text-[10px] text-[#9A6B3B] font-semibold mt-2 tracking-wide uppercase">
                        Modo Solo Logotipo Activo
                      </span>
                    </div>
                  ) : (
                    <div className="relative z-10 space-y-3 max-w-lg">
                      {/* Logo Preview inside content */}
                      {settingsForm.heroShowLogo && (
                        <div>
                          {settingsForm.logoUrl ? (
                            <img
                              src={settingsForm.logoUrl}
                              alt="Logo"
                              className="h-10 sm:h-12 w-auto max-w-[180px] object-contain"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="flex items-center gap-2 text-[#9A6B3B]">
                              <Crown className="w-5 h-5" />
                              <span className="font-display text-lg font-black text-[#161514] tracking-wider uppercase">
                                {settingsForm.name || 'MONARCA BARBER'}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Badge Preview */}
                      {settingsForm.heroShowBadge !== false && (
                        <div>
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FBF6EE] border border-[#9A6B3B]/35 text-[#7D542B] text-[10px] font-bold tracking-wide">
                            <Crown className="w-3 h-3 text-[#9A6B3B]" />
                            <span>{settingsForm.heroBadge || 'EXPERIENCIA EXCLUSIVA EN POLANCO'}</span>
                          </div>
                        </div>
                      )}

                      {/* Title Preview */}
                      {settingsForm.heroShowTitle !== false && (
                        <h2 className="font-display text-xl sm:text-2xl font-black text-[#161514] uppercase tracking-wide leading-snug">
                          {settingsForm.heroTitle || 'El arte del corte clásico y la barbería contemporánea.'}
                        </h2>
                      )}

                      {/* Subtitle Preview */}
                      {settingsForm.heroShowSubtitle !== false && (
                        <p className="text-[11px] sm:text-xs text-[#5C5852] font-normal leading-relaxed">
                          {settingsForm.heroSubtitle ||
                            settingsForm.tagline ||
                            'Donde la elegancia y la maestría se encuentran.'}
                        </p>
                      )}

                      {/* Button Preview */}
                      {settingsForm.heroShowButton !== false && (
                        <div className="pt-1 flex items-center gap-2">
                          <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#161514] text-[#FAF9F6] font-bold text-xs shadow-sm">
                            <Scissors className="w-3.5 h-3.5 text-[#C69765] stroke-[2.5]" />
                            <span>{settingsForm.heroButtonText || 'Reservar Cita Ahora'}</span>
                            <ChevronRight className="w-3.5 h-3.5 text-[#C69765]" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* GRANULAR TOGGLES & INPUTS FOR EACH ELEMENT */}
            <div className="space-y-3 pt-2">
              <span className="text-[11px] font-bold text-[#5C5852] uppercase tracking-wider block">
                Personalización Elemento por Elemento:
              </span>

              {/* 1. LOGO TOGGLE */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#E6E1D6] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#9A6B3B]" />
                    <div>
                      <span className="text-xs font-bold text-[#161514] block">Logotipo en el Banner</span>
                      <span className="text-[11px] text-[#5C5852] block">
                        Muestra el logotipo oficial de tu barbería dentro del banner de portada.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSettingsForm((prev) => ({
                        ...prev,
                        heroShowLogo: !prev.heroShowLogo,
                      }))
                    }
                    className={`transition-colors ${
                      settingsForm.heroShowLogo ? 'text-[#9A6B3B]' : 'text-[#8E887E]'
                    }`}
                  >
                    {settingsForm.heroShowLogo ? (
                      <ToggleRight className="w-8 h-8" />
                    ) : (
                      <ToggleLeft className="w-8 h-8" />
                    )}
                  </button>
                </div>
              </div>

              {/* 2. BADGE TOGGLE & INPUT */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#E6E1D6] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-[#9A6B3B]" />
                    <div>
                      <span className="text-xs font-bold text-[#161514] block">Insignia / Distintivo Superior</span>
                      <span className="text-[11px] text-[#5C5852] block">
                        Cápsula bronce pequeña con icono de corona arriba del título.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSettingsForm((prev) => ({
                        ...prev,
                        heroShowBadge: prev.heroShowBadge !== undefined ? !prev.heroShowBadge : false,
                      }))
                    }
                    className={`transition-colors ${
                      settingsForm.heroShowBadge !== false ? 'text-[#9A6B3B]' : 'text-[#8E887E]'
                    }`}
                  >
                    {settingsForm.heroShowBadge !== false ? (
                      <ToggleRight className="w-8 h-8" />
                    ) : (
                      <ToggleLeft className="w-8 h-8" />
                    )}
                  </button>
                </div>

                {settingsForm.heroShowBadge !== false && (
                  <div>
                    <label className="text-[11px] text-[#5C5852] font-semibold block mb-1">Texto de la Insignia:</label>
                    <input
                      type="text"
                      value={settingsForm.heroBadge ?? 'EXPERIENCIA EXCLUSIVA EN POLANCO'}
                      onChange={(e) => setSettingsForm({ ...settingsForm, heroBadge: e.target.value })}
                      placeholder="EXPERIENCIA EXCLUSIVA EN POLANCO"
                      className="w-full p-2.5 rounded-xl bg-[#FAF9F6] border border-[#D2CBBF] text-[#161514] placeholder:text-[#8E887E] text-xs focus:outline-none focus:border-[#9A6B3B] transition-all"
                    />
                  </div>
                )}
              </div>

              {/* 3. TITLE TOGGLE & INPUT */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#E6E1D6] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Type className="w-4 h-4 text-[#9A6B3B]" />
                    <div>
                      <span className="text-xs font-bold text-[#161514] block">Título Principal de Portada</span>
                      <span className="text-[11px] text-[#5C5852] block">
                        Encabezado tipográfico de mayor impacto en la portada.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSettingsForm((prev) => ({
                        ...prev,
                        heroShowTitle: prev.heroShowTitle !== undefined ? !prev.heroShowTitle : false,
                      }))
                    }
                    className={`transition-colors ${
                      settingsForm.heroShowTitle !== false ? 'text-[#9A6B3B]' : 'text-[#8E887E]'
                    }`}
                  >
                    {settingsForm.heroShowTitle !== false ? (
                      <ToggleRight className="w-8 h-8" />
                    ) : (
                      <ToggleLeft className="w-8 h-8" />
                    )}
                  </button>
                </div>

                {settingsForm.heroShowTitle !== false && (
                  <div>
                    <label className="text-[11px] text-[#5C5852] font-semibold block mb-1">Texto del Título:</label>
                    <input
                      type="text"
                      value={settingsForm.heroTitle ?? 'El arte del corte clásico y la barbería contemporánea.'}
                      onChange={(e) => setSettingsForm({ ...settingsForm, heroTitle: e.target.value })}
                      placeholder="El arte del corte clásico y la barbería contemporánea."
                      className="w-full p-2.5 rounded-xl bg-[#FAF9F6] border border-[#D2CBBF] text-[#161514] placeholder:text-[#8E887E] text-xs focus:outline-none focus:border-[#9A6B3B] transition-all"
                    />
                  </div>
                )}
              </div>

              {/* 4. SUBTITLE TOGGLE & INPUT */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#E6E1D6] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#9A6B3B]" />
                    <div>
                      <span className="text-xs font-bold text-[#161514] block">Subtítulo o Descripción</span>
                      <span className="text-[11px] text-[#5C5852] block">
                        Párrafo complementario que describe la propuesta de valor.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSettingsForm((prev) => ({
                        ...prev,
                        heroShowSubtitle: prev.heroShowSubtitle !== undefined ? !prev.heroShowSubtitle : false,
                      }))
                    }
                    className={`transition-colors ${
                      settingsForm.heroShowSubtitle !== false ? 'text-[#9A6B3B]' : 'text-[#8E887E]'
                    }`}
                  >
                    {settingsForm.heroShowSubtitle !== false ? (
                      <ToggleRight className="w-8 h-8" />
                    ) : (
                      <ToggleLeft className="w-8 h-8" />
                    )}
                  </button>
                </div>

                {settingsForm.heroShowSubtitle !== false && (
                  <div>
                    <label className="text-[11px] text-[#5C5852] font-semibold block mb-1">Texto del Subtítulo:</label>
                    <textarea
                      rows={2}
                      value={
                        settingsForm.heroSubtitle ??
                        (settingsForm.tagline || 'Donde la elegancia y la maestría se encuentran.')
                      }
                      onChange={(e) => setSettingsForm({ ...settingsForm, heroSubtitle: e.target.value })}
                      placeholder="Donde la elegancia y la maestría se encuentran."
                      className="w-full p-2.5 rounded-xl bg-[#FAF9F6] border border-[#D2CBBF] text-[#161514] placeholder:text-[#8E887E] text-xs focus:outline-none focus:border-[#9A6B3B] transition-all"
                    />
                  </div>
                )}
              </div>

              {/* 5. BUTTON TOGGLE & INPUT */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#E6E1D6] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MousePointerClick className="w-4 h-4 text-[#9A6B3B]" />
                    <div>
                      <span className="text-xs font-bold text-[#161514] block">Botón de Reserva de Cita</span>
                      <span className="text-[11px] text-[#5C5852] block">
                        Llamado a la acción que abre de inmediato el flujo de agendamiento.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSettingsForm((prev) => ({
                        ...prev,
                        heroShowButton: prev.heroShowButton !== undefined ? !prev.heroShowButton : false,
                      }))
                    }
                    className={`transition-colors ${
                      settingsForm.heroShowButton !== false ? 'text-[#9A6B3B]' : 'text-[#8E887E]'
                    }`}
                  >
                    {settingsForm.heroShowButton !== false ? (
                      <ToggleRight className="w-8 h-8" />
                    ) : (
                      <ToggleLeft className="w-8 h-8" />
                    )}
                  </button>
                </div>

                {settingsForm.heroShowButton !== false && (
                  <div>
                    <label className="text-[11px] text-[#5C5852] font-semibold block mb-1">Texto del Botón:</label>
                    <input
                      type="text"
                      value={settingsForm.heroButtonText ?? 'Reservar Cita Ahora'}
                      onChange={(e) => setSettingsForm({ ...settingsForm, heroButtonText: e.target.value })}
                      placeholder="Reservar Cita Ahora"
                      className="w-full p-2.5 rounded-xl bg-[#FAF9F6] border border-[#D2CBBF] text-[#161514] placeholder:text-[#8E887E] text-xs focus:outline-none focus:border-[#9A6B3B] transition-all"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. GENERAL BUSINESS DETAILS */}
          <div className="space-y-4">
            <h3 className="font-display text-base font-bold text-[#161514] uppercase tracking-wider">
              Información de la Barbería
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-[#5C5852] font-semibold block mb-1">Nombre Comercial</label>
                <input
                  type="text"
                  value={settingsForm.name}
                  onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#FAF9F6] border border-[#D2CBBF] text-[#161514] focus:outline-none focus:border-[#9A6B3B]"
                />
              </div>

              <div>
                <label className="text-[#5C5852] font-semibold block mb-1">Slogan / Tagline</label>
                <input
                  type="text"
                  value={settingsForm.tagline}
                  onChange={(e) => setSettingsForm({ ...settingsForm, tagline: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#FAF9F6] border border-[#D2CBBF] text-[#161514] focus:outline-none focus:border-[#9A6B3B]"
                />
              </div>

              <div>
                <label className="text-[#5C5852] font-semibold block mb-1">Dirección Sucursal</label>
                <input
                  type="text"
                  value={settingsForm.address}
                  onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#FAF9F6] border border-[#D2CBBF] text-[#161514] focus:outline-none focus:border-[#9A6B3B]"
                />
              </div>

              <div>
                <label className="text-[#5C5852] font-semibold block mb-1">WhatsApp de Atención</label>
                <input
                  type="text"
                  value={settingsForm.whatsapp}
                  onChange={(e) => setSettingsForm({ ...settingsForm, whatsapp: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#FAF9F6] border border-[#D2CBBF] text-[#161514] font-mono focus:outline-none focus:border-[#9A6B3B]"
                />
              </div>

              <div>
                <label className="text-[#5C5852] font-semibold block mb-1">Instagram (@usuario)</label>
                <input
                  type="text"
                  value={settingsForm.instagram}
                  onChange={(e) => setSettingsForm({ ...settingsForm, instagram: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#FAF9F6] border border-[#D2CBBF] text-[#161514] focus:outline-none focus:border-[#9A6B3B]"
                />
              </div>

              <div>
                <label className="text-[#5C5852] font-semibold block mb-1">Teléfono Fijo</label>
                <input
                  type="text"
                  value={settingsForm.phone}
                  onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#FAF9F6] border border-[#D2CBBF] text-[#161514] font-mono focus:outline-none focus:border-[#9A6B3B]"
                />
              </div>

              <div>
                <label className="text-[#5C5852] font-semibold block mb-1">Horas Mínimas para Cancelar Gratis</label>
                <input
                  type="number"
                  value={settingsForm.minCancelNoticeHours}
                  onChange={(e) => setSettingsForm({ ...settingsForm, minCancelNoticeHours: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl bg-[#FAF9F6] border border-[#D2CBBF] text-[#161514] font-mono focus:outline-none focus:border-[#9A6B3B]"
                />
              </div>

              <div>
                <label className="text-[#5C5852] font-semibold block mb-1">Días Máximos de Anticipación para Reservar</label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={settingsForm.maxBookingAdvanceDays}
                  onChange={(e) => setSettingsForm({ ...settingsForm, maxBookingAdvanceDays: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl bg-[#FAF9F6] border border-[#D2CBBF] text-[#161514] font-mono focus:outline-none focus:border-[#9A6B3B]"
                />
              </div>
            </div>
          </div>

          {/* 4. BARBERSHOP OPERATING HOURS & ADAPTIVE AGENDA */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF9F6] border border-[#9A6B3B]/35 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E6E1D6]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#161514] flex items-center justify-center text-[#C69765]">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-[#161514] uppercase tracking-wider">
                    Horario de la Barbería & Agenda Adaptativa
                  </h3>
                  <p className="text-[11px] text-[#5C5852]">
                    Define los días y turnos en que está abierta la barbería. Las citas se limitan a este horario y los bloques se adaptan a la duración de cada servicio.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const monday = activeWeeklySchedule[1];
                    if (!monday?.isOpen || !monday.slots.length) return;
                    setSettingsForm((prev) => {
                      const base = prev.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE;
                      const next: WeeklySchedule = { ...base };
                      ([2, 3, 4, 5, 6] as const).forEach((k) => {
                        if (next[k]?.isOpen) {
                          next[k] = {
                            isOpen: true,
                            slots: monday.slots.map((s) => ({ ...s })),
                          };
                        }
                      });
                      return { ...prev, weeklySchedule: next };
                    });
                    showToast('info', 'Horario copiado', 'Se aplicó el horario del Lunes a todos los días abiertos.');
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#F2EFE9] border border-[#D2CBBF] text-[#161514] text-[11px] font-semibold transition-colors"
                >
                  Copiar Lunes a abiertos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSettingsForm((prev) => ({
                      ...prev,
                      weeklySchedule: {
                        0: { isOpen: false, slots: [] },
                        1: { isOpen: true, slots: [{ start: '10:00', end: '20:00' }] },
                        2: { isOpen: true, slots: [{ start: '10:00', end: '20:00' }] },
                        3: { isOpen: true, slots: [{ start: '10:00', end: '20:00' }] },
                        4: { isOpen: true, slots: [{ start: '10:00', end: '20:00' }] },
                        5: { isOpen: true, slots: [{ start: '10:00', end: '21:00' }] },
                        6: { isOpen: true, slots: [{ start: '09:00', end: '18:00' }] },
                      },
                    }));
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#F2EFE9] border border-[#D2CBBF] text-[#9A6B3B] text-[11px] font-semibold transition-colors"
                >
                  Horario Continuo L-S
                </button>
              </div>
            </div>

            {/* Slot Grid Base & Minimum Notice */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div className="p-3.5 rounded-2xl bg-white border border-[#E6E1D6] space-y-1.5">
                <label className="text-[#161514] font-bold block">
                  Intervalo Base de Horarios en Agenda
                </label>
                <select
                  value={settingsForm.slotIntervalMinutes || 30}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, slotIntervalMinutes: Number(e.target.value) })
                  }
                  className="w-full p-2.5 rounded-xl bg-[#FAF9F6] border border-[#D2CBBF] text-[#161514] font-mono font-semibold focus:outline-none focus:border-[#9A6B3B]"
                >
                  <option value={15}>Cada 15 minutos</option>
                  <option value={20}>Cada 20 minutos</option>
                  <option value={30}>Cada 30 minutos (Estándar recomendado)</option>
                  <option value={45}>Cada 45 minutos</option>
                  <option value={60}>Cada 60 minutos</option>
                </select>
                <p className="text-[10px] text-[#5C5852] leading-relaxed">
                  Los turnos se adaptan automáticamente a la duración de cada servicio registrado: si un servicio dura menos que el intervalo base, se ajusta a su duración exacta; si dura más (ej. 40 min en bloque de 30 min), optimiza el cierre para evitar empalmes y tiempos muertos.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-[#E6E1D6] space-y-1.5">
                <label className="text-[#161514] font-bold block">
                  Anticipación Mínima para Agendar (minutos)
                </label>
                <input
                  type="number"
                  min={0}
                  max={720}
                  value={settingsForm.minBookingNoticeMinutes ?? 30}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, minBookingNoticeMinutes: Math.max(0, Number(e.target.value)) })
                  }
                  className="w-full p-2.5 rounded-xl bg-[#FAF9F6] border border-[#D2CBBF] text-[#161514] font-mono font-semibold focus:outline-none focus:border-[#9A6B3B]"
                />
                <p className="text-[10px] text-[#5C5852] leading-relaxed">
                  Tiempo mínimo antes de la cita para que un cliente pueda reservar en línea el mismo día (ej. 30 min).
                </p>
              </div>
            </div>

            {/* 7-Day Operating Schedule List */}
            <div className="space-y-2">
              {SHOP_DAYS.map(({ key, label }) => {
                const dayCfg = activeWeeklySchedule[key] || { isOpen: false, slots: [] };
                return (
                  <div
                    key={key}
                    className={`p-3 rounded-2xl border transition-all ${
                      dayCfg.isOpen
                        ? 'bg-white border-[#E6E1D6]'
                        : 'bg-[#F2EFE9]/60 border-[#E6E1D6] opacity-80'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center justify-between sm:justify-start gap-3 min-w-[140px]">
                        <button
                          type="button"
                          onClick={() =>
                            updateShopDaySchedule(key, (prevDay) => ({
                              isOpen: !prevDay.isOpen,
                              slots: !prevDay.isOpen
                                ? prevDay.slots && prevDay.slots.length > 0
                                  ? prevDay.slots
                                  : [{ start: '10:00', end: '20:00' }]
                                : prevDay.slots,
                            }))
                          }
                          className={`transition-colors ${dayCfg.isOpen ? 'text-[#9A6B3B]' : 'text-[#8E887E]'}`}
                          title={dayCfg.isOpen ? 'Marcar como cerrado' : 'Marcar como abierto'}
                        >
                          {dayCfg.isOpen ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                        </button>
                        <div>
                          <span className="font-bold text-[#161514] text-xs block">{label}</span>
                          <span className={`text-[10px] font-semibold ${dayCfg.isOpen ? 'text-emerald-700' : 'text-[#767067]'}`}>
                            {dayCfg.isOpen ? 'Abierto' : 'Cerrado'}
                          </span>
                        </div>
                      </div>

                      {dayCfg.isOpen ? (
                        <div className="flex-1 flex flex-col gap-2">
                          {dayCfg.slots.map((slot, sIdx) => (
                            <div key={sIdx} className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="text-[10px] text-[#5C5852] font-semibold uppercase tracking-wider w-14">
                                {dayCfg.slots.length > 1 ? `Turno ${sIdx + 1}` : 'Horario'}
                              </span>
                              <input
                                type="time"
                                value={slot.start}
                                onChange={(e) =>
                                  updateShopDaySchedule(key, (prevDay) => ({
                                    ...prevDay,
                                    slots: prevDay.slots.map((item, idx) =>
                                      idx === sIdx ? { ...item, start: e.target.value } : item
                                    ),
                                  }))
                                }
                                className="px-2.5 py-1.5 rounded-xl bg-[#FAF9F6] border border-[#D2CBBF] text-[#161514] font-mono text-xs focus:outline-none focus:border-[#9A6B3B]"
                              />
                              <span className="text-[#5C5852] font-semibold">a</span>
                              <input
                                type="time"
                                value={slot.end}
                                onChange={(e) =>
                                  updateShopDaySchedule(key, (prevDay) => ({
                                    ...prevDay,
                                    slots: prevDay.slots.map((item, idx) =>
                                      idx === sIdx ? { ...item, end: e.target.value } : item
                                    ),
                                  }))
                                }
                                className="px-2.5 py-1.5 rounded-xl bg-[#FAF9F6] border border-[#D2CBBF] text-[#161514] font-mono text-xs focus:outline-none focus:border-[#9A6B3B]"
                              />

                              {dayCfg.slots.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateShopDaySchedule(key, (prevDay) => ({
                                      ...prevDay,
                                      slots: prevDay.slots.filter((_, idx) => idx !== sIdx),
                                    }))
                                  }
                                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700"
                                  title="Eliminar turno"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {sIdx === dayCfg.slots.length - 1 && dayCfg.slots.length < 3 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateShopDaySchedule(key, (prevDay) => ({
                                      ...prevDay,
                                      slots: [...prevDay.slots, { start: '15:00', end: '20:00' }],
                                    }))
                                  }
                                  className="px-2 py-1 rounded-lg bg-[#F2EFE9] hover:bg-[#E8E3D9] border border-[#D2CBBF] text-[#161514] text-[10px] font-semibold flex items-center gap-1"
                                  title="Agregar descanso o segundo turno"
                                >
                                  <Plus className="w-3 h-3 text-[#9A6B3B]" />
                                  <span>Turno / Comida</span>
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#767067] italic">
                          Sin citas disponibles este día
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleSaveSettingsSubmit}
              disabled={isSavingSettings || isUploadingLogo}
              className="w-full py-3.5 rounded-2xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] font-bold text-xs shadow-sm active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4 text-[#C69765]" />
              <span>{isSavingSettings ? 'Guardando cambios...' : 'Guardar Logotipo, Horarios y Configuración'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
