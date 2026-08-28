import React, { useState, useRef } from 'react';
import {
  Scissors,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Upload,
  Plus,
  Trash2,
  Save,
  User,
  Instagram,
  Settings,
  Sparkles,
  Phone,
  Image as ImageIcon,
  DollarSign,
  ChevronDown,
  Edit2,
  Check,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { useBarbershop } from '../../contexts/BarbershopContext';
import { useAuth } from '../../contexts/AuthContext';
import { Barber, Appointment, BlockedSlot, WeeklySchedule, Service } from '../../types';
import {
  formatDateSpanish,
  formatTime12h,
  formatCurrency,
  getTodayDateString,
} from '../../utils/dateTime';
import { imageService } from '../../services/imgbb/imageService';

export const BarberDashboardView: React.FC = () => {
  const { currentBarberId } = useAuth();
  const {
    barbers,
    services,
    appointments,
    schedules,
    blockedSlots,
    businessSettings,
    updateAppointmentStatus,
    saveBarber,
    saveBarberSchedule,
    addBlockedSlot,
    deleteBlockedSlot,
    saveService,
    deleteService,
    toggleServiceActive,
    showToast,
  } = useBarbershop();

  const [activeTab, setActiveTab] = useState<'agenda' | 'services' | 'schedule' | 'profile'>('agenda');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());

  // Block slot form state
  const [blockStart, setBlockStart] = useState('14:00');
  const [blockEnd, setBlockEnd] = useState('15:00');
  const [blockReason, setBlockReason] = useState('Comida / Descanso');
  const [isAddingBlock, setIsAddingBlock] = useState(false);

  // Profile Edit State
  const activeBarber = barbers.find((b) => b.id === currentBarberId) || barbers[0];
  const [bio, setBio] = useState(activeBarber?.bio || '');
  const [specialtiesText, setSpecialtiesText] = useState(
    activeBarber?.specialties.join(', ') || ''
  );
  const [phone, setPhone] = useState(activeBarber?.phone || '');
  const [instagram, setInstagram] = useState(activeBarber?.instagram || '');
  const [gallery, setGallery] = useState<string[]>(activeBarber?.gallery || []);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Barber Custom Service Modal State
  const [editingCustomService, setEditingCustomService] = useState<Partial<Service> | null>(null);
  const [isSavingCustomService, setIsSavingCustomService] = useState(false);
  const [isUploadingServicePhoto, setIsUploadingServicePhoto] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const servicePhotoInputRef = useRef<HTMLInputElement>(null);

  if (!activeBarber) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>No se encontró el perfil del barbero.</p>
      </div>
    );
  }

  // Filter barber appointments
  const barberAppointments = appointments.filter((a) => a.barberId === activeBarber.id);
  const todayAppointments = barberAppointments.filter((a) => a.date === selectedDate);
  const completedToday = todayAppointments.filter((a) => a.status === 'completed');
  const totalRevenueToday = completedToday.reduce((sum, a) => sum + (a.servicePriceSnapshot || 0), 0);

  // Blocked slots for this barber on selected date
  const dateBlockedSlots = blockedSlots.filter(
    (b) => b.barberId === activeBarber.id && b.date === selectedDate
  );

  // Global services vs Custom services by this barber
  const globalServices = services.filter((s) => !s.barberId || s.createdByType === 'admin');
  const myCustomServices = services.filter((s) => s.barberId === activeBarber.id);

  // Toggle global service offering by this barber
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

  // Upload Photo for Barber Custom Service
  const handleCustomServicePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingServicePhoto(true);
    try {
      const url = await imageService.uploadImage(file);
      setEditingCustomService((prev) => ({ ...prev, imageUrl: url }));
      showToast('success', 'Foto de servicio subida', 'Imagen cargada exitosamente.');
    } catch (err: any) {
      showToast('error', 'Error al subir foto', err.message);
    } finally {
      setIsUploadingServicePhoto(false);
    }
  };

  // Save Barber Custom Service
  const handleSaveCustomServiceSubmit = async () => {
    if (!editingCustomService?.name || !editingCustomService?.price || !editingCustomService?.durationMinutes) {
      showToast('error', 'Campos requeridos', 'Ingresa nombre, precio y duración.');
      return;
    }

    setIsSavingCustomService(true);
    try {
      const saved = await saveService({
        ...editingCustomService,
        barberId: activeBarber.id,
        createdByType: 'barber',
        active: editingCustomService.active !== undefined ? editingCustomService.active : true,
      });

      // Auto-assign to barber's serviceIds if new
      if (saved && typeof saved === 'string' && !activeBarber.serviceIds?.includes(saved)) {
        await saveBarber({
          ...activeBarber,
          serviceIds: [...(activeBarber.serviceIds || []), saved],
        });
      }

      setEditingCustomService(null);
      showToast('success', 'Servicio Guardado', 'Tu servicio personalizado ha sido publicado.');
    } catch (err: any) {
      showToast('error', 'Error al guardar', err.message);
    } finally {
      setIsSavingCustomService(false);
    }
  };

  const handleDeleteCustomService = async (serviceId: string) => {
    if (confirm('¿Deseas eliminar este servicio personalizado?')) {
      try {
        await deleteService(serviceId);
        showToast('info', 'Servicio Eliminado', 'El servicio fue retirado.');
      } catch (err: any) {
        showToast('error', 'Error', err.message);
      }
    }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const url = await imageService.uploadImage(file);
      const newGallery = [...gallery, url];
      setGallery(newGallery);
      await saveBarber({ ...activeBarber, gallery: newGallery });
      showToast('success', 'Foto agregada', 'La imagen fue subida y agregada a tu portafolio.');
    } catch (err: any) {
      showToast('error', 'Error al subir foto', err.message || 'No se pudo subir la imagen.');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeletePhoto = async (index: number) => {
    const newGallery = gallery.filter((_, i) => i !== index);
    setGallery(newGallery);
    await saveBarber({ ...activeBarber, gallery: newGallery });
    showToast('info', 'Foto eliminada', 'La foto fue removida de tu galería.');
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const specs = specialtiesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await saveBarber({
        ...activeBarber,
        bio: bio.trim(),
        specialties: specs,
        phone: phone.trim(),
        instagram: instagram.trim(),
        gallery,
      });
      showToast('success', 'Perfil Actualizado', 'Tus datos profesionales fueron guardados.');
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

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
    } catch (err: any) {
      showToast('error', 'Error al bloquear', err.message);
    } finally {
      setIsAddingBlock(false);
    }
  };

  return (
    <div className="space-y-5 pb-24">
      {/* Barber Header Card */}
      <div className="rounded-3xl bg-gradient-to-r from-[#181D26] to-[#12151B] border border-white/15 p-5 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <img
            src={activeBarber.photoUrl}
            alt={activeBarber.displayName}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-[#D4AF37] shadow-lg"
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
            <p className="text-xs text-slate-400">
              {activeBarber.specialties.slice(0, 3).join(' • ')}
            </p>
          </div>
        </div>

        {/* Navigation Pills */}
        <div className="flex flex-wrap p-1 rounded-2xl bg-black/40 border border-white/10 w-full sm:w-auto gap-1">
          <button
            onClick={() => setActiveTab('agenda')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'agenda' ? 'bg-[#D4AF37] text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Agenda
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'services' ? 'bg-[#D4AF37] text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Mis Servicios ({activeBarber.serviceIds?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'schedule' ? 'bg-[#D4AF37] text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Horarios & Bloqueos
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'profile' ? 'bg-[#D4AF37] text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Mi Portafolio
          </button>
        </div>
      </div>

      {/* TAB 1: AGENDA & DAILY STATS */}
      {activeTab === 'agenda' && (
        <div className="space-y-4">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-[#14171E] border border-white/10 shadow-lg">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Citas en la Fecha</span>
              <span className="text-xl font-black text-white mt-1 block">{todayAppointments.length}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#14171E] border border-white/10 shadow-lg">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Completadas</span>
              <span className="text-xl font-black text-emerald-400 mt-1 block">{completedToday.length}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#14171E] border border-white/10 shadow-lg">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Ingresos Generados</span>
              <span className="text-xl font-black text-[#D4AF37] mt-1 block">{formatCurrency(totalRevenueToday)}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#14171E] border border-white/10 shadow-lg">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Rating Promedio</span>
              <span className="text-xl font-black text-amber-400 mt-1 block">★ {activeBarber.rating.toFixed(2)}</span>
            </div>
          </div>

          {/* Date Selector */}
          <div className="flex items-center justify-between bg-[#14171E] border border-white/10 p-3 rounded-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Calendar className="w-4 h-4 text-[#D4AF37]" />
              <span>Fecha seleccionada: {formatDateSpanish(selectedDate)}</span>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1 rounded-xl bg-slate-900 border border-white/10 text-white text-xs"
            />
          </div>

          {/* Appointments of Selected Date */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
              Citas del día ({todayAppointments.length})
            </h3>

            {todayAppointments.length === 0 ? (
              <div className="p-8 rounded-3xl bg-[#14171E] border border-white/10 text-center text-xs text-slate-400">
                No tienes citas agendadas para el {formatDateSpanish(selectedDate)}.
              </div>
            ) : (
              todayAppointments.map((app) => {
                const isConfirmed = app.status === 'confirmed';
                const isCompleted = app.status === 'completed';
                const isCancelled = app.status === 'cancelled';

                return (
                  <div
                    key={app.id}
                    className="rounded-2xl bg-[#14171E] border border-white/10 p-4 space-y-3 shadow-lg"
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
                                : isCancelled
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {app.status}
                          </span>
                        </div>
                        <h4 className="font-bold text-white text-base mt-1">
                          {app.serviceNameSnapshot}
                        </h4>
                        <p className="text-xs text-slate-300 font-medium">
                          Cliente: <strong className="text-white">{app.clientName}</strong> ({app.clientPhone || 'Sin teléfono'})
                        </p>
                      </div>

                      <span className="font-black text-white text-sm">
                        {formatCurrency(app.servicePriceSnapshot)}
                      </span>
                    </div>

                    {app.notes && (
                      <p className="text-xs text-slate-400 bg-white/5 p-2 rounded-xl">
                        Nota: {app.notes}
                      </p>
                    )}

                    {/* Barber Quick Actions */}
                    {isConfirmed && (
                      <div className="pt-2 border-t border-white/5 flex items-center gap-2">
                        <button
                          onClick={() => updateAppointmentStatus(app.id, 'completed')}
                          className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition-all flex items-center justify-center gap-1"
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
                        <button
                          onClick={() => updateAppointmentStatus(app.id, 'cancelled', { cancelledBy: 'barber', cancelReason: 'Cancelado por barbero' })}
                          className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-semibold"
                        >
                          Cancelar
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

      {/* TAB 2: MY SERVICES (CUSTOM SERVICES & MASTER SERVICES SELECTION) */}
      {activeTab === 'services' && (
        <div className="space-y-6">
          {/* Header Action: Add Custom Service */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#14171E] border border-white/10 p-4 rounded-3xl">
            <div>
              <h3 className="text-base font-bold text-white">Mis Servicios Personalizados</h3>
              <p className="text-xs text-slate-400">
                Crea servicios únicos exclusivos de tu silla o selecciona los servicios generales que ofreces
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
                  isPopular: false,
                  includesWash: false,
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

          {/* 1. Custom Services Created By This Barber */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] px-1">
              Servicios Exclusivos Creados por Ti ({myCustomServices.length})
            </h4>

            {myCustomServices.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#14171E] border border-white/10 text-center text-xs text-slate-400">
                Aún no has creado servicios personalizados. Presiona <strong>"Crear Mi Servicio Personalizado"</strong> para añadir tus paquetes exclusivos con fotografía.
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
                            Mi Servicio
                          </span>
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
                        onClick={() => setEditingCustomService(service)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCustomService(service.id)}
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

          {/* 2. Global Services Selection Checklist */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 px-1">
              Servicios Oficiales de Monarca Barber (Marca las que ofreces)
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

          {/* Modal for Barber Custom Service */}
          {editingCustomService && (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-[#14171E] border border-white/15 rounded-3xl p-5 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
                <h3 className="text-base font-bold text-white">
                  {editingCustomService.id ? 'Editar Mi Servicio' : 'Nuevo Servicio Personalizado'}
                </h3>

                <div className="space-y-3.5 text-xs">
                  {/* Photo of Service */}
                  <div className="space-y-2">
                    <label className="text-slate-300 font-semibold block">Fotografía del Servicio</label>
                    <div className="flex items-center gap-3">
                      {editingCustomService.imageUrl && (
                        <img
                          src={editingCustomService.imageUrl}
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
                            onChange={handleCustomServicePhotoUpload}
                            disabled={isUploadingServicePhoto}
                            className="hidden"
                          />
                        </label>
                        <input
                          type="url"
                          value={editingCustomService.imageUrl || ''}
                          onChange={(e) => setEditingCustomService({ ...editingCustomService, imageUrl: e.target.value })}
                          placeholder="O enlace URL directo"
                          className="w-full p-2 rounded-xl bg-slate-900 border border-white/10 text-white text-[11px]"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Nombre del Servicio *</label>
                    <input
                      type="text"
                      value={editingCustomService.name || ''}
                      onChange={(e) => setEditingCustomService({ ...editingCustomService, name: e.target.value })}
                      placeholder="Ej. Fade Especial & Diseño Libre"
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 block mb-1">Precio ($ MXN) *</label>
                      <input
                        type="number"
                        value={editingCustomService.price || 0}
                        onChange={(e) => setEditingCustomService({ ...editingCustomService, price: Number(e.target.value) })}
                        className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Duración (minutos) *</label>
                      <input
                        type="number"
                        value={editingCustomService.durationMinutes || 45}
                        onChange={(e) => setEditingCustomService({ ...editingCustomService, durationMinutes: Number(e.target.value) })}
                        className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Descripción</label>
                    <textarea
                      value={editingCustomService.description || ''}
                      onChange={(e) => setEditingCustomService({ ...editingCustomService, description: e.target.value })}
                      rows={3}
                      placeholder="Explica qué incluye tu servicio personalizado..."
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setEditingCustomService(null)}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 text-slate-300 text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveCustomServiceSubmit}
                    disabled={isSavingCustomService || isUploadingServicePhoto}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 text-xs font-bold shadow-md"
                  >
                    {isSavingCustomService ? 'Guardando...' : 'Guardar Servicio'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SCHEDULE & BLOCKED SLOTS */}
      {activeTab === 'schedule' && (
        <div className="space-y-5">
          {/* Add Blocked Slot / Lunch Break Card */}
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
                  placeholder="Ej. Comida / Cita Médica"
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

          {/* Active Blocked Slots for this date */}
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

      {/* TAB 4: PROFILE & IMGBB GALLERY UPLOADER */}
      {activeTab === 'profile' && (
        <div className="rounded-3xl bg-[#14171E] border border-white/10 p-5 space-y-5 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Mi Portafolio & Galería de Trabajos
              </h3>
              <p className="text-xs text-slate-400">
                Las fotos que subas aparecerán en tu perfil público para los clientes.
              </p>
            </div>
          </div>

          {/* Image Upload Input */}
          <div className="p-4 rounded-2xl bg-white/5 border border-dashed border-white/20 text-center space-y-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleUploadImage}
              className="hidden"
            />
            <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center mx-auto">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-xs text-slate-300 font-medium">
              Sube fotos de tus mejores cortes y afeitados
            </p>
            <button
              type="button"
              disabled={isUploadingImage}
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#E5B869] text-slate-950 text-xs font-bold shadow transition-all disabled:opacity-50"
            >
              {isUploadingImage ? 'Subiendo imagen a ImgBB...' : 'Seleccionar Foto'}
            </button>
          </div>

          {/* Current Gallery */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Fotos en tu galería ({gallery.length})
            </h4>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {gallery.map((imgUrl, i) => (
                <div
                  key={i}
                  className="relative aspect-square rounded-2xl overflow-hidden bg-slate-800 border border-white/10 group"
                >
                  <img
                    src={imgUrl}
                    alt={`Foto ${i + 1}`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <button
                    onClick={() => handleDeletePhoto(i)}
                    className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/70 text-rose-400 hover:bg-rose-600 hover:text-white transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Bio & Details Editor */}
          <div className="pt-4 border-t border-white/10 space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Biografía profesional
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full p-3 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Especialidades (separadas por coma)
              </label>
              <input
                type="text"
                value={specialtiesText}
                onChange={(e) => setSpecialtiesText(e.target.value)}
                placeholder="Skin Fade, Ritual Navaja, Barba Spa"
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Teléfono / WhatsApp
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Usuario de Instagram
                </label>
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@carlos.barber"
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={isSavingProfile}
              className="w-full py-3 rounded-2xl bg-[#D4AF37] hover:bg-[#E5B869] text-slate-950 font-bold text-xs shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingProfile ? 'Guardando...' : 'Guardar Información Profesional'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
