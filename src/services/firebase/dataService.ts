import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  runTransaction,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './config';
import {
  Appointment,
  Barber,
  Service,
  ServiceCategory,
  BusinessSettings,
  BarberSchedule,
  BlockedSlot,
  UserProfile,
  AppointmentStatus,
  UserRole,
} from '../../types';
import {
  SEED_BARBERS,
  SEED_CATEGORIES,
  SEED_SERVICES,
  SEED_BUSINESS_SETTINGS,
  DEFAULT_WEEKLY_SCHEDULE,
} from './seedData';
import { doIntervalsOverlap } from '../availabilityEngine';

// ============================================================================
// MAPPER FUNCTIONS: Typescript Model <-> Firestore Document en Español
// ============================================================================

// 1. USUARIOS (users)
export function toSpanishUser(profile: UserProfile): Record<string, any> {
  const roleMap: Record<UserRole, string> = {
    client: 'cliente',
    barber: 'barbero',
    admin: 'administrador',
  };
  return {
    id: profile.id,
    rol: roleMap[profile.role] || profile.role || 'cliente',
    nombre: profile.name || '',
    correo: profile.email || '',
    telefono: profile.phone || '',
    foto_url: profile.photoUrl || '',
    barberos_favoritos: profile.favoriteBarberIds || [],
    activo: profile.active !== undefined ? profile.active : true,
    creado_en: profile.createdAt || new Date().toISOString(),
    actualizado_en: profile.updatedAt || new Date().toISOString(),
  };
}

export function fromSpanishUser(data: any, docId: string): UserProfile {
  const roleReverseMap: Record<string, UserRole> = {
    cliente: 'client',
    client: 'client',
    barbero: 'barber',
    barber: 'barber',
    administrador: 'admin',
    admin: 'admin',
  };

  return {
    id: data.id || docId,
    role: roleReverseMap[data.rol || data.role] || 'client',
    name: data.nombre || data.name || 'Usuario',
    email: data.correo || data.email || '',
    phone: data.telefono || data.phone || '',
    photoUrl: data.foto_url || data.photoUrl || '',
    favoriteBarberIds: data.barberos_favoritos || data.favoriteBarberIds || [],
    active: data.activo !== undefined ? data.activo : (data.active !== undefined ? data.active : true),
    createdAt: data.creado_en || data.createdAt || new Date().toISOString(),
    updatedAt: data.actualizado_en || data.updatedAt || undefined,
  };
}

// 2. BARBEROS (barbers)
export function toSpanishBarber(barber: Barber): Record<string, any> {
  return {
    id: barber.id,
    usuario_id: barber.userId || '',
    nombre_mostrado: barber.displayName || '',
    nombre_pila: barber.firstName || '',
    apellido: barber.lastName || '',
    correo: barber.email || '',
    telefono: barber.phone || '',
    biografia: barber.bio || '',
    foto_url: barber.photoUrl || '',
    galeria: barber.gallery || [],
    especialidades: barber.specialties || [],
    servicios_ids: barber.serviceIds || [],
    activo: barber.active !== undefined ? barber.active : true,
    destacado: barber.featured || false,
    calificacion: barber.rating || 5.0,
    total_resenas: barber.reviewCount || 0,
    instagram: barber.instagram || '',
    anos_experiencia: barber.experienceYears || 1,
    creado_en: barber.createdAt || new Date().toISOString(),
    actualizado_en: barber.updatedAt || new Date().toISOString(),
  };
}

export function fromSpanishBarber(data: any, docId: string): Barber {
  return {
    id: data.id || docId,
    userId: data.usuario_id || data.userId || '',
    displayName: data.nombre_mostrado || data.displayName || data.nombre || 'Barbero',
    firstName: data.nombre_pila || data.firstName || '',
    lastName: data.apellido || data.lastName || '',
    email: data.correo || data.email || '',
    phone: data.telefono || data.phone || '',
    bio: data.biografia || data.bio || '',
    photoUrl: data.foto_url || data.photoUrl || '',
    gallery: data.galeria || data.gallery || [],
    specialties: data.especialidades || data.specialties || [],
    serviceIds: data.servicios_ids || data.serviceIds || [],
    active: data.activo !== undefined ? data.activo : (data.active !== undefined ? data.active : true),
    featured: data.destacado !== undefined ? data.destacado : (data.featured || false),
    rating: data.calificacion !== undefined ? Number(data.calificacion) : (data.rating !== undefined ? Number(data.rating) : 5.0),
    reviewCount: data.total_resenas !== undefined ? Number(data.total_resenas) : (data.reviewCount !== undefined ? Number(data.reviewCount) : 0),
    instagram: data.instagram || '',
    experienceYears: data.anos_experiencia !== undefined ? Number(data.anos_experiencia) : (data.experienceYears || 3),
    createdAt: data.creado_en || data.createdAt || new Date().toISOString(),
    updatedAt: data.actualizado_en || data.updatedAt || new Date().toISOString(),
  };
}

// 3. SERVICIOS (services)
export function toSpanishService(srv: Service): Record<string, any> {
  return {
    id: srv.id,
    nombre: srv.name || '',
    descripcion: srv.description || '',
    categoria_id: srv.categoryId || 'cat_hair',
    precio: Number(srv.price) || 0,
    duracion_minutos: Number(srv.durationMinutes) || 45,
    imagen_url: srv.imageUrl || '',
    activo: srv.active !== undefined ? srv.active : true,
    orden: Number(srv.sortOrder) || 1,
    color_acento: srv.accentColor || '#D4AF37',
    incluye_lavado: Boolean(srv.includesWash),
    es_popular: Boolean(srv.isPopular),
    barbero_id: srv.barberId || null,
    creado_por_tipo: srv.createdByType === 'barber' ? 'barbero' : 'administrador',
    creado_en: srv.createdAt || new Date().toISOString(),
    actualizado_en: srv.updatedAt || new Date().toISOString(),
  };
}

export function fromSpanishService(data: any, docId: string): Service {
  return {
    id: data.id || docId,
    name: data.nombre || data.name || 'Servicio',
    description: data.descripcion || data.description || '',
    categoryId: data.categoria_id || data.categoryId || 'cat_hair',
    price: Number(data.precio !== undefined ? data.precio : data.price) || 0,
    durationMinutes: Number(data.duracion_minutos !== undefined ? data.duracion_minutos : data.durationMinutes) || 45,
    imageUrl: data.imagen_url || data.imageUrl || '',
    active: data.activo !== undefined ? data.activo : (data.active !== undefined ? data.active : true),
    sortOrder: Number(data.orden !== undefined ? data.orden : data.sortOrder) || 1,
    accentColor: data.color_acento || data.accentColor || '#D4AF37',
    includesWash: Boolean(data.incluye_lavado !== undefined ? data.incluye_lavado : data.includesWash),
    isPopular: Boolean(data.es_popular !== undefined ? data.es_popular : data.isPopular),
    barberId: data.barbero_id || data.barberId || undefined,
    createdByType: (data.creado_por_tipo === 'barbero' || data.createdByType === 'barber') ? 'barber' : 'admin',
    createdAt: data.creado_en || data.createdAt || new Date().toISOString(),
    updatedAt: data.actualizado_en || data.updatedAt || new Date().toISOString(),
  };
}

// 4. CATEGORIAS DE SERVICIOS
export function toSpanishCategory(cat: ServiceCategory): Record<string, any> {
  return {
    id: cat.id,
    nombre: cat.name,
    descripcion: cat.description || '',
    icono: cat.iconName || '',
    orden: Number(cat.sortOrder) || 1,
    activo: cat.active !== undefined ? cat.active : true,
  };
}

export function fromSpanishCategory(data: any, docId: string): ServiceCategory {
  return {
    id: data.id || docId,
    name: data.nombre || data.name || '',
    description: data.descripcion || data.description || '',
    iconName: data.icono || data.iconName || 'Scissors',
    sortOrder: Number(data.orden !== undefined ? data.orden : data.sortOrder) || 1,
    active: data.activo !== undefined ? data.activo : (data.active !== undefined ? data.active : true),
  };
}

// 5. CITAS (appointments)
export function toSpanishAppointment(app: Appointment): Record<string, any> {
  const statusMap: Record<AppointmentStatus, string> = {
    pending: 'pendiente',
    confirmed: 'confirmada',
    completed: 'completada',
    cancelled: 'cancelada',
    no_show: 'no_asistio',
    rejected: 'rechazada',
  };

  return {
    id: app.id,
    cliente_id: app.clientId,
    cliente_nombre: app.clientName,
    cliente_telefono: app.clientPhone || '',
    cliente_correo: app.clientEmail || '',
    barbero_id: app.barberId,
    barbero_nombre: app.barberName,
    barbero_foto: app.barberPhoto || '',
    servicio_id: app.serviceId,
    servicios_ids: app.serviceIds || [app.serviceId],
    servicio_nombre: app.serviceNameSnapshot,
    servicio_precio: Number(app.servicePriceSnapshot),
    servicio_duracion: Number(app.serviceDurationSnapshot),
    fecha: app.date,
    hora_inicio: app.startTime,
    hora_fin: app.endTime,
    estado: statusMap[app.status] || app.status || 'confirmada',
    notas: app.notes || '',
    cancelado_en: app.cancelledAt || null,
    cancelado_por: app.cancelledBy || null,
    motivo_cancelacion: app.cancelReason || null,
    creado_en: app.createdAt || new Date().toISOString(),
    actualizado_en: app.updatedAt || new Date().toISOString(),
  };
}

export function fromSpanishAppointment(data: any, docId: string): Appointment {
  const statusReverseMap: Record<string, AppointmentStatus> = {
    pendiente: 'pending',
    pending: 'pending',
    confirmada: 'confirmed',
    confirmed: 'confirmed',
    completada: 'completed',
    completed: 'completed',
    cancelada: 'cancelled',
    cancelled: 'cancelled',
    no_asistio: 'no_show',
    no_show: 'no_show',
    rechazada: 'rejected',
    rejected: 'rejected',
  };

  return {
    id: data.id || docId,
    clientId: data.cliente_id || data.clientId || '',
    clientName: data.cliente_nombre || data.clientName || 'Cliente',
    clientPhone: data.cliente_telefono || data.clientPhone || '',
    clientEmail: data.cliente_correo || data.clientEmail || '',
    barberId: data.barbero_id || data.barberId || '',
    barberName: data.barbero_nombre || data.barberName || 'Barbero',
    barberPhoto: data.barbero_foto || data.barberPhoto || '',
    serviceId: data.servicio_id || data.serviceId || '',
    serviceIds: data.servicios_ids || data.serviceIds || (data.servicio_id ? [data.servicio_id] : []),
    serviceNameSnapshot: data.servicio_nombre || data.serviceNameSnapshot || 'Corte',
    servicePriceSnapshot: Number(data.servicio_precio !== undefined ? data.servicio_precio : data.servicePriceSnapshot) || 0,
    serviceDurationSnapshot: Number(data.servicio_duracion !== undefined ? data.servicio_duracion : data.serviceDurationSnapshot) || 45,
    date: data.fecha || data.date || '',
    startTime: data.hora_inicio || data.startTime || '',
    endTime: data.hora_fin || data.endTime || '',
    status: statusReverseMap[data.estado || data.status] || 'confirmed',
    notes: data.notas || data.notes || '',
    cancelledAt: data.cancelado_en || data.cancelledAt || null,
    cancelledBy: data.cancelado_por || data.cancelledBy || null,
    cancelReason: data.motivo_cancelacion || data.cancelReason || null,
    createdAt: data.creado_en || data.createdAt || new Date().toISOString(),
    updatedAt: data.actualizado_en || data.updatedAt || new Date().toISOString(),
  };
}

// 6. HORARIOS DE BARBEROS
export function toSpanishSchedule(sched: BarberSchedule): Record<string, any> {
  return {
    barbero_id: sched.barberId,
    horario_semanal: sched.weeklySchedule,
    zona_horaria: sched.timeZone || 'America/Mexico_City',
    intervalo_minutos: Number(sched.slotIntervalMinutes) || 30,
    actualizado_en: sched.updatedAt || new Date().toISOString(),
  };
}

export function fromSpanishSchedule(data: any, docId: string): BarberSchedule {
  return {
    barberId: data.barbero_id || data.barberId || docId,
    weeklySchedule: data.horario_semanal || data.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE,
    timeZone: data.zona_horaria || data.timeZone || 'America/Mexico_City',
    slotIntervalMinutes: Number(data.intervalo_minutos || data.slotIntervalMinutes) || 30,
    updatedAt: data.actualizado_en || data.updatedAt || new Date().toISOString(),
  };
}

// 7. BLOQUEOS DE HORARIOS
export function toSpanishBlockedSlot(slot: BlockedSlot): Record<string, any> {
  return {
    id: slot.id,
    barbero_id: slot.barberId,
    fecha: slot.date,
    hora_inicio: slot.startTime,
    hora_fin: slot.endTime,
    motivo: slot.reason || '',
    creado_en: slot.createdAt || new Date().toISOString(),
  };
}

export function fromSpanishBlockedSlot(data: any, docId: string): BlockedSlot {
  return {
    id: data.id || docId,
    barberId: data.barbero_id || data.barberId || '',
    date: data.fecha || data.date || '',
    startTime: data.hora_inicio || data.startTime || '',
    endTime: data.hora_fin || data.endTime || '',
    reason: data.motivo || data.reason || '',
    createdAt: data.creado_en || data.createdAt || new Date().toISOString(),
  };
}

// 8. CONFIGURACION DEL NEGOCIO
export function toSpanishSettings(st: BusinessSettings): Record<string, any> {
  return {
    id: st.id || 'principal',
    nombre: st.name || 'MONARCA BARBER',
    eslogan: st.tagline || '',
    logo_url: st.logoUrl || '',
    direccion: st.address || '',
    ubicacion_mapa_url: st.googleMapsUrl || '',
    telefono: st.phone || '',
    whatsapp: st.whatsapp || '',
    instagram: st.instagram || '',
    anticipacion_minima_reserva_minutos: Number(st.minBookingNoticeMinutes) || 30,
    anticipacion_maxima_reserva_dias: Number(st.maxBookingAdvanceDays) || 30,
    tiempo_minimo_cancelacion_horas: Number(st.minCancelNoticeHours) || 2,
    tiempo_minimo_reprogramacion_horas: Number(st.minRescheduleNoticeHours) || 2,
    intervalo_turnos_minutos: Number(st.slotIntervalMinutes) || 30,
    zona_horaria: st.timeZone || 'America/Mexico_City',
    moneda: st.currency || 'MXN',
    simbolo_moneda: st.currencySymbol || '$',
    horario_apertura: st.openingTime || '10:00',
    horario_cierre: st.closingTime || '21:00',
    anuncio: st.announcement || '',
    actualizado_en: new Date().toISOString(),
  };
}

export function fromSpanishSettings(data: any, docId: string): BusinessSettings {
  return {
    id: data.id || docId || 'principal',
    name: data.nombre || data.name || 'MONARCA BARBER',
    tagline: data.eslogan || data.tagline || 'Donde la elegancia y la maestría se encuentran.',
    logoUrl: data.logo_url || data.logoUrl || '',
    address: data.direccion || data.address || 'Av. Presidente Masaryk 360, Polanco, CDMX',
    googleMapsUrl: data.ubicacion_mapa_url || data.googleMapsUrl || 'https://maps.google.com',
    phone: data.telefono || data.phone || '+52 55 1234 5678',
    whatsapp: data.whatsapp || '+525512345678',
    instagram: data.instagram || '@monarcabarber.oficial',
    minBookingNoticeMinutes: Number(data.anticipacion_minima_reserva_minutos || data.minBookingNoticeMinutes) || 30,
    maxBookingAdvanceDays: Number(data.anticipacion_maxima_reserva_dias || data.maxBookingAdvanceDays) || 30,
    minCancelNoticeHours: Number(data.tiempo_minimo_cancelacion_horas || data.minCancelNoticeHours) || 2,
    minRescheduleNoticeHours: Number(data.tiempo_minimo_reprogramacion_horas || data.minRescheduleNoticeHours) || 2,
    slotIntervalMinutes: Number(data.intervalo_turnos_minutos || data.slotIntervalMinutes) || 30,
    timeZone: data.zona_horaria || data.timeZone || 'America/Mexico_City',
    currency: data.moneda || data.currency || 'MXN',
    currencySymbol: data.simbolo_moneda || data.currencySymbol || '$',
    openingTime: data.horario_apertura || data.openingTime || '10:00',
    closingTime: data.horario_cierre || data.closingTime || '21:00',
    announcement: data.anuncio || data.announcement || '',
  };
}

// ============================================================================
// DATA SERVICE CLASS (Firestore Queries & Mutations with Spanish collections)
// ============================================================================

export class DataService {
  /**
   * Initializes Firestore with seed data if the database is newly created/empty.
   */
  static async seedInitialDataIfNeeded(): Promise<void> {
    try {
      const servicesSnap = await getDocs(collection(db, 'servicios'));
      if (servicesSnap.empty) {
        console.log('Iniciando carga de catálogo MONARCA BARBER en español...');
        const batch = writeBatch(db);

        // 1. Categorías de Servicios
        for (const cat of SEED_CATEGORIES) {
          batch.set(doc(db, 'categorias_servicios', cat.id), toSpanishCategory(cat));
        }

        // 2. Servicios
        for (const srv of SEED_SERVICES) {
          batch.set(doc(db, 'servicios', srv.id), toSpanishService(srv));
        }

        // 3. Barberos y sus Horarios
        for (const barber of SEED_BARBERS) {
          batch.set(doc(db, 'barberos', barber.id), toSpanishBarber(barber));
          batch.set(doc(db, 'horarios_barberos', barber.id), toSpanishSchedule({
            barberId: barber.id,
            weeklySchedule: DEFAULT_WEEKLY_SCHEDULE,
            updatedAt: new Date().toISOString(),
          }));
        }

        // 4. Configuración del Negocio
        batch.set(doc(db, 'configuracion_negocio', 'principal'), toSpanishSettings(SEED_BUSINESS_SETTINGS));

        await batch.commit();
        console.log('Carga inicial en español completada exitosamente.');
      }
    } catch (error) {
      console.warn('Verificación o carga inicial de datos completada/omitida:', error);
    }
  }

  // ==================== USUARIOS Y PERFILES ====================

  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      // Intentar primero en la colección en español 'usuarios'
      const snap = await getDoc(doc(db, 'usuarios', userId));
      if (snap.exists()) {
        return fromSpanishUser(snap.data(), snap.id);
      }

      // Respaldo de compatibilidad con 'users'
      const snapOld = await getDoc(doc(db, 'users', userId));
      if (snapOld.exists()) {
        const profile = fromSpanishUser(snapOld.data(), snapOld.id);
        // Migrar a 'usuarios'
        await setDoc(doc(db, 'usuarios', userId), toSpanishUser(profile), { merge: true });
        return profile;
      }

      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `usuarios/${userId}`);
    }
  }

  static async saveUserProfile(profile: UserProfile): Promise<void> {
    try {
      const spanishData = toSpanishUser(profile);
      await setDoc(doc(db, 'usuarios', profile.id), spanishData, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `usuarios/${profile.id}`);
    }
  }

  static async toggleFavoriteBarber(userId: string, barberId: string, isFav: boolean): Promise<void> {
    try {
      const userRef = doc(db, 'usuarios', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = fromSpanishUser(userSnap.data(), userSnap.id);
        const current = data.favoriteBarberIds || [];
        const next = isFav
          ? Array.from(new Set([...current, barberId]))
          : current.filter((id) => id !== barberId);
        await updateDoc(userRef, { barberos_favoritos: next, actualizado_en: new Date().toISOString() });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `usuarios/${userId}`);
    }
  }

  // ==================== BARBEROS ====================

  static subscribeToBarbers(callback: (barbers: Barber[]) => void): () => void {
    const q = collection(db, 'barberos');
    return onSnapshot(
      q,
      (snapshot) => {
        const barbers: Barber[] = [];
        snapshot.forEach((docSnap) => {
          barbers.push(fromSpanishBarber(docSnap.data(), docSnap.id));
        });
        barbers.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        callback(barbers);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'barberos');
      }
    );
  }

  static async saveBarber(barber: Partial<Barber> & { id?: string }): Promise<string> {
    try {
      const barberId = barber.id || `barbero_${Date.now()}`;
      const now = new Date().toISOString();
      const barberData: Barber = {
        id: barberId,
        displayName: barber.displayName || 'Nuevo Barbero',
        firstName: barber.firstName || 'Barbero',
        lastName: barber.lastName || '',
        email: barber.email || '',
        phone: barber.phone || '',
        bio: barber.bio || '',
        photoUrl: barber.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
        gallery: barber.gallery || [],
        specialties: barber.specialties || ['Corte Clásico'],
        serviceIds: barber.serviceIds || [],
        active: barber.active !== undefined ? barber.active : true,
        featured: barber.featured || false,
        rating: barber.rating || 5.0,
        reviewCount: barber.reviewCount || 0,
        instagram: barber.instagram || '',
        experienceYears: barber.experienceYears || 3,
        createdAt: barber.createdAt || now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'barberos', barberId), toSpanishBarber(barberData), { merge: true });

      // Verificar y crear documento de horario en español
      const scheduleRef = doc(db, 'horarios_barberos', barberId);
      const scheduleSnap = await getDoc(scheduleRef);
      if (!scheduleSnap.exists()) {
        await setDoc(scheduleRef, toSpanishSchedule({
          barberId,
          weeklySchedule: DEFAULT_WEEKLY_SCHEDULE,
          updatedAt: now,
        }));
      }

      return barberId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `barberos/${barber.id}`);
    }
  }

  static async toggleBarberActive(barberId: string, active: boolean): Promise<void> {
    try {
      await updateDoc(doc(db, 'barberos', barberId), { activo: active, actualizado_en: new Date().toISOString() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `barberos/${barberId}`);
    }
  }

  // ==================== SERVICIOS ====================

  static subscribeToServices(callback: (services: Service[]) => void): () => void {
    return onSnapshot(
      collection(db, 'servicios'),
      (snapshot) => {
        const services: Service[] = [];
        snapshot.forEach((docSnap) => {
          services.push(fromSpanishService(docSnap.data(), docSnap.id));
        });
        services.sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));
        callback(services);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'servicios');
      }
    );
  }

  static async saveService(service: Partial<Service> & { id?: string }): Promise<string> {
    try {
      const srvId = service.id || `srv_${Date.now()}`;
      const serviceData: Service = {
        id: srvId,
        name: service.name || 'Servicio de Barbería',
        description: service.description || '',
        categoryId: service.categoryId || 'cat_hair',
        price: Number(service.price) || 200,
        durationMinutes: Number(service.durationMinutes) || 45,
        imageUrl: service.imageUrl || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80',
        active: service.active !== undefined ? service.active : true,
        sortOrder: Number(service.sortOrder) || 1,
        accentColor: service.accentColor || '#D4AF37',
        isPopular: service.isPopular || false,
        includesWash: service.includesWash || false,
        barberId: service.barberId || undefined,
        createdByType: service.createdByType || (service.barberId ? 'barber' : 'admin'),
        createdAt: service.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'servicios', srvId), toSpanishService(serviceData), { merge: true });
      return srvId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `servicios/${service.id}`);
    }
  }

  static async deleteService(serviceId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'servicios', serviceId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `servicios/${serviceId}`);
    }
  }

  static async toggleServiceActive(serviceId: string, active: boolean): Promise<void> {
    try {
      await updateDoc(doc(db, 'servicios', serviceId), { activo: active, actualizado_en: new Date().toISOString() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `servicios/${serviceId}`);
    }
  }

  // ==================== CITAS & VALIDACIÓN ATÓMICA ====================

  static subscribeToAppointments(
    role: 'client' | 'barber' | 'admin',
    userId?: string,
    barberId?: string,
    callback?: (appointments: Appointment[]) => void
  ): () => void {
    const q = collection(db, 'citas');

    return onSnapshot(
      q,
      (snapshot) => {
        let appointments: Appointment[] = [];
        snapshot.forEach((docSnap) => {
          appointments.push(fromSpanishAppointment(docSnap.data(), docSnap.id));
        });

        // Filtrar según rol y contexto
        if (role === 'client' && userId) {
          appointments = appointments.filter((app) => app.clientId === userId);
        } else if (role === 'barber' && barberId) {
          appointments = appointments.filter((app) => app.barberId === barberId);
        }

        // Ordenar por fecha y hora de inicio
        appointments.sort((a, b) => {
          const dateComp = a.date.localeCompare(b.date);
          if (dateComp !== 0) return dateComp;
          return a.startTime.localeCompare(b.startTime);
        });

        callback?.(appointments);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'citas');
      }
    );
  }

  /**
   * Crea una cita con validación transaccional para evitar empalmes.
   */
  static async createAppointment(appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Appointment> {
    const appointmentId = `cita_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const newAppRecord: Appointment = {
      ...appointment,
      id: appointmentId,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await runTransaction(db, async (transaction) => {
        // Consultar citas existentes del barbero en la misma fecha
        const appointmentsRef = collection(db, 'citas');
        const q = query(
          appointmentsRef,
          where('barbero_id', '==', appointment.barberId),
          where('fecha', '==', appointment.date)
        );

        const existingSnapshots = await getDocs(q);

        for (const docSnap of existingSnapshots.docs) {
          const existing = fromSpanishAppointment(docSnap.data(), docSnap.id);
          if (existing.status !== 'cancelled' && existing.status !== 'rejected') {
            if (doIntervalsOverlap(appointment.startTime, appointment.endTime, existing.startTime, existing.endTime)) {
              throw new Error(
                `Conflicto de horario: Este espacio (${appointment.startTime} - ${appointment.endTime}) acaba de ser reservado por otro cliente.`
              );
            }
          }
        }

        // Guardar cita con nombres de campos en español
        const docRef = doc(db, 'citas', appointmentId);
        transaction.set(docRef, toSpanishAppointment(newAppRecord));
      });

      return newAppRecord;
    } catch (error: any) {
      if (error.message && error.message.includes('Conflicto de horario')) {
        throw error;
      }
      handleFirestoreError(error, OperationType.CREATE, `citas/${appointmentId}`);
    }
  }

  static async updateAppointmentStatus(
    appointmentId: string,
    status: AppointmentStatus,
    options?: { notes?: string; cancelledBy?: 'client' | 'barber' | 'admin'; cancelReason?: string }
  ): Promise<void> {
    const statusMap: Record<AppointmentStatus, string> = {
      pending: 'pendiente',
      confirmed: 'confirmada',
      completed: 'completada',
      cancelled: 'cancelada',
      no_show: 'no_asistio',
      rejected: 'rechazada',
    };

    try {
      const now = new Date().toISOString();
      const updates: any = {
        estado: statusMap[status] || status,
        actualizado_en: now,
      };

      if (options?.notes !== undefined) updates.notas = options.notes;
      if (status === 'cancelled') {
        updates.cancelado_en = now;
        updates.cancelado_por = options?.cancelledBy || 'cliente';
        if (options?.cancelReason) updates.motivo_cancelacion = options.cancelReason;
      }

      await updateDoc(doc(db, 'citas', appointmentId), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `citas/${appointmentId}`);
    }
  }

  static async rescheduleAppointment(
    appointmentId: string,
    newDate: string,
    newStartTime: string,
    newEndTime: string
  ): Promise<void> {
    try {
      const appRef = doc(db, 'citas', appointmentId);
      const appSnap = await getDoc(appRef);
      if (!appSnap.exists()) throw new Error('Cita no encontrada.');

      const current = fromSpanishAppointment(appSnap.data(), appSnap.id);

      await runTransaction(db, async (transaction) => {
        // Verificar empalmes
        const q = query(
          collection(db, 'citas'),
          where('barbero_id', '==', current.barberId),
          where('fecha', '==', newDate)
        );
        const existingSnapshots = await getDocs(q);

        for (const docSnap of existingSnapshots.docs) {
          if (docSnap.id === appointmentId) continue;
          const existing = fromSpanishAppointment(docSnap.data(), docSnap.id);
          if (existing.status !== 'cancelled' && existing.status !== 'rejected') {
            if (doIntervalsOverlap(newStartTime, newEndTime, existing.startTime, existing.endTime)) {
              throw new Error(`El nuevo horario seleccionado (${newStartTime} - ${newEndTime}) ya no está disponible.`);
            }
          }
        }

        transaction.update(appRef, {
          fecha: newDate,
          hora_inicio: newStartTime,
          hora_fin: newEndTime,
          estado: 'confirmada',
          actualizado_en: new Date().toISOString(),
        });
      });
    } catch (error: any) {
      if (error.message && error.message.includes('disponible')) throw error;
      handleFirestoreError(error, OperationType.UPDATE, `citas/${appointmentId}`);
    }
  }

  // ==================== HORARIOS Y BLOQUEOS ====================

  static subscribeToBarberSchedules(callback: (schedules: Record<string, BarberSchedule>) => void): () => void {
    return onSnapshot(
      collection(db, 'horarios_barberos'),
      (snapshot) => {
        const map: Record<string, BarberSchedule> = {};
        snapshot.forEach((docSnap) => {
          map[docSnap.id] = fromSpanishSchedule(docSnap.data(), docSnap.id);
        });
        callback(map);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'horarios_barberos');
      }
    );
  }

  static async saveBarberSchedule(barberId: string, schedule: BarberSchedule): Promise<void> {
    try {
      await setDoc(doc(db, 'horarios_barberos', barberId), toSpanishSchedule(schedule), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `horarios_barberos/${barberId}`);
    }
  }

  static subscribeToBlockedSlots(callback: (blockedSlots: BlockedSlot[]) => void): () => void {
    return onSnapshot(
      collection(db, 'bloqueos_horarios'),
      (snapshot) => {
        const slots: BlockedSlot[] = [];
        snapshot.forEach((docSnap) => {
          slots.push(fromSpanishBlockedSlot(docSnap.data(), docSnap.id));
        });
        callback(slots);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'bloqueos_horarios');
      }
    );
  }

  static async addBlockedSlot(slot: Omit<BlockedSlot, 'id' | 'createdAt'>): Promise<string> {
    try {
      const id = `bloqueo_${Date.now()}`;
      const record: BlockedSlot = {
        ...slot,
        id,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'bloqueos_horarios', id), toSpanishBlockedSlot(record));
      return id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'bloqueos_horarios');
    }
  }

  static async deleteBlockedSlot(slotId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'bloqueos_horarios', slotId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `bloqueos_horarios/${slotId}`);
    }
  }

  // ==================== CONFIGURACIÓN DEL NEGOCIO ====================

  static subscribeToBusinessSettings(callback: (settings: BusinessSettings) => void): () => void {
    return onSnapshot(
      doc(db, 'configuracion_negocio', 'principal'),
      (docSnap) => {
        if (docSnap.exists()) {
          callback(fromSpanishSettings(docSnap.data(), docSnap.id));
        } else {
          callback(SEED_BUSINESS_SETTINGS);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'configuracion_negocio/principal');
      }
    );
  }

  static async saveBusinessSettings(settings: Partial<BusinessSettings>): Promise<void> {
    try {
      const fullSettings: BusinessSettings = {
        ...SEED_BUSINESS_SETTINGS,
        ...settings,
      };
      await setDoc(doc(db, 'configuracion_negocio', 'principal'), toSpanishSettings(fullSettings), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'configuracion_negocio/principal');
    }
  }
}

export const dataService = DataService;
