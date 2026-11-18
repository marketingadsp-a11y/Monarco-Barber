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
      <div className="rounded-3xl bg-white border border-[#E6E1D6] p-5 sm:p-6 shadow-[0_6px_24px_-12px_rgba(22,21,20,0.08)] space-y-4">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          {/* Avatar with Camera Overlay */}
          <div className="relative group">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-2 border-[#9A6B3B] shadow-md bg-[#F2EFE9]">
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
              className="absolute -bottom-2 -right-2 p-2 rounded-2xl bg-[#161514] text-[#FAF9F6] border border-white shadow-md hover:scale-110 active:scale-95 transition-all"
              title="Cambiar foto de perfil"
            >
              <Camera className="w-4 h-4 stroke-[2.2]" />
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
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#161514] uppercase tracking-wide">
                {displayName || 'Mi Perfil de Barbero'}
              </h1>
            </div>
            <p className="text-xs text-[#5C5852]">
              Esta foto y nombre son los que verán los clientes al agendar una cita contigo.
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 text-xs text-[#5C5852] font-mono tabular-nums">
              <span><span className="text-[#9A6B3B]">★</span> {activeBarber.rating.toFixed(2)} ({activeBarber.reviewCount} reseñas)</span>
              <span>·</span>
              <span>{experienceYears} años de exp.</span>
            </div>
          </div>
        </div>

        {isUploadingAvatar && (
          <div className="p-2.5 rounded-xl bg-[#FBF6EE] border border-[#9A6B3B]/35 text-[#7D542B] text-xs font-semibold text-center">
            Subiendo nueva foto a ImgBB...
          </div>
        )}
      </div>

      {/* Main Profile Editor Form */}
      <div className="rounded-3xl bg-white border border-[#E6E1D6] p-5 space-y-4 shadow-xs text-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#9A6B3B] flex items-center gap-2">
          <User className="w-4 h-4" />
          <span>Datos Personales & Profesionales</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="text-[#5C5852] font-semibold block mb-1">
              Nombre Completo / Artístico *
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ej. Carlos Ramón (Master Barber)"
              className="w-full p-2.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] font-medium focus:outline-none focus:border-[#161514]"
            />
          </div>

          <div>
            <label className="text-[#5C5852] font-semibold block mb-1">
              Teléfono / WhatsApp de Contacto
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+52 34 1197 5639"
              className="w-full p-2.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] font-medium focus:outline-none focus:border-[#161514]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="text-[#5C5852] font-semibold block mb-1">
              Usuario de Instagram
            </label>
            <input
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@carlos.monarca"
              className="w-full p-2.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] font-medium focus:outline-none focus:border-[#161514]"
            />
          </div>

          <div>
            <label className="text-[#5C5852] font-semibold block mb-1">
              Años de Experiencia
            </label>
            <input
              type="number"
              value={experienceYears}
              onChange={(e) => setExperienceYears(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] font-mono font-medium focus:outline-none focus:border-[#161514]"
            />
          </div>
        </div>

        <div>
          <label className="text-[#5C5852] font-semibold block mb-1">
            Especialidades (separadas por coma)
          </label>
          <input
            type="text"
            value={specialtiesText}
            onChange={(e) => setSpecialtiesText(e.target.value)}
            placeholder="Skin Fade, Ritual Navaja, Barba Spa, Tintes"
            className="w-full p-2.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] font-medium focus:outline-none focus:border-[#161514]"
          />
        </div>

        <div>
          <label className="text-[#5C5852] font-semibold block mb-1">
            Biografía Profesional & Presentación
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="Cuenta un poco sobre tu trayectoria, técnicas y pasión por la barbería..."
            className="w-full p-2.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] font-medium focus:outline-none focus:border-[#161514]"
          />
        </div>

        <button
          type="button"
          onClick={handleSaveProfile}
          disabled={isSavingProfile}
          className="w-full py-3 rounded-2xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] font-semibold text-xs shadow-sm active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4 text-[#C69765]" />
          <span>{isSavingProfile ? 'Guardando Perfil...' : 'Guardar Cambios de Perfil'}</span>
        </button>
      </div>

      {/* Gallery & Portfolio Section */}
      <div className="rounded-3xl bg-white border border-[#E6E1D6] p-5 space-y-4 shadow-xs text-xs">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#9A6B3B] flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              <span>Mi Portafolio de Trabajos ({gallery.length})</span>
            </h2>
            <p className="text-[#5C5852] text-[11px] mt-0.5">
              Sube fotos de tus mejores cortes para exhibir en tu perfil público
            </p>
          </div>

          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            disabled={isUploadingGallery}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] font-semibold text-xs shadow-xs transition-all shrink-0"
          >
            <Upload className="w-3.5 h-3.5 text-[#C69765]" />
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
          <div className="p-6 rounded-2xl bg-[#FAF9F6] border border-[#E6E1D6] text-center text-[#5C5852]">
            Aún no has subido fotos a tu portafolio. Presiona "Subir Foto" para añadir imágenes.
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {gallery.map((imgUrl, i) => (
              <div
                key={i}
                className="relative aspect-square rounded-2xl overflow-hidden bg-[#F2EFE9] border border-[#E6E1D6] group"
              >
                <img
                  src={imgUrl}
                  alt={`Trabajo ${i + 1}`}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <button
                  onClick={() => handleDeleteGalleryPhoto(i)}
                  className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-white/90 text-rose-700 hover:bg-rose-600 hover:text-white border border-[#E6E1D6] transition-colors shadow-xs"
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
      <div className="rounded-3xl bg-white border border-[#E6E1D6] p-5 space-y-4 shadow-xs text-xs">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#9A6B3B] flex items-center gap-2">
              <Scissors className="w-4 h-4" />
              <span>Mis Servicios Personalizados</span>
            </h2>
            <p className="text-[#5C5852] text-[11px] mt-0.5">
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
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F2EFE9] hover:bg-[#E8E3D9] border border-[#D2CBBF] text-[#161514] font-semibold text-xs transition-all shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-[#9A6B3B]" />
            <span>Crear Servicio</span>
          </button>
        </div>

        {myCustomServices.length > 0 && (
          <div className="grid gap-2.5">
            {myCustomServices.map((service) => (
              <div
                key={service.id}
                className="p-3 rounded-2xl bg-[#FAF7F0] border border-[#9A6B3B]/35 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={service.imageUrl || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80'}
                    alt={service.name}
                    className="w-12 h-12 rounded-xl object-cover border border-[#E6E1D6] shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <h4 className="font-bold text-[#161514] text-xs truncate">{service.name}</h4>
                    <p className="text-[11px] text-[#5C5852] font-mono tabular-nums">
                      {service.durationMinutes} min · <strong className="text-[#9A6B3B]">{formatCurrency(service.price)}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setEditingCustomService(service)}
                    className="p-1.5 rounded-lg bg-white hover:bg-[#F2EFE9] border border-[#E6E1D6] text-[#161514]"
                    title="Editar"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteService(service.id)}
                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700"
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
        <div className="pt-3 border-t border-[#E6E1D6] space-y-2">
          <span className="text-[11px] font-bold text-[#5C5852] uppercase tracking-wider block">
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
                      ? 'bg-[#FAF7F0] border-[#161514]'
                      : 'bg-[#FAF9F6] border-[#E6E1D6] opacity-70 hover:opacity-100'
                  }`}
                >
                  <span className="text-xs font-semibold text-[#161514]">{service.name}</span>
                  <span className={`text-[10px] font-bold ${isOffered ? 'text-[#9A6B3B]' : 'text-[#8E887E]'}`}>
                    {isOffered ? '✓ En mi menú' : 'No ofrecido'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Logout Action Card */}
      <div className="p-4 rounded-3xl bg-white border border-[#E6E1D6] flex items-center justify-between shadow-xs">
        <div>
          <span className="font-bold text-[#161514] text-xs block">Sesión de Barbero</span>
          <span className="text-[11px] text-[#5C5852]">Cerrar sesión activa de este panel</span>
        </div>
        <button
          onClick={async () => {
            await logout();
            showToast('info', 'Sesión cerrada', 'Has cerrado sesión del panel de barbero.');
          }}
          className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-semibold text-xs flex items-center gap-1.5 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Cerrar Sesión</span>
        </button>
      </div>

      {/* Modal Custom Service */}
      {editingCustomService && (
        <div className="fixed inset-0 z-50 bg-[#161514]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FAF9F6] border border-[#D2CBBF] rounded-3xl p-5 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl text-xs">
            <h3 className="font-display text-xl font-bold text-[#161514] uppercase tracking-wide">
              {editingCustomService.id ? 'Editar Servicio' : 'Nuevo Servicio Personalizado'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[#5C5852] font-semibold block mb-1">Nombre del Servicio *</label>
                <input
                  type="text"
                  value={editingCustomService.name || ''}
                  onChange={(e) => setEditingCustomService({ ...editingCustomService, name: e.target.value })}
                  placeholder="Ej. Fade Especial & Barba Spa"
                  className="w-full p-2.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] focus:outline-none focus:border-[#161514]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[#5C5852] font-semibold block mb-1">Precio ($ MXN) *</label>
                  <input
                    type="number"
                    value={editingCustomService.price || 0}
                    onChange={(e) => setEditingCustomService({ ...editingCustomService, price: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] font-mono focus:outline-none focus:border-[#161514]"
                  />
                </div>
                <div>
                  <label className="text-[#5C5852] font-semibold block mb-1">Duración (min) *</label>
                  <input
                    type="number"
                    value={editingCustomService.durationMinutes || 45}
                    onChange={(e) => setEditingCustomService({ ...editingCustomService, durationMinutes: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] font-mono focus:outline-none focus:border-[#161514]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#5C5852] font-semibold block mb-1">Descripción</label>
                <textarea
                  value={editingCustomService.description || ''}
                  onChange={(e) => setEditingCustomService({ ...editingCustomService, description: e.target.value })}
                  rows={2}
                  className="w-full p-2.5 rounded-xl bg-white border border-[#D2CBBF] text-[#161514] focus:outline-none focus:border-[#161514]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setEditingCustomService(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#F2EFE9] hover:bg-[#E8E3D9] border border-[#D2CBBF] text-[#161514] font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCustomService}
                disabled={isSavingCustomService}
                className="flex-1 py-2.5 rounded-xl bg-[#161514] hover:bg-[#2A2826] text-[#FAF9F6] font-semibold shadow-xs"
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
