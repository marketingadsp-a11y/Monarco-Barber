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
  limit,
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
  UserPointHistoryItem,
  UserPurchaseItem,
  Product,
  PosSale,
  PosSaleItem,
} from '../../types';
import {
  SEED_BARBERS,
  SEED_CATEGORIES,
  SEED_SERVICES,
  SEED_PRODUCTS,
  SEED_BUSINESS_SETTINGS,
  DEFAULT_WEEKLY_SCHEDULE,
} from './seedData';
import { doIntervalsOverlap } from '../availabilityEngine';

// ============================================================================
// MAPPER FUNCTIONS: Typescript Model <-> Firestore Document en Español
// ============================================================================

export function extractCleanUrl(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    if (typeof val.url === 'string') return val.url;
    if (typeof val.display_url === 'string') return val.display_url;
    if (typeof val.thumb === 'string') return val.thumb;
  }
  return '';
}

export function removeUndefinedFields<T extends Record<string, any>>(obj: T): T {
  const cleaned: any = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    } else if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
      cleaned[key] = removeUndefinedFields(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

// 1. USUARIOS (users)
export function toSpanishUser(profile: UserProfile): Record<string, any> {
  const roleMap: Record<UserRole, string> = {
    client: 'cliente',
    barber: 'barbero',
    admin: 'administrador',
  };
  return removeUndefinedFields({
    id: profile.id,
    rol: roleMap[profile.role] || profile.role || 'cliente',
    nombre: profile.name || '',
    correo: profile.email || '',
    telefono: profile.phone || '',
    numero_cliente: profile.clientNumber || '',
    pin: profile.pin || '',
    puntos: profile.points !== undefined ? profile.points : 100,
    visitas_manuales: profile.manualVisits !== undefined ? profile.manualVisits : 0,
    notas: profile.notes || '',
    cumpleanos: profile.birthday || '',
    nivel_membresia: profile.membershipTier || 'VIP',
    qr_datos: profile.qrCodeData || profile.clientNumber || '',
    foto_url: extractCleanUrl(profile.photoUrl),
    barberos_favoritos: profile.favoriteBarberIds || [],
    historial_puntos: Array.isArray(profile.pointsHistory) ? profile.pointsHistory : [],
    compras: Array.isArray(profile.purchases) ? profile.purchases : [],
    activo: profile.active !== undefined ? profile.active : true,
    creado_en: profile.createdAt || new Date().toISOString(),
    actualizado_en: profile.updatedAt || new Date().toISOString(),
  });
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
    clientNumber: data.numero_cliente || data.clientNumber || '',
    pin: data.pin || data.codigo_acceso || '',
    points: data.puntos !== undefined ? Number(data.puntos) : 100,
    manualVisits: data.visitas_manuales !== undefined ? Number(data.visitas_manuales) : 0,
    notes: data.notas || data.notes || '',
    birthday: data.cumpleanos || data.birthday || '',
    membershipTier: data.nivel_membresia || data.membershipTier || 'VIP',
    qrCodeData: data.qr_datos || data.qrCodeData || data.numero_cliente || '',
    photoUrl: data.foto_url || data.photoUrl || '',
    favoriteBarberIds: data.barberos_favoritos || data.favoriteBarberIds || [],
    pointsHistory: Array.isArray(data.historial_puntos) ? data.historial_puntos : [],
    purchases: Array.isArray(data.compras) ? data.compras : [],
    active: data.activo !== undefined ? data.activo : (data.active !== undefined ? data.active : true),
    createdAt: data.creado_en || data.createdAt || new Date().toISOString(),
    updatedAt: data.actualizado_en || data.updatedAt || undefined,
  };
}

// 2. BARBEROS (barbers)
export function toSpanishBarber(barber: Barber): Record<string, any> {
  const cleanGallery = Array.isArray(barber.gallery)
    ? barber.gallery.map(extractCleanUrl).filter(Boolean)
    : [];

  return removeUndefinedFields({
    id: barber.id,
    usuario_id: barber.userId || '',
    nombre_mostrado: barber.displayName || '',
    nombre_pila: barber.firstName || '',
    apellido: barber.lastName || '',
    correo: barber.email || '',
    telefono: barber.phone || '',
    biografia: barber.bio || '',
    foto_url: extractCleanUrl(barber.photoUrl),
    galeria: cleanGallery,
    especialidades: Array.isArray(barber.specialties) ? barber.specialties : [],
    servicios_ids: Array.isArray(barber.serviceIds) ? barber.serviceIds : [],
    activo: barber.active !== undefined ? barber.active : true,
    destacado: barber.featured || false,
    calificacion: barber.rating || 5.0,
    total_resenas: barber.reviewCount || 0,
    instagram: barber.instagram || '',
    anos_experiencia: barber.experienceYears || 1,
    creado_en: barber.createdAt || new Date().toISOString(),
    actualizado_en: barber.updatedAt || new Date().toISOString(),
  });
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
    photoUrl: extractCleanUrl(data.foto_url || data.photoUrl),
    gallery: Array.isArray(data.galeria || data.gallery)
      ? (data.galeria || data.gallery).map(extractCleanUrl).filter(Boolean)
      : [],
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
  return removeUndefinedFields({
    id: srv.id,
    nombre: srv.name || '',
    descripcion: srv.description || '',
    categoria_id: srv.categoryId || 'cat_hair',
    precio: Number(srv.price) || 0,
    duracion_minutos: Number(srv.durationMinutes) || 45,
    imagen_url: extractCleanUrl(srv.imageUrl),
    activo: srv.active !== undefined ? srv.active : true,
    orden: Number(srv.sortOrder) || 1,
    color_acento: srv.accentColor || '#D4AF37',
    incluye_lavado: Boolean(srv.includesWash),
    es_popular: Boolean(srv.isPopular),
    barbero_id: srv.barberId || null,
    creado_por_tipo: srv.createdByType === 'barber' ? 'barbero' : 'administrador',
    creado_en: srv.createdAt || new Date().toISOString(),
    actualizado_en: srv.updatedAt || new Date().toISOString(),
  });
}

export function fromSpanishService(data: any, docId: string): Service {
  return {
    id: data.id || docId,
    name: data.nombre || data.name || 'Servicio',
    description: data.descripcion || data.description || '',
    categoryId: data.categoria_id || data.categoryId || 'cat_hair',
    price: Number(data.precio !== undefined ? data.precio : data.price) || 0,
    durationMinutes: Number(data.duracion_minutos !== undefined ? data.duracion_minutos : data.durationMinutes) || 45,
    imageUrl: extractCleanUrl(data.imagen_url || data.imageUrl),
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
  return removeUndefinedFields({
    id: cat.id,
    nombre: cat.name,
    descripcion: cat.description || '',
    icono: cat.iconName || '',
    orden: Number(cat.sortOrder) || 1,
    activo: cat.active !== undefined ? cat.active : true,
  });
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

  return removeUndefinedFields({
    id: app.id,
    cliente_id: app.clientId,
    cliente_nombre: app.clientName,
    cliente_telefono: app.clientPhone || '',
    cliente_correo: app.clientEmail || '',
    barbero_id: app.barberId,
    barbero_nombre: app.barberName,
    barbero_foto: extractCleanUrl(app.barberPhoto),
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
  });
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
    barberPhoto: extractCleanUrl(data.barbero_foto || data.barberPhoto),
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
  return removeUndefinedFields({
    barbero_id: sched.barberId,
    horario_semanal: sched.weeklySchedule,
    zona_horaria: sched.timeZone || 'America/Mexico_City',
    intervalo_minutos: Number(sched.slotIntervalMinutes) || 30,
    actualizado_en: sched.updatedAt || new Date().toISOString(),
  });
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
  return removeUndefinedFields({
    id: slot.id,
    barbero_id: slot.barberId,
    fecha: slot.date,
    hora_inicio: slot.startTime,
    hora_fin: slot.endTime,
    motivo: slot.reason || '',
    creado_en: slot.createdAt || new Date().toISOString(),
  });
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

// 8. PRODUCTOS A LA VENTA
export function toSpanishProduct(prod: Product): Record<string, any> {
  return removeUndefinedFields({
    id: prod.id,
    nombre: prod.name || '',
    descripcion: prod.description || '',
    precio: Number(prod.price) || 0,
    existencias: prod.stock !== undefined ? Number(prod.stock) : 99,
    activo: prod.active !== undefined ? prod.active : true,
    creado_por_tipo: prod.createdByType === 'barber' ? 'barbero' : 'administrador',
    creado_por_barbero_id: prod.createdByBarberId || null,
    creado_por_barbero_nombre: prod.createdByBarberName || null,
    creado_en: prod.createdAt || new Date().toISOString(),
    actualizado_en: prod.updatedAt || new Date().toISOString(),
  });
}

export function fromSpanishProduct(data: any, docId: string): Product {
  return {
    id: data.id || docId,
    name: data.nombre || data.name || 'Producto',
    description: data.descripcion || data.description || '',
    price: Number(data.precio !== undefined ? data.precio : data.price) || 0,
    stock: data.existencias !== undefined ? Number(data.existencias) : (data.stock !== undefined ? Number(data.stock) : 99),
    active: data.activo !== undefined ? data.activo : (data.active !== undefined ? data.active : true),
    createdByType: (data.creado_por_tipo === 'barbero' || data.createdByType === 'barber') ? 'barber' : 'admin',
    createdByBarberId: data.creado_por_barbero_id || data.createdByBarberId || undefined,
    createdByBarberName: data.creado_por_barbero_nombre || data.createdByBarberName || undefined,
    createdAt: data.creado_en || data.createdAt || new Date().toISOString(),
    updatedAt: data.actualizado_en || data.updatedAt || new Date().toISOString(),
  };
}

// 9. VENTAS POS (PUNTO DE VENTA)
export function toSpanishPosSale(sale: PosSale): Record<string, any> {
  return removeUndefinedFields({
    id: sale.id,
    barbero_id: sale.barberId,
    barbero_nombre: sale.barberName,
    cliente_id: sale.customerId || null,
    cliente_nombre: sale.customerName || 'Público en General',
    cliente_numero: sale.customerClientNumber || null,
    cliente_telefono: sale.customerPhone || null,
    articulos: (sale.items || []).map((it) => ({
      producto_id: it.productId,
      nombre: it.productName,
      precio: Number(it.price) || 0,
      cantidad: Number(it.quantity) || 1,
      subtotal: Number(it.subtotal) || 0,
    })),
    total: Number(sale.total) || 0,
    puntos_otorgados: Number(sale.pointsAwarded) || 0,
    porcentaje_puntos_usado: Number(sale.pointsPercentageUsed) || 1,
    metodo_pago: sale.paymentMethod || 'cash',
    notas: sale.notes || '',
    creado_en: sale.createdAt || new Date().toISOString(),
  });
}

export function fromSpanishPosSale(data: any, docId: string): PosSale {
  const articulosRaw = data.articulos || data.items || [];
  return {
    id: data.id || docId,
    barberId: data.barbero_id || data.barberId || '',
    barberName: data.barbero_nombre || data.barberName || 'Barbero',
    customerId: data.cliente_id || data.customerId || undefined,
    customerName: data.cliente_nombre || data.customerName || 'Público en General',
    customerClientNumber: data.cliente_numero || data.customerClientNumber || undefined,
    customerPhone: data.cliente_telefono || data.customerPhone || undefined,
    items: articulosRaw.map((it: any) => ({
      productId: it.producto_id || it.productId || '',
      productName: it.nombre || it.productName || it.name || 'Producto',
      price: Number(it.precio !== undefined ? it.precio : it.price) || 0,
      quantity: Number(it.cantidad !== undefined ? it.cantidad : it.quantity) || 1,
      subtotal: Number(it.subtotal !== undefined ? it.subtotal : (Number(it.precio || 0) * Number(it.cantidad || 1))) || 0,
    })),
    total: Number(data.total) || 0,
    pointsAwarded: Number(data.puntos_otorgados !== undefined ? data.puntos_otorgados : data.pointsAwarded) || 0,
    pointsPercentageUsed: Number(data.porcentaje_puntos_usado !== undefined ? data.porcentaje_puntos_usado : data.pointsPercentageUsed) || 1,
    paymentMethod: data.metodo_pago || data.paymentMethod || 'cash',
    notes: data.notas || data.notes || '',
    createdAt: data.creado_en || data.createdAt || new Date().toISOString(),
  };
}

// 10. CONFIGURACION DEL NEGOCIO
export function toSpanishSettings(st: BusinessSettings): Record<string, any> {
  return removeUndefinedFields({
    id: st.id || 'principal',
    nombre: st.name || 'MONARCA BARBER',
    eslogan: st.tagline || '',
    logo_url: extractCleanUrl(st.logoUrl),
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
    banner_insignia: st.heroBadge || '',
    banner_titulo: st.heroTitle || '',
    banner_subtitulo: st.heroSubtitle || '',
    banner_boton_texto: st.heroButtonText || '',
    recompensa_puntos_productos: st.enableProductPointsReward !== undefined ? st.enableProductPointsReward : true,
    porcentaje_puntos_productos: Number(st.productPointsPercentage !== undefined ? st.productPointsPercentage : 1),
    configuracion_notificaciones: st.notificationSettings ? {
      notificar_barbero_toast: st.notificationSettings.barberNewBookingToast ?? true,
      notificar_barbero_sonido: st.notificationSettings.barberNewBookingSound ?? true,
      notificar_barbero_push: st.notificationSettings.barberBrowserPush ?? true,
      confirmacion_cliente_reserva: st.notificationSettings.clientBookingConfirmation ?? true,
      recordatorio_cliente_24h: st.notificationSettings.clientReminder24h ?? true,
      recordatorio_cliente_2h: st.notificationSettings.clientReminder2h ?? true,
      notificaciones_navegador_cliente: st.notificationSettings.clientBrowserPush ?? true,
      habilitar_chime_audio: st.notificationSettings.enableAudioChime ?? true,
    } : null,
    actualizado_en: new Date().toISOString(),
  });
}

export function fromSpanishSettings(data: any, docId: string): BusinessSettings {
  const notifRaw = data.configuracion_notificaciones || data.notificationSettings || {};
  return {
    id: data.id || docId || 'principal',
    name: data.nombre || data.name || 'MONARCA BARBER',
    tagline: data.eslogan || data.tagline || 'Donde la elegancia y la maestría se encuentran.',
    logoUrl: extractCleanUrl(data.logo_url || data.logoUrl),
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
    heroBadge: data.banner_insignia || data.heroBadge || 'EXPERIENCIA EXCLUSIVA EN POLANCO',
    heroTitle: data.banner_titulo || data.heroTitle || 'El arte del corte clásico y la barbería contemporánea.',
    heroSubtitle: data.banner_subtitulo || data.heroSubtitle || data.eslogan || data.tagline || 'Donde la elegancia y la maestría se encuentran.',
    heroButtonText: data.banner_boton_texto || data.heroButtonText || 'Reservar Cita Ahora',
    enableProductPointsReward: data.recompensa_puntos_productos !== undefined ? Boolean(data.recompensa_puntos_productos) : (data.enableProductPointsReward !== undefined ? Boolean(data.enableProductPointsReward) : true),
    productPointsPercentage: Number(data.porcentaje_puntos_productos !== undefined ? data.porcentaje_puntos_productos : (data.productPointsPercentage !== undefined ? data.productPointsPercentage : 1)),
    notificationSettings: {
      barberNewBookingToast: notifRaw.notificar_barbero_toast !== undefined ? Boolean(notifRaw.notificar_barbero_toast) : (notifRaw.barberNewBookingToast !== undefined ? Boolean(notifRaw.barberNewBookingToast) : true),
      barberNewBookingSound: notifRaw.notificar_barbero_sonido !== undefined ? Boolean(notifRaw.notificar_barbero_sonido) : (notifRaw.barberNewBookingSound !== undefined ? Boolean(notifRaw.barberNewBookingSound) : true),
      barberBrowserPush: notifRaw.notificar_barbero_push !== undefined ? Boolean(notifRaw.notificar_barbero_push) : (notifRaw.barberBrowserPush !== undefined ? Boolean(notifRaw.barberBrowserPush) : true),
      clientBookingConfirmation: notifRaw.confirmacion_cliente_reserva !== undefined ? Boolean(notifRaw.confirmacion_cliente_reserva) : (notifRaw.clientBookingConfirmation !== undefined ? Boolean(notifRaw.clientBookingConfirmation) : true),
      clientReminder24h: notifRaw.recordatorio_cliente_24h !== undefined ? Boolean(notifRaw.recordatorio_cliente_24h) : (notifRaw.clientReminder24h !== undefined ? Boolean(notifRaw.clientReminder24h) : true),
      clientReminder2h: notifRaw.recordatorio_cliente_2h !== undefined ? Boolean(notifRaw.recordatorio_cliente_2h) : (notifRaw.clientReminder2h !== undefined ? Boolean(notifRaw.clientReminder2h) : true),
      clientBrowserPush: notifRaw.notificaciones_navegador_cliente !== undefined ? Boolean(notifRaw.notificaciones_navegador_cliente) : (notifRaw.clientBrowserPush !== undefined ? Boolean(notifRaw.clientBrowserPush) : true),
      enableAudioChime: notifRaw.habilitar_chime_audio !== undefined ? Boolean(notifRaw.habilitar_chime_audio) : (notifRaw.enableAudioChime !== undefined ? Boolean(notifRaw.enableAudioChime) : true),
    },
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

        // 4. Productos a la venta
        for (const prod of SEED_PRODUCTS) {
          batch.set(doc(db, 'productos', prod.id), toSpanishProduct(prod));
        }

        // 5. Configuración del Negocio
        batch.set(doc(db, 'configuracion_negocio', 'principal'), toSpanishSettings(SEED_BUSINESS_SETTINGS));

        await batch.commit();
        console.log('Carga inicial en español completada exitosamente.');
      } else {
        // Asegurar que existan productos si la colección productos está vacía
        const productsSnap = await getDocs(collection(db, 'productos'));
        if (productsSnap.empty) {
          const prodBatch = writeBatch(db);
          for (const prod of SEED_PRODUCTS) {
            prodBatch.set(doc(db, 'productos', prod.id), toSpanishProduct(prod));
          }
          await prodBatch.commit();
        }
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
      return null;
    }
  }

  /**
   * Search user by 10-digit phone OR 6-digit client number OR email (Ultra-fast parallel query)
   */
  static async findUserByIdentifier(identifier: string): Promise<UserProfile | null> {
    try {
      const cleanRaw = identifier.trim();
      if (!cleanRaw) return null;

      const digitsOnly = cleanRaw.replace(/\D/g, '');
      const tenDigits = digitsOnly.startsWith('52') && digitsOnly.length === 12
        ? digitsOnly.substring(2)
        : digitsOnly;

      const formattedPhoneMx = tenDigits.length === 10
        ? `+52 ${tenDigits.substring(0, 2)} ${tenDigits.substring(2, 6)} ${tenDigits.substring(6)}`
        : '';

      // Parallel high-priority lookups (single doc fetches + indexed queries)
      const lookupPromises: Promise<UserProfile | null>[] = [];

      // 1. Direct doc ID lookups
      lookupPromises.push(
        getDoc(doc(db, 'usuarios', cleanRaw))
          .then((s) => (s.exists() ? fromSpanishUser(s.data(), s.id) : null))
          .catch(() => null)
      );

      if (tenDigits) {
        lookupPromises.push(
          getDoc(doc(db, 'usuarios', `usr_${tenDigits}`))
            .then((s) => (s.exists() ? fromSpanishUser(s.data(), s.id) : null))
            .catch(() => null)
        );
        lookupPromises.push(
          getDoc(doc(db, 'usuarios', `phone_mx_${tenDigits}`))
            .then((s) => (s.exists() ? fromSpanishUser(s.data(), s.id) : null))
            .catch(() => null)
        );
      }

      // 2. Query by client number (exact 6 digits)
      if (cleanRaw.length === 6 && /^\d+$/.test(cleanRaw)) {
        lookupPromises.push(
          getDocs(query(collection(db, 'usuarios'), where('numero_cliente', '==', cleanRaw), limit(1)))
            .then((snap) => (!snap.empty ? fromSpanishUser(snap.docs[0].data(), snap.docs[0].id) : null))
            .catch(() => null)
        );
      }

      // 3. Query by formatted phone
      if (formattedPhoneMx) {
        lookupPromises.push(
          getDocs(query(collection(db, 'usuarios'), where('telefono', '==', formattedPhoneMx), limit(1)))
            .then((snap) => (!snap.empty ? fromSpanishUser(snap.docs[0].data(), snap.docs[0].id) : null))
            .catch(() => null)
        );
      }

      // 4. Query by exact phone raw
      lookupPromises.push(
        getDocs(query(collection(db, 'usuarios'), where('telefono', '==', cleanRaw), limit(1)))
          .then((snap) => (!snap.empty ? fromSpanishUser(snap.docs[0].data(), snap.docs[0].id) : null))
          .catch(() => null)
      );

      // 5. Query by email
      if (cleanRaw.includes('@')) {
        lookupPromises.push(
          getDocs(query(collection(db, 'usuarios'), where('correo', '==', cleanRaw.toLowerCase()), limit(1)))
            .then((snap) => (!snap.empty ? fromSpanishUser(snap.docs[0].data(), snap.docs[0].id) : null))
            .catch(() => null)
        );
      }

      // Execute all targeted queries concurrently
      const results = await Promise.all(lookupPromises);
      for (const res of results) {
        if (res) return res;
      }

      // Fallback: fast limited scan if not found via direct index (e.g. legacy documents)
      const fallbackSnap = await getDocs(query(collection(db, 'usuarios'), limit(50)));
      for (const docSnap of fallbackSnap.docs) {
        const u = fromSpanishUser(docSnap.data(), docSnap.id);
        if (u.clientNumber && u.clientNumber.trim() === cleanRaw) return u;
        if (u.phone) {
          const uDigits = u.phone.replace(/\D/g, '');
          const uTenDigits = uDigits.startsWith('52') && uDigits.length === 12 ? uDigits.substring(2) : uDigits;
          if (tenDigits && uTenDigits === tenDigits) return u;
          if (u.phone.trim() === cleanRaw) return u;
        }
        if (u.email && u.email.toLowerCase() === cleanRaw.toLowerCase()) return u;
      }

      return null;
    } catch (error) {
      console.warn('Error finding user by identifier:', error);
      return null;
    }
  }

  /**
   * Generate an instant unique 6-digit numeric client ID (e.g. "849201")
   */
  static async generateUniqueClientNumber(): Promise<string> {
    // Generate instantly without blocking network scan
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  static subscribeToUsers(callback: (users: UserProfile[]) => void): () => void {
    const q = collection(db, 'usuarios');
    return onSnapshot(
      q,
      (snapshot) => {
        const users: UserProfile[] = [];
        snapshot.forEach((docSnap) => {
          users.push(fromSpanishUser(docSnap.data(), docSnap.id));
        });
        // Sort by creation date or name
        users.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        callback(users);
      },
      (error) => {
        console.warn('Error subscribing to usuarios:', error);
      }
    );
  }

  static async getAllUsers(): Promise<UserProfile[]> {
    try {
      const snap = await getDocs(collection(db, 'usuarios'));
      const users: UserProfile[] = [];
      snap.forEach((docSnap) => {
        users.push(fromSpanishUser(docSnap.data(), docSnap.id));
      });
      return users;
    } catch (error) {
      console.warn('Error getting all users:', error);
      return [];
    }
  }

  static async updateUserRole(userId: string, newRole: UserRole): Promise<void> {
    try {
      const roleMap: Record<UserRole, string> = {
        client: 'cliente',
        barber: 'barbero',
        admin: 'administrador',
      };
      const userRef = doc(db, 'usuarios', userId);
      await updateDoc(userRef, {
        rol: roleMap[newRole],
        actualizado_en: new Date().toISOString(),
      });

      // If promoted to barber, check if barber record exists or auto-create one
      if (newRole === 'barber') {
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const u = fromSpanishUser(userSnap.data(), userSnap.id);
          const barbersSnap = await getDocs(query(collection(db, 'barberos'), where('usuario_id', '==', userId)));
          if (barbersSnap.empty) {
            const newBarberId = `barber_${userId.substring(0, 8)}_${Date.now().toString(36)}`;
            const newBarber: Barber = {
              id: newBarberId,
              userId: userId,
              displayName: u.name,
              firstName: u.name.split(' ')[0] || u.name,
              lastName: u.name.split(' ').slice(1).join(' ') || '',
              email: u.email || '',
              phone: u.phone || '',
              bio: 'Barbero profesional en Monarca Barber.',
              photoUrl: u.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
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
            await setDoc(doc(db, 'barberos', newBarberId), toSpanishBarber(newBarber));
          } else {
            // Activate existing barber record
            const barberDoc = barbersSnap.docs[0];
            await updateDoc(doc(db, 'barberos', barberDoc.id), { activo: true, actualizado_en: new Date().toISOString() });
          }
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `usuarios/${userId}`);
    }
  }

  static async updateUserPoints(
    userId: string,
    newPoints: number,
    reason: string = 'Ajuste manual por administración',
    type: 'add' | 'deduct' | 'set' = 'set'
  ): Promise<void> {
    try {
      const userRef = doc(db, 'usuarios', userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return;
      const u = fromSpanishUser(userSnap.data(), userSnap.id);
      
      const historyItem: UserPointHistoryItem = {
        id: `pts_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        amount: newPoints - (u.points || 0),
        reason: reason,
        date: new Date().toISOString(),
        type: type,
      };

      const nextHistory = [historyItem, ...(u.pointsHistory || [])].slice(0, 50);

      await updateDoc(userRef, {
        puntos: Math.max(0, newPoints),
        historial_puntos: nextHistory,
        actualizado_en: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `usuarios/${userId}`);
    }
  }

  static async updateUserVisits(userId: string, newManualVisits: number): Promise<void> {
    try {
      const userRef = doc(db, 'usuarios', userId);
      await updateDoc(userRef, {
        visitas_manuales: Math.max(0, newManualVisits),
        actualizado_en: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `usuarios/${userId}`);
    }
  }

  static async updateUserFullProfile(userId: string, profileData: Partial<UserProfile>): Promise<void> {
    try {
      const userRef = doc(db, 'usuarios', userId);
      const updatePayload: Record<string, any> = {
        actualizado_en: new Date().toISOString(),
      };

      if (profileData.name !== undefined) updatePayload.nombre = profileData.name;
      if (profileData.phone !== undefined) updatePayload.telefono = profileData.phone;
      if (profileData.email !== undefined) updatePayload.correo = profileData.email;
      if (profileData.clientNumber !== undefined) updatePayload.numero_cliente = profileData.clientNumber;
      if (profileData.pin !== undefined) updatePayload.pin = profileData.pin;
      if (profileData.membershipTier !== undefined) updatePayload.nivel_membresia = profileData.membershipTier;
      if (profileData.notes !== undefined) updatePayload.notas = profileData.notes;
      if (profileData.birthday !== undefined) updatePayload.cumpleanos = profileData.birthday;
      if (profileData.points !== undefined) updatePayload.puntos = Number(profileData.points);
      if (profileData.manualVisits !== undefined) updatePayload.visitas_manuales = Number(profileData.manualVisits);
      if (profileData.photoUrl !== undefined) updatePayload.foto_url = extractCleanUrl(profileData.photoUrl);
      if (profileData.active !== undefined) updatePayload.activo = profileData.active;
      if (profileData.role !== undefined) {
        const roleMap: Record<UserRole, string> = {
          client: 'cliente',
          barber: 'barbero',
          admin: 'administrador',
        };
        updatePayload.rol = roleMap[profileData.role];
      }

      await updateDoc(userRef, removeUndefinedFields(updatePayload));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `usuarios/${userId}`);
    }
  }

  static async addUserPurchase(userId: string, purchase: Omit<UserPurchaseItem, 'id' | 'date'>): Promise<void> {
    try {
      const userRef = doc(db, 'usuarios', userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return;
      const u = fromSpanishUser(userSnap.data(), userSnap.id);

      const newPurchase: UserPurchaseItem = {
        id: `pur_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        itemName: purchase.itemName,
        price: purchase.price,
        barberName: purchase.barberName,
        notes: purchase.notes,
        date: new Date().toISOString(),
      };

      const nextPurchases = [newPurchase, ...(u.purchases || [])];

      await updateDoc(userRef, {
        compras: nextPurchases,
        actualizado_en: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `usuarios/${userId}`);
    }
  }

  static async deleteUserProfile(userId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'usuarios', userId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `usuarios/${userId}`);
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

  static async deleteBarber(barberId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'barberos', barberId));
      try {
        await deleteDoc(doc(db, 'horarios_barberos', barberId));
      } catch (err) {
        console.warn('Could not delete schedule for barber:', err);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `barberos/${barberId}`);
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

  // ==================== PRODUCTOS A LA VENTA ====================

  static subscribeToProducts(callback: (products: Product[]) => void): () => void {
    return onSnapshot(
      collection(db, 'productos'),
      (snapshot) => {
        const prods: Product[] = [];
        snapshot.forEach((docSnap) => {
          prods.push(fromSpanishProduct(docSnap.data(), docSnap.id));
        });
        prods.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        callback(prods);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'productos');
      }
    );
  }

  static async saveProduct(product: Partial<Product> & { id?: string }): Promise<string> {
    try {
      const prodId = product.id || `prod_${Date.now()}`;
      const now = new Date().toISOString();
      const prodData: Product = {
        id: prodId,
        name: (product.name || 'Producto').trim(),
        description: (product.description || '').trim(),
        price: Number(product.price) || 0,
        stock: product.stock !== undefined ? Number(product.stock) : 99,
        active: product.active !== undefined ? product.active : true,
        createdByType: product.createdByType || 'admin',
        createdByBarberId: product.createdByBarberId,
        createdByBarberName: product.createdByBarberName,
        createdAt: product.createdAt || now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'productos', prodId), toSpanishProduct(prodData), { merge: true });
      return prodId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `productos/${product.id}`);
    }
  }

  static async deleteProduct(productId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'productos', productId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `productos/${productId}`);
    }
  }

  static async toggleProductActive(productId: string, active: boolean): Promise<void> {
    try {
      await updateDoc(doc(db, 'productos', productId), {
        activo: active,
        actualizado_en: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `productos/${productId}`);
    }
  }

  // ==================== PUNTO DE VENTA (POS) ====================

  static subscribeToPosSales(callback: (sales: PosSale[]) => void): () => void {
    return onSnapshot(
      collection(db, 'ventas_pos'),
      (snapshot) => {
        const sales: PosSale[] = [];
        snapshot.forEach((docSnap) => {
          sales.push(fromSpanishPosSale(docSnap.data(), docSnap.id));
        });
        sales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(sales);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'ventas_pos');
      }
    );
  }

  static async recordPosSale(saleData: Omit<PosSale, 'id' | 'createdAt'>): Promise<PosSale> {
    try {
      const saleId = `pos_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();

      const fullSale: PosSale = {
        ...saleData,
        id: saleId,
        createdAt: now,
      };

      // 1. Guardar la venta en Firestore
      await setDoc(doc(db, 'ventas_pos', saleId), toSpanishPosSale(fullSale));

      // 2. Si es para un cliente registrado y tiene puntos otorgados
      if (saleData.customerId && saleData.pointsAwarded > 0) {
        try {
          const userRef = doc(db, 'usuarios', saleData.customerId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const user = fromSpanishUser(userSnap.data(), userSnap.id);
            const currentPoints = user.points || 0;
            const newPoints = currentPoints + saleData.pointsAwarded;

            const itemsSummary = (saleData.items || [])
              .map((it) => `${it.quantity}x ${it.productName}`)
              .join(', ');

            const historyItem: UserPointHistoryItem = {
              id: `pts_pos_${Date.now()}`,
              amount: saleData.pointsAwarded,
              reason: `Compra en POS (${saleData.pointsPercentageUsed}%): ${itemsSummary}`,
              date: now,
              type: 'add',
            };

            const nextHistory = [historyItem, ...(user.pointsHistory || [])].slice(0, 50);

            // Registrar también como compra del cliente
            const newPurchase: UserPurchaseItem = {
              id: `pur_pos_${Date.now()}`,
              itemName: `Productos POS: ${itemsSummary}`,
              price: saleData.total,
              barberName: saleData.barberName,
              notes: `Venta POS #${saleId.slice(-6)} (+${saleData.pointsAwarded} pts)`,
              date: now,
            };
            const nextPurchases = [newPurchase, ...(user.purchases || [])];

            await updateDoc(userRef, {
              puntos: newPoints,
              historial_puntos: nextHistory,
              compras: nextPurchases,
              actualizado_en: now,
            });
          }
        } catch (clientErr) {
          console.warn('Could not update customer points for POS sale:', clientErr);
        }
      }

      return fullSale;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'ventas_pos');
      throw error;
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
