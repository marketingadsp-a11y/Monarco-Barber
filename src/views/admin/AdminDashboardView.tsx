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
} from 'lucide-react';
import { useBarbershop } from '../../contexts/BarbershopContext';
import { useAuth } from '../../contexts/AuthContext';
import { Barber, Service, Appointment, BusinessSettings, NotificationSettings } from '../../types';
import { formatCurrency, formatDateSpanish, formatTime12h, getTodayDateString } from '../../utils/dateTime';
import { imageService } from '../../services/imgbb/imageService';
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

  useEffect(() => {
    if (isBrowserNotificationSupported()) {
      setBrowserPermission(getBrowserNotificationPermission());
    }
  }, []);

  // Service Edit/Create Modal State
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);
  const [isSavingService, setIsSavingService] = useState(false);
  const [isUploadingServicePhoto, setIsUploadingServicePhoto] = useState(false);
  const servicePhotoInputRef = useRef<HTMLInputElement>(null);

  // Barber Edit/Create Modal State
  const [editingBarber, setEditingBarber] = useState<Partial<Barber> | null>(null);
  const [isSavingBarber, setIsSavingBarber] = useState(false);
  const [isUploadingBarberPhoto, setIsUploadingBarberPhoto] = useState(false);
  const barberPhotoInputRef = useRef<HTMLInputElement>(null);

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
    }
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

  const handleSaveBarberSubmit = async () => {
    if (!editingBarber?.displayName) {
      showToast('error', 'Nombre requerido', 'El barbero debe tener un nombre.');
      return;
    }
    setIsSavingBarber(true);
    try {
      await saveBarber(editingBarber);
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

  const handleSaveSettingsSubmit = async () => {
    setIsSavingSettings(true);
    try {
      await saveSettings(settingsForm);
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Admin Header */}
      <div className="rounded-3xl bg-gradient-to-r from-[#181D26] to-[#12151B] border border-white/15 p-4 sm:p-5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 shrink-0">
          {businessSettings.logoUrl ? (
            <img
              src={businessSettings.logoUrl}
              alt="Logo Monarca Barber"
              className="h-10 sm:h-12 w-auto max-w-[170px] object-contain shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex items-center gap-2 text-[#D4AF37]">
              <Shield className="w-6 h-6" />
              <span className="font-black text-white text-base tracking-wider">MONARCA</span>
            </div>
          )}
        </div>

        {/* Navigation Section Pills & Logout */}
        <div className="flex flex-wrap items-center p-1 rounded-2xl bg-black/40 border border-white/10 w-full sm:w-auto gap-1">
          <button
            onClick={() => setActiveSection('overview')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSection === 'overview' ? 'bg-[#D4AF37] text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Métricas
          </button>
          <button
            onClick={() => setActiveSection('users')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSection === 'users' ? 'bg-[#D4AF37] text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Usuarios</span>
          </button>
          <button
            onClick={() => setActiveSection('appointments')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSection === 'appointments' ? 'bg-[#D4AF37] text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Citas ({appointments.length})
          </button>
          <button
            onClick={() => setActiveSection('services')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSection === 'services' ? 'bg-[#D4AF37] text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Servicios ({services.length})
          </button>
          <button
            onClick={() => setActiveSection('barbers')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSection === 'barbers' ? 'bg-[#D4AF37] text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Barberos ({barbers.length})
          </button>
          <button
            onClick={() => setActiveSection('products')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSection === 'products' ? 'bg-[#D4AF37] text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Productos & POS</span>
          </button>
          <button
            onClick={() => setActiveSection('notifications')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSection === 'notifications' ? 'bg-[#D4AF37] text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Notificaciones</span>
          </button>
          <button
            onClick={() => setActiveSection('settings')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSection === 'settings' ? 'bg-[#D4AF37] text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Logo & Ajustes
          </button>
          <button
            onClick={async () => {
              await logout();
              showToast('info', 'Sesión cerrada', 'Has cerrado sesión del panel de administración.');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all ml-auto sm:ml-1"
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
            className="p-4 rounded-3xl bg-gradient-to-r from-[#181D27] via-[#141720] to-[#101217] border border-[#D4AF37]/30 hover:border-[#D4AF37] p-5 cursor-pointer shadow-xl transition-all duration-150 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm group-hover:text-[#D4AF37] transition-colors">
                  Directorio y Expedientes de Clientes
                </h4>
                <p className="text-xs text-slate-400">
                  Ver usuarios registrados, consultar QR, modificar puntos, ajustar visitas o asignar roles de barbero/admin.
                </p>
              </div>
            </div>

            <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#D4AF37] text-slate-950 font-bold text-xs shadow-md group-hover:bg-[#E5B869] transition-colors self-end sm:self-auto">
              <span>Abrir Directorio</span>
              <ChevronRight className="w-3.5 h-3.5" />
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#14171E] border border-white/10 p-3.5 rounded-2xl">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-xs font-bold text-white">Filtros de Citas</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={appointmentFilterBarber}
                onChange={(e) => setAppointmentFilterBarber(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs"
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
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs"
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
              <div className="p-8 rounded-3xl bg-[#14171E] border border-white/10 text-center text-xs text-slate-400">
                No se encontraron citas con los filtros seleccionados.
              </div>
            ) : (
              filteredAppointments.map((app) => (
                <div
                  key={app.id}
                  className="rounded-2xl bg-[#14171E] border border-white/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">
                        {app.serviceNameSnapshot}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          app.status === 'confirmed'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : app.status === 'completed'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {app.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-3">
                      <span>👤 Cliente: <strong className="text-slate-200">{app.clientName}</strong></span>
                      <span>💈 Barbero: <strong className="text-[#D4AF37]">{app.barberName}</strong></span>
                      <span>📅 {formatDateSpanish(app.date)} • {formatTime12h(app.startTime)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-black text-white text-sm mr-2">
                      {formatCurrency(app.servicePriceSnapshot)}
                    </span>
                    {app.status === 'confirmed' && (
                      <>
                        <button
                          onClick={() => updateAppointmentStatus(app.id, 'completed')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all"
                        >
                          Completar
                        </button>
                        <button
                          onClick={() => updateAppointmentStatus(app.id, 'cancelled', { cancelledBy: 'admin', cancelReason: 'Cancelada por administración' })}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold"
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
              <h3 className="text-base font-bold text-white">Catálogo de Servicios</h3>
              <p className="text-xs text-slate-400">
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
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#D4AF37] text-slate-950 text-xs font-bold shadow-lg hover:bg-[#E5B869] transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Servicio</span>
            </button>
          </div>

          <div className="grid gap-3">
            {services.map((service) => (
              <div
                key={service.id}
                className="rounded-2xl bg-[#14171E] border border-white/10 p-4 flex items-center justify-between gap-3 shadow-lg"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={service.imageUrl || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80'}
                    alt={service.name}
                    className="w-14 h-14 rounded-xl object-cover border border-white/15 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-sm truncate">{service.name}</h4>
                      {service.isPopular && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-[#D4AF37]">
                          VIP
                        </span>
                      )}
                      {service.barberId && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300">
                          Personalizado por Barbero
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {service.durationMinutes} min • <strong className="text-[#D4AF37]">{formatCurrency(service.price)}</strong>
                    </p>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{service.description}</p>
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
                    onClick={() => setEditingService(service)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteServiceSubmit(service.id)}
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300"
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
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-[#14171E] border border-white/15 rounded-3xl p-5 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
                <h3 className="text-base font-bold text-white">
                  {editingService.id ? 'Editar Servicio' : 'Crear Nuevo Servicio'}
                </h3>

                <div className="space-y-3.5 text-xs">
                  {/* Photo of Service */}
                  <div className="space-y-2">
                    <label className="text-slate-300 font-semibold block">Fotografía del Servicio</label>
                    <div className="flex items-center gap-3">
                      {editingService.imageUrl && (
                        <img
                          src={editingService.imageUrl}
                          alt="Preview servicio"
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-[#D4AF37]"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div className="flex-1 space-y-1.5">
                        <label className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 cursor-pointer font-bold transition-all">
                          <Upload className="w-4 h-4 text-[#D4AF37]" />
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
                          className="w-full p-2 rounded-xl bg-slate-900 border border-white/10 text-white text-[11px]"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Nombre del Servicio *</label>
                    <input
                      type="text"
                      value={editingService.name || ''}
                      onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                      placeholder="Ej. Corte Imperial & Ritual Navaja"
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 block mb-1">Precio ($ MXN) *</label>
                      <input
                        type="number"
                        value={editingService.price || 0}
                        onChange={(e) => setEditingService({ ...editingService, price: Number(e.target.value) })}
                        className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Duración (minutos) *</label>
                      <input
                        type="number"
                        value={editingService.durationMinutes || 30}
                        onChange={(e) => setEditingService({ ...editingService, durationMinutes: Number(e.target.value) })}
                        className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Descripción detallada</label>
                    <textarea
                      value={editingService.description || ''}
                      onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                      rows={3}
                      placeholder="Describe qué incluye el servicio..."
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white"
                    />
                  </div>

                  <div className="flex items-center gap-4 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingService.isPopular || false}
                        onChange={(e) => setEditingService({ ...editingService, isPopular: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-white">Destacado VIP</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingService.includesWash || false}
                        onChange={(e) => setEditingService({ ...editingService, includesWash: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-white">Incluye Lavado</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setEditingService(null)}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 text-slate-300 text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveServiceSubmit}
                    disabled={isSavingService || isUploadingServicePhoto}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 text-xs font-bold shadow-md"
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
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Equipo de Barberos</h3>
              <p className="text-xs text-slate-400">
                Gestiona perfiles, estados y asignación de servicios
              </p>
            </div>
            <button
              onClick={() =>
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
                })
              }
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#D4AF37] text-slate-950 text-xs font-bold shadow-lg hover:bg-[#E5B869] transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Barbero</span>
            </button>
          </div>

          <div className="grid gap-3">
            {barbers.map((barber) => (
              <div
                key={barber.id}
                className="rounded-2xl bg-[#14171E] border border-white/10 p-4 flex items-center justify-between gap-3 shadow-lg"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={barber.photoUrl}
                    alt={barber.displayName}
                    className="w-12 h-12 rounded-xl object-cover border border-white/15"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h4 className="font-bold text-white text-sm">{barber.displayName}</h4>
                    <p className="text-xs text-[#D4AF37]">
                      ★ {barber.rating.toFixed(1)} ({barber.reviewCount} citas) • {barber.specialties.join(', ')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleBarberActive(barber.id, !barber.active)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-all"
                    title={barber.active ? 'Desactivar barbero' : 'Activar barbero'}
                  >
                    {barber.active ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-slate-500" />}
                  </button>
                  <button
                    onClick={() => setEditingBarber(barber)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all"
                    title="Editar datos del barbero"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteBarberSubmit(barber.id, barber.displayName)}
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition-all"
                    title="Eliminar barbero del equipo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Barber Edit Modal */}
          {editingBarber && (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-[#14171E] border border-white/15 rounded-3xl p-5 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
                <h3 className="text-base font-bold text-white">
                  {editingBarber.id ? 'Editar Barbero' : 'Nuevo Barbero'}
                </h3>

                <div className="space-y-3.5 text-xs">
                  {/* Photo of Barber */}
                  <div className="space-y-2">
                    <label className="text-slate-300 font-semibold block">Fotografía del Barbero</label>
                    <div className="flex items-center gap-3">
                      {editingBarber.photoUrl && (
                        <img
                          src={editingBarber.photoUrl}
                          alt="Preview barbero"
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-[#D4AF37] shadow-md shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div className="flex-1 space-y-1.5">
                        <label className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 cursor-pointer font-bold transition-all">
                          <Upload className="w-4 h-4 text-[#D4AF37]" />
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
                          className="w-full p-2 rounded-xl bg-slate-900 border border-white/10 text-white text-[11px]"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Nombre Completo *</label>
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
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Especialidades (separadas por coma)</label>
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
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Años de Experiencia</label>
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
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Biografía</label>
                    <textarea
                      value={editingBarber.bio || ''}
                      onChange={(e) => setEditingBarber({ ...editingBarber, bio: e.target.value })}
                      rows={2}
                      placeholder="Breve reseña del estilo y trayectoria del barbero..."
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setEditingBarber(null)}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 text-slate-300 text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveBarberSubmit}
                    disabled={isSavingBarber || isUploadingBarberPhoto}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 text-xs font-bold"
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
        <div className="rounded-3xl bg-[#14171E] border border-white/10 p-5 space-y-6 shadow-2xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#1E232F] via-[#161922] to-[#12141A] border border-[#D4AF37]/30">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shadow-lg">
                <BellRing className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Centro de Notificaciones & Recordatorios
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Tiempo Real
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Controla las alertas de nuevas citas para barberos y recordatorios automáticos (24h y 2h antes) para clientes.
                </p>
              </div>
            </div>

            {/* Browser Permission Status Badge & Action */}
            <div className="flex flex-wrap items-center gap-2">
              <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 ${
                browserPermission === 'granted'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : browserPermission === 'denied'
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
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
                  className="px-3.5 py-1.5 rounded-xl bg-[#D4AF37] hover:bg-[#E5B869] text-slate-950 text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Activar Permisos</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* 1. NOTIFICACIONES PARA BARBEROS */}
            <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <Scissors className="w-4 h-4 text-[#D4AF37]" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Panel del Barbero (En Vivo)
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Alertas de Agenda</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Cuando un cliente reserva un corte o servicio directamente en la agenda del barbero:
              </p>

              <div className="space-y-3 pt-1">
                {/* Toggle: Toast en pantalla */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="pr-3">
                    <span className="text-xs font-bold text-white block">Mensaje Toast en Pantalla</span>
                    <span className="text-[11px] text-slate-400 block">
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
                      notificationSettings.barberNewBookingToast ? 'text-[#D4AF37]' : 'text-slate-600'
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
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="pr-3">
                    <span className="text-xs font-bold text-white block">Sonido / Chime de Notificación</span>
                    <span className="text-[11px] text-slate-400 block">
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
                      notificationSettings.barberNewBookingSound ? 'text-[#D4AF37]' : 'text-slate-600'
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
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="pr-3">
                    <span className="text-xs font-bold text-white block">Notificación de Navegador (Push)</span>
                    <span className="text-[11px] text-slate-400 block">
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
                      notificationSettings.barberBrowserPush ? 'text-[#D4AF37]' : 'text-slate-600'
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
                  className="w-full py-2.5 rounded-xl bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#D4AF37] border border-[#D4AF37]/30 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Probar Notificación de Nueva Cita (Barbero)</span>
                </button>
              </div>
            </div>

            {/* 2. NOTIFICACIONES Y RECORDATORIOS PARA CLIENTES */}
            <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Panel del Cliente (Recordatorios)
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Experiencia VIP</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Recordatorios automatizados para evitar inasistencias y confirmar citas:
              </p>

              <div className="space-y-3 pt-1">
                {/* Toggle: Confirmación instantánea */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="pr-3">
                    <span className="text-xs font-bold text-white block">Confirmación al Reservar</span>
                    <span className="text-[11px] text-slate-400 block">
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
                      notificationSettings.clientBookingConfirmation ? 'text-emerald-400' : 'text-slate-600'
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
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="pr-3">
                    <span className="text-xs font-bold text-white block">Recordatorio 1 Día Antes (24 Horas)</span>
                    <span className="text-[11px] text-slate-400 block">
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
                      notificationSettings.clientReminder24h ? 'text-emerald-400' : 'text-slate-600'
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
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="pr-3">
                    <span className="text-xs font-bold text-white block">Recordatorio 2 Horas Antes</span>
                    <span className="text-[11px] text-slate-400 block">
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
                      notificationSettings.clientReminder2h ? 'text-emerald-400' : 'text-slate-600'
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
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="pr-3">
                    <span className="text-xs font-bold text-white block">Notificación de Navegador para Clientes</span>
                    <span className="text-[11px] text-slate-400 block">
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
                      notificationSettings.clientBrowserPush ? 'text-emerald-400' : 'text-slate-600'
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
                  className="py-2.5 px-2 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all text-center"
                >
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>Probar 1 Día Antes</span>
                </button>
                <button
                  type="button"
                  onClick={() => testNotification('client_reminder_2h')}
                  className="py-2.5 px-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all text-center"
                >
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>Probar 2 Horas Antes</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3. AJUSTES GLOBALES DE AUDIO Y COMPATIBILIDAD */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-[#181D26] to-[#12151B] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Volume2 className="w-4 h-4 text-[#D4AF37]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
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
                  notificationSettings.enableAudioChime ? 'text-[#D4AF37]' : 'text-slate-600'
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
              <div className="p-3.5 rounded-xl bg-black/30 border border-white/5">
                <span className="text-slate-300 font-bold block flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5 text-[#D4AF37]" />
                  Google Chrome (PC / Mac / Android)
                </span>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Soporta síntesis Web Audio y notificaciones nativas de sistema en primer y segundo plano.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-black/30 border border-white/5">
                <span className="text-slate-300 font-bold block flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                  Apple Safari (iOS & macOS)
                </span>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  El motor sintetiza audio tras la primera interacción y envía push nativo en macOS e iOS 16.4+.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-black/30 border border-white/5 flex flex-col justify-between">
                <div>
                  <span className="text-slate-300 font-bold block">Prueba Rápida de Chime</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">Escucha el tono armónico de Monarca</p>
                </div>
                <button
                  type="button"
                  onClick={() => testNotification('sound_only')}
                  className="mt-2 py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Volume2 className="w-3 h-3" />
                  <span>Reproducir Sonido</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: BRAND IDENTITY & LOGO UPLOAD / SETTINGS */}
      {activeSection === 'settings' && (
        <div className="rounded-3xl bg-[#14171E] border border-white/10 p-5 space-y-6 shadow-2xl">
          {/* 1. BRAND LOGO UPLOADER */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/10 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Logotipo Oficial de Monarca Barber
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sube el logo de tu barbería. Este logotipo se mostrará en el encabezado de la app, tarjetas, tickets de reserva y perfiles.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
              {/* Logo Preview */}
              <div className="w-24 h-24 rounded-2xl bg-black/60 border-2 border-[#D4AF37]/60 flex items-center justify-center p-2 shrink-0 shadow-xl relative group">
                {settingsForm.logoUrl ? (
                  <img
                    src={settingsForm.logoUrl}
                    alt="Logo Monarca"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-xs font-bold text-slate-500 text-center">Sin Logo</span>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-2.5 w-full">
                <div className="flex flex-wrap gap-2">
                  <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#E5B869] text-slate-950 text-xs font-bold cursor-pointer transition-all shadow-md">
                    <Upload className="w-4 h-4" />
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
                      className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-semibold"
                    >
                      Remover Logo
                    </button>
                  )}
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">O escribe enlace URL directo:</label>
                  <input
                    type="url"
                    value={settingsForm.logoUrl || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, logoUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full p-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. BANNER DE INICIO / HERO MODULE EDITOR */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#181D27] to-[#12151C] border border-[#D4AF37]/30 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layout className="w-4 h-4 text-[#D4AF37]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Módulo de Inicio / Banner Principal (Hero)
                </h3>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSettingsForm((prev) => ({
                    ...prev,
                    heroBadge: 'EXPERIENCIA EXCLUSIVA EN POLANCO',
                    heroTitle: 'El arte del corte clásico y la barbería contemporánea.',
                    heroSubtitle: 'Donde la elegancia y la maestría se encuentran.',
                    heroButtonText: 'Reservar Cita Ahora',
                  }))
                }
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] font-semibold transition-all self-start sm:self-auto"
                title="Restaurar textos predeterminados"
              >
                <RotateCcw className="w-3 h-3 text-[#D4AF37]" />
                <span>Restaurar Predeterminados</span>
              </button>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              Personaliza los textos y llamados a la acción del banner superior que ven todos los clientes al entrar a la aplicación.
            </p>

            {/* LIVE PREVIEW OF THE HERO BANNER */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-wider block">
                Vista Previa en Tiempo Real:
              </span>
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1B202B] via-[#14171F] to-[#0D0F13] border border-white/15 p-5 shadow-lg">
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#D4AF37]/15 rounded-full blur-2xl pointer-events-none" />
                <div className="relative z-10 space-y-3 max-w-lg">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37] text-[10px] font-bold tracking-wide">
                    <Crown className="w-3 h-3" />
                    <span>{settingsForm.heroBadge || 'EXPERIENCIA EXCLUSIVA EN POLANCO'}</span>
                  </div>

                  <h2 className="text-lg sm:text-xl font-black text-white tracking-tight leading-snug">
                    {settingsForm.heroTitle || 'El arte del corte clásico y la barbería contemporánea.'}
                  </h2>

                  <p className="text-[11px] sm:text-xs text-slate-300 font-normal leading-relaxed">
                    {settingsForm.heroSubtitle || settingsForm.tagline || 'Donde la elegancia y la maestría se encuentran.'}
                  </p>

                  <div className="pt-1 flex items-center gap-2">
                    <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 font-bold text-xs shadow-md shadow-[#D4AF37]/20">
                      <Scissors className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{settingsForm.heroButtonText || 'Reservar Cita Ahora'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* FORM INPUTS FOR HERO BANNER */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 text-xs">
              <div className="sm:col-span-2">
                <label className="text-slate-300 font-semibold block mb-1 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Insignia / Distintivo Superior</span>
                </label>
                <input
                  type="text"
                  value={settingsForm.heroBadge ?? 'EXPERIENCIA EXCLUSIVA EN POLANCO'}
                  onChange={(e) => setSettingsForm({ ...settingsForm, heroBadge: e.target.value })}
                  placeholder="EXPERIENCIA EXCLUSIVA EN POLANCO"
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white focus:border-[#D4AF37] transition-all"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-slate-300 font-semibold block mb-1 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Título Principal de Portada</span>
                </label>
                <input
                  type="text"
                  value={settingsForm.heroTitle ?? 'El arte del corte clásico y la barbería contemporánea.'}
                  onChange={(e) => setSettingsForm({ ...settingsForm, heroTitle: e.target.value })}
                  placeholder="El arte del corte clásico y la barbería contemporánea."
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white focus:border-[#D4AF37] transition-all"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-slate-300 font-semibold block mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Subtítulo o Descripción de Bienvenida</span>
                </label>
                <textarea
                  rows={2}
                  value={settingsForm.heroSubtitle ?? (settingsForm.tagline || 'Donde la elegancia y la maestría se encuentran.')}
                  onChange={(e) => setSettingsForm({ ...settingsForm, heroSubtitle: e.target.value })}
                  placeholder="Donde la elegancia y la maestría se encuentran."
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white focus:border-[#D4AF37] transition-all"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-slate-300 font-semibold block mb-1 flex items-center gap-1.5">
                  <MousePointerClick className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Texto del Botón de Reserva</span>
                </label>
                <input
                  type="text"
                  value={settingsForm.heroButtonText ?? 'Reservar Cita Ahora'}
                  onChange={(e) => setSettingsForm({ ...settingsForm, heroButtonText: e.target.value })}
                  placeholder="Reservar Cita Ahora"
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white focus:border-[#D4AF37] transition-all"
                />
              </div>
            </div>
          </div>

          {/* 3. GENERAL BUSINESS DETAILS */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Información de la Barbería
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Nombre Comercial</label>
                <input
                  type="text"
                  value={settingsForm.name}
                  onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Slogan / Tagline</label>
                <input
                  type="text"
                  value={settingsForm.tagline}
                  onChange={(e) => setSettingsForm({ ...settingsForm, tagline: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Dirección Sucursal</label>
                <input
                  type="text"
                  value={settingsForm.address}
                  onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">WhatsApp de Atención</label>
                <input
                  type="text"
                  value={settingsForm.whatsapp}
                  onChange={(e) => setSettingsForm({ ...settingsForm, whatsapp: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Instagram (@usuario)</label>
                <input
                  type="text"
                  value={settingsForm.instagram}
                  onChange={(e) => setSettingsForm({ ...settingsForm, instagram: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Teléfono Fijo</label>
                <input
                  type="text"
                  value={settingsForm.phone}
                  onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Horas Mínimas para Cancelar Gratis</label>
                <input
                  type="number"
                  value={settingsForm.minCancelNoticeHours}
                  onChange={(e) => setSettingsForm({ ...settingsForm, minCancelNoticeHours: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Días Máximos de Anticipación para Reservar</label>
                <input
                  type="number"
                  value={settingsForm.maxBookingAdvanceDays}
                  onChange={(e) => setSettingsForm({ ...settingsForm, maxBookingAdvanceDays: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleSaveSettingsSubmit}
              disabled={isSavingSettings || isUploadingLogo}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 font-bold text-xs shadow-xl shadow-[#D4AF37]/20 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingSettings ? 'Guardando cambios...' : 'Guardar Logotipo y Configuración Global'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
