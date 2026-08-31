import React, { useState, useRef } from 'react';
import {
  User,
  Camera,
  Upload,
  Save,
  Phone,
  Instagram,
  Sparkles,
  Scissors,
  Clock,
  Trash2,
  Plus,
  Edit2,
  Check,
  ToggleLeft,
  ToggleRight,
  LogOut,
  Image as ImageIcon,
  Award,
} from 'lucide-react';
import { useBarbershop } from '../../contexts/BarbershopContext';
import { useAuth } from '../../contexts/AuthContext';
import { Barber, Service } from '../../types';
import { imageService } from '../../services/imgbb/imageService';
import { formatCurrency } from '../../utils/dateTime';
import { dataService } from '../../services/firebase/dataService';

interface BarberProfileViewProps {
  activeBarber: Barber;
}

export const BarberProfileView: React.FC<BarberProfileViewProps> = ({ activeBarber }) => {
  const {
    saveBarber,
    services,
    saveService,
    deleteService,
    toggleServiceActive,
    showToast,
  } = useBarbershop();
  const { userProfile, updateUserPreferences, logout } = useAuth();

  // Basic Profile State
  const [displayName, setDisplayName] = useState(activeBarber.displayName || '');
  const [photoUrl, setPhotoUrl] = useState(activeBarber.photoUrl || '');
  const [phone, setPhone] = useState(activeBarber.phone || '');
  const [bio, setBio] = useState(activeBarber.bio || '');
  const [instagram, setInstagram] = useState(activeBarber.instagram || '');
  const [experienceYears, setExperienceYears] = useState(activeBarber.experienceYears || 3);
  const [specialtiesText, setSpecialtiesText] = useState(
    activeBarber.specialties.join(', ') || ''
  );
  const [gallery, setGallery] = useState<string[]>(activeBarber.gallery || []);

  // Upload States
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Custom Service State
  const [editingCustomService, setEditingCustomService] = useState<Partial<Service> | null>(null);
  const [isSavingCustomService, setIsSavingCustomService] = useState(false);
  const [isUploadingServicePhoto, setIsUploadingServicePhoto] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const servicePhotoInputRef = useRef<HTMLInputElement>(null);

  // Filter Services
  const globalServices = services.filter((s) => !s.barberId || s.createdByType === 'admin');
  const myCustomServices = services.filter((s) => s.barberId === activeBarber.id);

  // Upload Avatar
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const url = await imageService.uploadImage(file);
      setPhotoUrl(url);
      showToast('success', 'Foto cargada', 'Tu nueva foto de perfil está lista para guardarse.');
    } catch (err: any) {
      showToast('error', 'Error al subir foto', err.message);
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  // Upload Gallery Item
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingGallery(true);
    try {
      const url = await imageService.uploadImage(file);
      const newGallery = [...gallery, url];
      setGallery(newGallery);
      await saveBarber({ ...activeBarber, gallery: newGallery });
      showToast('success', 'Foto agregada', 'La imagen fue añadida a tu portafolio.');
    } catch (err: any) {
      showToast('error', 'Error al subir imagen', err.message);
    } finally {
      setIsUploadingGallery(false);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const handleDeleteGalleryPhoto = async (index: number) => {
    const newGallery = gallery.filter((_, i) => i !== index);
    setGallery(newGallery);
    await saveBarber({ ...activeBarber, gallery: newGallery });
    showToast('info', 'Foto eliminada', 'La imagen fue retirada de tu portafolio.');
  };

  // Save All Profile Info
  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      showToast('error', 'Nombre requerido', 'Por favor ingresa tu nombre.');
      return;
    }

    setIsSavingProfile(true);
    try {
      const specs = specialtiesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const nameParts = displayName.trim().split(' ');
      const firstName = nameParts[0] || displayName;
      const lastName = nameParts.slice(1).join(' ') || '';

      const updatedBarber: Barber = {
        ...activeBarber,
        displayName: displayName.trim(),
        firstName,
        lastName,
        photoUrl: photoUrl.trim() || activeBarber.photoUrl,
        phone: phone.trim(),
        bio: bio.trim(),
        instagram: instagram.trim(),
        experienceYears: Number(experienceYears) || 3,
        specialties: specs.length > 0 ? specs : ['Corte Clásico', 'Barba'],
        gallery,
        updatedAt: new Date().toISOString(),
      };

      await saveBarber(updatedBarber);

      // Also update user profile in Firestore and session if matching
      if (userProfile?.id) {
        await dataService.updateUserFullProfile(userProfile.id, {
          name: displayName.trim(),
          photoUrl: photoUrl.trim() || activeBarber.photoUrl,
          phone: phone.trim(),
        });
        await updateUserPreferences({
          name: displayName.trim(),
          photoUrl: photoUrl.trim() || activeBarber.photoUrl,
          phone: phone.trim(),
        });
      }

      showToast(
        'success',
        '¡Perfil Actualizado!',
        'Tu nombre, foto y datos profesionales ahora son visibles para todos los clientes.'
      );
    } catch (err: any) {
      showToast('error', 'Error al guardar perfil', err.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Toggle Global Service in Barber Menu
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

  // Custom Service Photo Upload
  const handleCustomServicePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingServicePhoto(true);
    try {
      const url = await imageService.uploadImage(file);
      setEditingCustomService((prev) => ({ ...prev, imageUrl: url }));
      showToast('success', 'Foto cargada', 'Imagen de servicio lista.');
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    } finally {
      setIsUploadingServicePhoto(false);
    }
  };

  // Save Custom Service
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
    <div className="space-y-6">
      {/* Top Banner Card with Avatar Upload */}
      <div className="rounded-3xl bg-gradient-to-r from-[#1A1F29] to-[#12151B] border border-[#D4AF37]/30 p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          {/* Avatar with Camera Overlay */}
          <div className="relative group">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-3 border-[#D4AF37] shadow-xl bg-slate-900">
              <img
                src={photoUrl || activeBarber.photoUrl}
                alt={displayName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute -bottom-2 -right-2 p-2 rounded-2xl bg-[#D4AF37] text-slate-950 shadow-lg hover:scale-110 active:scale-95 transition-all"
              title="Cambiar foto de perfil"
            >
              <Camera className="w-4 h-4 stroke-[2.5]" />
            </button>

            <input
              type="file"
              ref={avatarInputRef}
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {displayName || 'Mi Perfil de Barbero'}
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              Esta foto y nombre son los que verán los clientes al agendar una cita contigo.
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 text-xs text-slate-300">
              <span>★ {activeBarber.rating.toFixed(2)} ({activeBarber.reviewCount} reseñas)</span>
              <span>•</span>
              <span>{experienceYears} años de exp.</span>
            </div>
          </div>
        </div>

        {isUploadingAvatar && (
          <div className="p-2.5 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-semibold text-center animate-pulse">
            Subiendo nueva foto a ImgBB...
          </div>
        )}
      </div>

      {/* Main Profile Editor Form */}
      <div className="rounded-3xl bg-[#14171E] border border-white/10 p-5 space-y-4 shadow-xl text-xs">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#D4AF37] flex items-center gap-2">
          <User className="w-4 h-4" />
          <span>Datos Personales & Profesionales</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              Nombre Completo / Artístico *
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ej. Carlos Ramón (Master Barber)"
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-medium focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              Teléfono / WhatsApp de Contacto
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+52 34 1197 5639"
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-medium focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              Usuario de Instagram
            </label>
            <input
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@carlos.monarca"
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-medium focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              Años de Experiencia
            </label>
            <input
              type="number"
              value={experienceYears}
              onChange={(e) => setExperienceYears(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-medium focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
        </div>

        <div>
          <label className="text-slate-300 font-semibold block mb-1">
            Especialidades (separadas por coma)
          </label>
          <input
            type="text"
            value={specialtiesText}
            onChange={(e) => setSpecialtiesText(e.target.value)}
            placeholder="Skin Fade, Ritual Navaja, Barba Spa, Tintes"
            className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-medium focus:outline-none focus:border-[#D4AF37]"
          />
        </div>

        <div>
          <label className="text-slate-300 font-semibold block mb-1">
            Biografía Profesional & Presentación
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="Cuenta un poco sobre tu trayectoria, técnicas y pasión por la barbería..."
            className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-medium focus:outline-none focus:border-[#D4AF37]"
          />
        </div>

        <button
          type="button"
          onClick={handleSaveProfile}
          disabled={isSavingProfile}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#996515] via-[#D4AF37] to-[#F3E5AB] text-slate-950 font-black text-xs shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4 stroke-[2.5]" />
          <span>{isSavingProfile ? 'Guardando Perfil...' : 'Guardar Cambios de Perfil'}</span>
        </button>
      </div>

      {/* Gallery & Portfolio Section */}
      <div className="rounded-3xl bg-[#14171E] border border-white/10 p-5 space-y-4 shadow-xl text-xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#D4AF37] flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              <span>Mi Portafolio de Trabajos ({gallery.length})</span>
            </h2>
            <p className="text-slate-400 text-[11px]">
              Sube fotos de tus mejores cortes para exhibir en tu perfil público
            </p>
          </div>

          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            disabled={isUploadingGallery}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#D4AF37] text-slate-950 font-bold text-xs shadow hover:scale-105 transition-all"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isUploadingGallery ? 'Subiendo...' : 'Subir Foto'}</span>
          </button>
          <input
            type="file"
            ref={galleryInputRef}
            accept="image/*"
            onChange={handleGalleryUpload}
            className="hidden"
          />
        </div>

        {gallery.length === 0 ? (
          <div className="p-6 rounded-2xl bg-black/30 border border-white/5 text-center text-slate-500">
            Aún no has subido fotos a tu portafolio. Presiona "Subir Foto" para añadir imágenes.
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {gallery.map((imgUrl, i) => (
              <div
                key={i}
                className="relative aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-white/10 group"
              >
                <img
                  src={imgUrl}
                  alt={`Trabajo ${i + 1}`}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <button
                  onClick={() => handleDeleteGalleryPhoto(i)}
                  className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-black/70 text-rose-400 hover:bg-rose-600 hover:text-white transition-colors"
                  title="Eliminar foto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Services Menu Section */}
      <div className="rounded-3xl bg-[#14171E] border border-white/10 p-5 space-y-4 shadow-xl text-xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#D4AF37] flex items-center gap-2">
              <Scissors className="w-4 h-4" />
              <span>Mis Servicios Personalizados</span>
            </h2>
            <p className="text-slate-400 text-[11px]">
              Crea servicios exclusivos que sólo tú ofreces
            </p>
          </div>

          <button
            type="button"
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
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Crear Servicio</span>
          </button>
        </div>

        {myCustomServices.length > 0 && (
          <div className="grid gap-2.5">
            {myCustomServices.map((service) => (
              <div
                key={service.id}
                className="p-3 rounded-2xl bg-black/40 border border-[#D4AF37]/30 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={service.imageUrl || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80'}
                    alt={service.name}
                    className="w-12 h-12 rounded-xl object-cover border border-[#D4AF37]/50 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <h4 className="font-bold text-white text-xs truncate">{service.name}</h4>
                    <p className="text-[11px] text-slate-400">
                      {service.durationMinutes} min • <strong className="text-[#D4AF37]">{formatCurrency(service.price)}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setEditingCustomService(service)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
                    title="Editar"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteService(service.id)}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Global Services checklist */}
        <div className="pt-3 border-t border-white/10 space-y-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Servicios Oficiales de la Barbería (Activa los que ofreces)
          </span>
          <div className="grid gap-2">
            {globalServices.map((service) => {
              const isOffered = (activeBarber.serviceIds || []).includes(service.id);
              return (
                <div
                  key={service.id}
                  onClick={() => handleToggleGlobalService(service.id)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    isOffered
                      ? 'bg-[#181D26] border-[#D4AF37]'
                      : 'bg-black/30 border-white/5 opacity-60'
                  }`}
                >
                  <span className="text-xs font-semibold text-white">{service.name}</span>
                  <span className={`text-[10px] font-bold ${isOffered ? 'text-[#D4AF37]' : 'text-slate-500'}`}>
                    {isOffered ? '✓ En mi menú' : 'No ofrecido'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Logout Action Card */}
      <div className="p-4 rounded-3xl bg-[#14171E] border border-white/10 flex items-center justify-between">
        <div>
          <span className="font-bold text-white text-xs block">Sesión de Barbero</span>
          <span className="text-[11px] text-slate-400">Cerrar sesión activa de este panel</span>
        </div>
        <button
          onClick={async () => {
            await logout();
            showToast('info', 'Sesión cerrada', 'Has cerrado sesión del panel de barbero.');
          }}
          className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center gap-1.5 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Cerrar Sesión</span>
        </button>
      </div>

      {/* Modal Custom Service */}
      {editingCustomService && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#14171E] border border-white/15 rounded-3xl p-5 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl text-xs">
            <h3 className="text-base font-bold text-white">
              {editingCustomService.id ? 'Editar Servicio' : 'Nuevo Servicio Personalizado'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-slate-300 block mb-1">Nombre del Servicio *</label>
                <input
                  type="text"
                  value={editingCustomService.name || ''}
                  onChange={(e) => setEditingCustomService({ ...editingCustomService, name: e.target.value })}
                  placeholder="Ej. Fade Especial & Barba Spa"
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 block mb-1">Precio ($ MXN) *</label>
                  <input
                    type="number"
                    value={editingCustomService.price || 0}
                    onChange={(e) => setEditingCustomService({ ...editingCustomService, price: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Duración (min) *</label>
                  <input
                    type="number"
                    value={editingCustomService.durationMinutes || 45}
                    onChange={(e) => setEditingCustomService({ ...editingCustomService, durationMinutes: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Descripción</label>
                <textarea
                  value={editingCustomService.description || ''}
                  onChange={(e) => setEditingCustomService({ ...editingCustomService, description: e.target.value })}
                  rows={2}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setEditingCustomService(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 text-slate-300 font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCustomService}
                disabled={isSavingCustomService}
                className="flex-1 py-2.5 rounded-xl bg-[#D4AF37] text-slate-950 font-bold shadow"
              >
                {isSavingCustomService ? 'Guardando...' : 'Guardar Servicio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
