import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  Barber,
  Service,
  Appointment,
  BarberSchedule,
  BlockedSlot,
  BusinessSettings,
  AppointmentStatus,
  NotificationSettings,
  Product,
  PosSale,
} from '../types';
import { dataService } from '../services/firebase/dataService';
import { SEED_BUSINESS_SETTINGS } from '../services/firebase/seedData';
import { useAuth } from './AuthContext';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  playNotificationSound,
  sendBrowserNotification,
  requestBrowserNotificationPermission,
  getBrowserNotificationPermission,
  isBrowserNotificationSupported,
  hasDispatchedReminder,
  markReminderDispatched,
} from '../services/notificationService';
import { formatDateSpanish, formatTime12h, getMinutesUntilAppointment } from '../utils/dateTime';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  tag?: string;
}

interface BarbershopContextType {
  services: Service[];
  barbers: Barber[];
  products: Product[];
  posSales: PosSale[];
  appointments: Appointment[];
  schedules: Record<string, BarberSchedule>;
  blockedSlots: BlockedSlot[];
  businessSettings: BusinessSettings;
  notificationSettings: NotificationSettings;
  isLoading: boolean;
  toasts: ToastMessage[];
  showToast: (
    type: 'success' | 'error' | 'info' | 'warning',
    title: string,
    message: string,
    options?: { playSound?: boolean; soundType?: 'booking' | 'reminder' | 'success' | 'alert'; tag?: string }
  ) => void;
  removeToast: (id: string) => void;
  bookAppointment: (data: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Appointment>;
  cancelAppointment: (appointmentId: string, reason?: string, by?: 'client' | 'barber' | 'admin') => Promise<void>;
  rescheduleAppointment: (appointmentId: string, newDate: string, newStartTime: string, newEndTime: string) => Promise<void>;
  updateAppointmentStatus: (
    appointmentId: string,
    status: AppointmentStatus,
    options?: { notes?: string; cancelledBy?: 'client' | 'barber' | 'admin'; cancelReason?: string }
  ) => Promise<void>;
  saveBarber: (barber: Partial<Barber> & { id?: string }) => Promise<string>;
  saveBarberWithCredentials: (
    barber: Partial<Barber> & { id?: string },
    credentials: { accessCode?: string; phone?: string; pin?: string }
  ) => Promise<string>;
  deleteBarber: (barberId: string) => Promise<void>;
  toggleBarberActive: (barberId: string, active: boolean) => Promise<void>;
  saveService: (service: Partial<Service> & { id?: string }) => Promise<string>;
  deleteService: (serviceId: string) => Promise<void>;
  toggleServiceActive: (serviceId: string, active: boolean) => Promise<void>;
  saveProduct: (product: Partial<Product> & { id?: string }) => Promise<string>;
  deleteProduct: (productId: string) => Promise<void>;
  toggleProductActive: (productId: string, active: boolean) => Promise<void>;
  recordPosSale: (saleData: Omit<PosSale, 'id' | 'createdAt'>) => Promise<PosSale>;
  updateProductPointsSettings: (enabled: boolean, percentage: number) => Promise<void>;
  saveBarberSchedule: (barberId: string, schedule: BarberSchedule) => Promise<void>;
  addBlockedSlot: (slot: Omit<BlockedSlot, 'id' | 'createdAt'>) => Promise<string>;
  deleteBlockedSlot: (slotId: string) => Promise<void>;
  saveSettings: (settings: Partial<BusinessSettings>) => Promise<void>;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  requestBrowserNotifications: () => Promise<NotificationPermission>;
  testNotification: (type: 'barber_new_booking' | 'client_reminder_24h' | 'client_reminder_2h' | 'sound_only') => void;
}

const BarbershopContext = createContext<BarbershopContextType | undefined>(undefined);

export const BarbershopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentRole, userProfile, currentBarberId } = useAuth();

  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [posSales, setPosSales] = useState<PosSale[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [schedules, setSchedules] = useState<Record<string, BarberSchedule>>({});
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>(SEED_BUSINESS_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState<boolean>(false);
  const [servicesLoaded, setServicesLoaded] = useState<boolean>(false);
  const [barbersLoaded, setBarbersLoaded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Track initial load of appointments to prevent alerting old appointments on page refresh
  const isInitialApptsLoadRef = useRef<boolean>(true);
  const prevAppointmentIdsRef = useRef<Set<string>>(new Set());

  const activeNotificationSettings: NotificationSettings = {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...(businessSettings.notificationSettings || {}),
  };

  const showToast = (
    type: 'success' | 'error' | 'info' | 'warning',
    title: string,
    message: string,
    options?: { playSound?: boolean; soundType?: 'booking' | 'reminder' | 'success' | 'alert'; tag?: string }
  ) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, type, title, message, tag: options?.tag }]);

    if (options?.playSound && activeNotificationSettings.enableAudioChime) {
      playNotificationSound(options.soundType || 'success');
    }

    setTimeout(() => {
      removeToast(id);
    }, 6000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // 1. Initial Seed & Subscriptions
  useEffect(() => {
    let isMounted = true;

    async function init() {
      await dataService.seedInitialDataIfNeeded();
    }
    init();

    const unsubServices = dataService.subscribeToServices((srvs) => {
      if (isMounted) {
        setServices(srvs);
        setServicesLoaded(true);
      }
    });

    const unsubBarbers = dataService.subscribeToBarbers((barbs) => {
      if (isMounted) {
        setBarbers(barbs);
        setBarbersLoaded(true);
      }
    });

    const unsubSchedules = dataService.subscribeToBarberSchedules((scheds) => {
      if (isMounted) setSchedules(scheds);
    });

    const unsubBlocked = dataService.subscribeToBlockedSlots((blocks) => {
      if (isMounted) setBlockedSlots(blocks);
    });

    const unsubSettings = dataService.subscribeToBusinessSettings((settings) => {
      if (isMounted) {
        setBusinessSettings(settings);
        setSettingsLoaded(true);
      }
    });

    const unsubProducts = dataService.subscribeToProducts((prods) => {
      if (isMounted) setProducts(prods);
    });

    const unsubPosSales = dataService.subscribeToPosSales((sales) => {
      if (isMounted) setPosSales(sales);
    });

    return () => {
      isMounted = false;
      unsubServices();
      unsubBarbers();
      unsubSchedules();
      unsubBlocked();
      unsubSettings();
      unsubProducts();
      unsubPosSales();
    };
  }, []);

  // Update loading state only when critical initial data from subscriptions is fully loaded
  useEffect(() => {
    if (settingsLoaded && servicesLoaded && barbersLoaded) {
      setIsLoading(false);
    }
  }, [settingsLoaded, servicesLoaded, barbersLoaded]);

  // 2. Appointments subscription & Real-time Barber New Booking Notification
  useEffect(() => {
    // Reset initial load state when role or user switches
    isInitialApptsLoadRef.current = true;
    prevAppointmentIdsRef.current = new Set();

    const unsubAppts = dataService.subscribeToAppointments(
      currentRole,
      userProfile?.id,
      currentBarberId || undefined,
      (appts) => {
        setAppointments(appts);

        // First snapshot: register existing IDs without triggering notifications
        if (isInitialApptsLoadRef.current) {
          prevAppointmentIdsRef.current = new Set(appts.map((a) => a.id));
          isInitialApptsLoadRef.current = false;
          return;
        }

        // Subsequent snapshot: Check for newly created appointments
        const newlyAdded = appts.filter((a) => !prevAppointmentIdsRef.current.has(a.id));
        prevAppointmentIdsRef.current = new Set(appts.map((a) => a.id));

        if (newlyAdded.length > 0) {
          for (const newAppt of newlyAdded) {
            // Only notify if status is not cancelled and is newly created
            if (newAppt.status === 'cancelled' || newAppt.status === 'rejected') continue;

            const isForCurrentBarber = currentBarberId ? newAppt.barberId === currentBarberId : false;
            const isForAdmin = currentRole === 'admin';

            // Real-time Barber Notification (also alerts admin)
            if ((isForCurrentBarber || isForAdmin) && (currentRole === 'barber' || currentRole === 'admin')) {
              const formattedDate = formatDateSpanish(newAppt.date);
              const formattedTime = formatTime12h(newAppt.startTime);

              if (activeNotificationSettings.barberNewBookingToast) {
                showToast(
                  'success',
                  '🔔 ¡Nueva Cita Agendada!',
                  `${newAppt.clientName} ha reservado ${newAppt.serviceNameSnapshot} para el ${formattedDate} a las ${formattedTime}.`,
                  {
                    playSound: activeNotificationSettings.barberNewBookingSound && activeNotificationSettings.enableAudioChime,
                    soundType: 'booking',
                    tag: `appt_${newAppt.id}`,
                  }
                );
              }

              if (activeNotificationSettings.barberBrowserPush) {
                sendBrowserNotification('🔔 ¡Nueva Cita en Monarca Barber!', {
                  body: `${newAppt.clientName} agendó ${newAppt.serviceNameSnapshot} (${formattedDate}, ${formattedTime}).`,
                  tag: `barber_new_${newAppt.id}`,
                });
              }
            }
          }
        }
      }
    );

    return () => unsubAppts();
  }, [currentRole, userProfile?.id, currentBarberId, activeNotificationSettings.barberNewBookingToast, activeNotificationSettings.barberNewBookingSound, activeNotificationSettings.barberBrowserPush, activeNotificationSettings.enableAudioChime]);

  // 3. Client Automated Reminders Engine (24h before & 2h before)
  useEffect(() => {
    if (currentRole !== 'client' || !userProfile?.id) return;

    const checkClientReminders = () => {
      const activeAppts = appointments.filter(
        (a) => (a.status === 'confirmed' || a.status === 'pending') && a.clientId === userProfile.id
      );

      for (const app of activeAppts) {
        const minutesLeft = getMinutesUntilAppointment(app.date, app.startTime);

        // 1. Recordatorio 1 día (24 horas) antes: entre 18 horas (1080m) y 28 horas (1680m)
        if (minutesLeft >= 1080 && minutesLeft <= 1680) {
          if (!hasDispatchedReminder(app.id, '24h') && activeNotificationSettings.clientReminder24h) {
            markReminderDispatched(app.id, '24h');

            const formattedTime = formatTime12h(app.startTime);
            showToast(
              'info',
              '🗓️ Recordatorio: Cita Mañana',
              `Tienes tu cita de ${app.serviceNameSnapshot} con ${app.barberName} mañana a las ${formattedTime} en Monarca Barber.`,
              {
                playSound: activeNotificationSettings.enableAudioChime,
                soundType: 'reminder',
                tag: `reminder_24h_${app.id}`,
              }
            );

            if (activeNotificationSettings.clientBrowserPush) {
              sendBrowserNotification('🗓️ Recordatorio: Cita Mañana', {
                body: `Tu cita de ${app.serviceNameSnapshot} con ${app.barberName} es mañana a las ${formattedTime}.`,
                tag: `client_24h_${app.id}`,
              });
            }
          }
        }

        // 2. Recordatorio 2 horas antes: entre 5 minutos y 135 minutos antes
        if (minutesLeft >= 5 && minutesLeft <= 135) {
          if (!hasDispatchedReminder(app.id, '2h') && activeNotificationSettings.clientReminder2h) {
            markReminderDispatched(app.id, '2h');

            const formattedTime = formatTime12h(app.startTime);
            showToast(
              'warning',
              '⏰ Tu Cita es en 2 Horas',
              `Tu servicio ${app.serviceNameSnapshot} con ${app.barberName} comienza a las ${formattedTime}. ¡Te esperamos en Masaryk 360!`,
              {
                playSound: activeNotificationSettings.enableAudioChime,
                soundType: 'reminder',
                tag: `reminder_2h_${app.id}`,
              }
            );

            if (activeNotificationSettings.clientBrowserPush) {
              sendBrowserNotification('⏰ Tu Cita es en 2 Horas', {
                body: `Tu servicio ${app.serviceNameSnapshot} con ${app.barberName} es hoy a las ${formattedTime}. ¡Te esperamos!`,
                tag: `client_2h_${app.id}`,
              });
            }
          }
        }
      }
    };

    // Run check immediately on appointments change and every 45 seconds
    checkClientReminders();
    const interval = setInterval(checkClientReminders, 45000);

    return () => clearInterval(interval);
  }, [appointments, currentRole, userProfile?.id, activeNotificationSettings.clientReminder24h, activeNotificationSettings.clientReminder2h, activeNotificationSettings.clientBrowserPush, activeNotificationSettings.enableAudioChime]);

  // Actions
  const bookAppointment = async (data: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const created = await dataService.createAppointment(data);

      // Client Booking Confirmation Notification
      if (activeNotificationSettings.clientBookingConfirmation) {
        showToast(
          'success',
          '¡Cita Confirmada con Éxito!',
          `Tu cita con ${data.barberName} para el ${formatDateSpanish(data.date)} a las ${formatTime12h(data.startTime)} ha sido agendada.`,
          {
            playSound: activeNotificationSettings.enableAudioChime,
            soundType: 'booking',
            tag: `booking_conf_${created.id}`,
          }
        );

        if (activeNotificationSettings.clientBrowserPush) {
          sendBrowserNotification('✨ ¡Cita Confirmada en Monarca Barber!', {
            body: `Cita agendada para ${data.serviceNameSnapshot} con ${data.barberName} el ${formatDateSpanish(data.date)} a las ${formatTime12h(data.startTime)}.`,
            tag: `client_conf_${created.id}`,
          });
        }
      }

      return created;
    } catch (error: any) {
      showToast('error', 'Error al reservar', error.message || 'No se pudo crear la cita. Por favor intenta otro horario.');
      throw error;
    }
  };

  const cancelAppointment = async (appointmentId: string, reason?: string, by: 'client' | 'barber' | 'admin' = 'client') => {
    try {
      await dataService.updateAppointmentStatus(appointmentId, 'cancelled', {
        cancelledBy: by,
        cancelReason: reason || 'Cancelado por el usuario',
      });
      showToast('info', 'Cita Cancelada', 'La cita ha sido cancelada correctamente.');
    } catch (error: any) {
      showToast('error', 'Error al cancelar', error.message || 'No se pudo cancelar la cita.');
      throw error;
    }
  };

  const rescheduleAppointment = async (appointmentId: string, newDate: string, newStartTime: string, newEndTime: string) => {
    try {
      await dataService.rescheduleAppointment(appointmentId, newDate, newStartTime, newEndTime);
      showToast('success', 'Cita Reprogramada', `Tu cita fue movida al ${formatDateSpanish(newDate)} a las ${formatTime12h(newStartTime)}.`);
    } catch (error: any) {
      showToast('error', 'Error al reprogramar', error.message || 'El horario solicitado no está disponible.');
      throw error;
    }
  };

  const updateAppointmentStatus = async (
    appointmentId: string,
    status: AppointmentStatus,
    options?: { notes?: string; cancelledBy?: 'client' | 'barber' | 'admin'; cancelReason?: string }
  ) => {
    try {
      await dataService.updateAppointmentStatus(appointmentId, status, options);
      const statusNames: Record<AppointmentStatus, string> = {
        pending: 'Pendiente',
        confirmed: 'Confirmada',
        completed: 'Completada',
        cancelled: 'Cancelada',
        no_show: 'No se presentó',
        rejected: 'Rechazada',
      };
      showToast('success', 'Estado Actualizado', `La cita fue marcada como "${statusNames[status]}".`);
    } catch (error: any) {
      showToast('error', 'Error al actualizar', error.message || 'No se pudo actualizar el estado de la cita.');
      throw error;
    }
  };

  const saveBarber = async (barber: Partial<Barber> & { id?: string }) => {
    try {
      const id = await dataService.saveBarber(barber);
      showToast('success', 'Barbero Guardado', 'Los datos del barbero fueron guardados correctamente.');
      return id;
    } catch (error: any) {
      showToast('error', 'Error al guardar barbero', error.message || 'No se pudo guardar el barbero.');
      throw error;
    }
  };

  const saveBarberWithCredentials = async (
    barber: Partial<Barber> & { id?: string },
    credentials: { accessCode?: string; phone?: string; pin?: string }
  ) => {
    try {
      const id = await dataService.saveBarberWithCredentials(barber, credentials);
      showToast('success', 'Barbero Guardado', 'Perfil y credenciales de acceso guardados correctamente.');
      return id;
    } catch (error: any) {
      showToast('error', 'Error al guardar barbero', error.message || 'No se pudo guardar el barbero y su acceso.');
      throw error;
    }
  };

  const deleteBarber = async (barberId: string) => {
    try {
      await dataService.deleteBarber(barberId);
      showToast('info', 'Barbero Eliminado', 'El barbero ha sido removido del equipo.');
    } catch (error: any) {
      showToast('error', 'Error al eliminar barbero', error.message || 'No se pudo eliminar el barbero.');
      throw error;
    }
  };

  const toggleBarberActive = async (barberId: string, active: boolean) => {
    try {
      await dataService.toggleBarberActive(barberId, active);
      showToast('info', 'Estado Modificado', `Barbero ${active ? 'activado' : 'desactivado'}.`);
    } catch (error: any) {
      showToast('error', 'Error', error.message);
    }
  };

  const saveProduct = async (product: Partial<Product> & { id?: string }) => {
    try {
      const id = await dataService.saveProduct(product);
      showToast('success', 'Producto Guardado', 'El producto está disponible en el inventario.');
      return id;
    } catch (error: any) {
      showToast('error', 'Error al guardar producto', error.message || 'No se pudo guardar el producto.');
      throw error;
    }
  };

  const deleteProduct = async (productId: string) => {
    try {
      await dataService.deleteProduct(productId);
      showToast('info', 'Producto Eliminado', 'El producto ha sido eliminado del catálogo.');
    } catch (error: any) {
      showToast('error', 'Error al eliminar producto', error.message || 'No se pudo eliminar el producto.');
      throw error;
    }
  };

  const toggleProductActive = async (productId: string, active: boolean) => {
    try {
      await dataService.toggleProductActive(productId, active);
      showToast('info', 'Estado Modificado', `Producto ${active ? 'activado' : 'desactivado'}.`);
    } catch (error: any) {
      showToast('error', 'Error', error.message);
    }
  };

  const recordPosSale = async (saleData: Omit<PosSale, 'id' | 'createdAt'>): Promise<PosSale> => {
    try {
      const sale = await dataService.recordPosSale(saleData);
      const pointsMsg = sale.pointsAwarded > 0 ? ` (+${sale.pointsAwarded} pts para ${sale.customerName})` : '';
      showToast(
        'success',
        '🛍️ Venta Realizada con Éxito',
        `Cobro completado por $${sale.total.toFixed(2)}${pointsMsg}`,
        { playSound: true, soundType: 'success' }
      );
      return sale;
    } catch (error: any) {
      showToast('error', 'Error en la Venta POS', error.message || 'No se pudo registrar la venta.');
      throw error;
    }
  };

  const updateProductPointsSettings = async (enabled: boolean, percentage: number) => {
    try {
      await saveSettings({
        ...businessSettings,
        enableProductPointsReward: enabled,
        productPointsPercentage: percentage,
      });
      showToast('success', 'Puntos de Productos Actualizados', `Recompensa del ${percentage}% ${enabled ? 'activada' : 'desactivada'}.`);
    } catch (error: any) {
      showToast('error', 'Error al actualizar configuración de puntos', error.message);
      throw error;
    }
  };

  const saveService = async (service: Partial<Service> & { id?: string }) => {
    try {
      const id = await dataService.saveService(service);
      showToast('success', 'Servicio Guardado', 'El servicio fue actualizado en el catálogo.');
      return id;
    } catch (error: any) {
      showToast('error', 'Error al guardar servicio', error.message);
      throw error;
    }
  };

  const deleteService = async (serviceId: string) => {
    try {
      await dataService.deleteService(serviceId);
      showToast('info', 'Servicio Eliminado', 'El servicio ha sido removido.');
    } catch (error: any) {
      showToast('error', 'Error al eliminar servicio', error.message);
      throw error;
    }
  };

  const toggleServiceActive = async (serviceId: string, active: boolean) => {
    try {
      await dataService.toggleServiceActive(serviceId, active);
      showToast('info', 'Estado Modificado', `Servicio ${active ? 'activado' : 'desactivado'}.`);
    } catch (error: any) {
      showToast('error', 'Error', error.message);
    }
  };

  const saveBarberSchedule = async (barberId: string, schedule: BarberSchedule) => {
    try {
      await dataService.saveBarberSchedule(barberId, schedule);
      showToast('success', 'Horario Guardado', 'El horario semanal ha sido actualizado.');
    } catch (error: any) {
      showToast('error', 'Error al guardar horario', error.message);
      throw error;
    }
  };

  const addBlockedSlot = async (slot: Omit<BlockedSlot, 'id' | 'createdAt'>) => {
    try {
      const id = await dataService.addBlockedSlot(slot);
      showToast('info', 'Horario Bloqueado', `Se bloqueó el intervalo ${slot.startTime} - ${slot.endTime}.`);
      return id;
    } catch (error: any) {
      showToast('error', 'Error al bloquear horario', error.message);
      throw error;
    }
  };

  const deleteBlockedSlot = async (slotId: string) => {
    try {
      await dataService.deleteBlockedSlot(slotId);
      showToast('info', 'Bloqueo Eliminado', 'El espacio bloqueado ha sido liberado.');
    } catch (error: any) {
      showToast('error', 'Error', error.message);
    }
  };

  const saveSettings = async (settings: Partial<BusinessSettings>) => {
    try {
      await dataService.saveBusinessSettings(settings);
      showToast('success', 'Configuración Guardada', 'La configuración de Monarca Barber ha sido actualizada.');
    } catch (error: any) {
      showToast('error', 'Error al guardar configuración', error.message);
      throw error;
    }
  };

  const updateNotificationSettings = async (settings: Partial<NotificationSettings>) => {
    try {
      const merged: NotificationSettings = {
        ...activeNotificationSettings,
        ...settings,
      };
      await saveSettings({
        ...businessSettings,
        notificationSettings: merged,
      });
      showToast('success', 'Preferencias de Notificación', 'Los cambios en las notificaciones se guardaron con éxito.');
    } catch (error: any) {
      showToast('error', 'Error', error.message || 'No se pudieron actualizar las notificaciones.');
      throw error;
    }
  };

  const requestBrowserNotifications = async (): Promise<NotificationPermission> => {
    const result = await requestBrowserNotificationPermission();
    if (result === 'granted') {
      showToast('success', '🔔 Notificaciones Activadas', 'Recibirás avisos en tiempo real en Chrome y Safari.');
    } else if (result === 'denied') {
      showToast('warning', 'Notificaciones Bloqueadas', 'Por favor habilita los permisos en los ajustes de tu navegador.');
    }
    return result;
  };

  const testNotification = (type: 'barber_new_booking' | 'client_reminder_24h' | 'client_reminder_2h' | 'sound_only') => {
    if (type === 'barber_new_booking') {
      showToast(
        'success',
        '🔔 ¡Nueva Cita de Prueba (Barbero)!',
        'Alejandro Garza acaba de agendar "Corte & Barba Ritual VIP" para hoy a las 4:00 PM.',
        {
          playSound: activeNotificationSettings.barberNewBookingSound && activeNotificationSettings.enableAudioChime,
          soundType: 'booking',
        }
      );
      if (activeNotificationSettings.barberBrowserPush) {
        sendBrowserNotification('🔔 ¡Nueva Cita en Monarca Barber!', {
          body: 'Alejandro Garza agendó Corte & Barba Ritual VIP para hoy a las 4:00 PM.',
        });
      }
    } else if (type === 'client_reminder_24h') {
      showToast(
        'info',
        '🗓️ Recordatorio: Cita Mañana (Cliente)',
        'Tienes tu cita de Fade & Degradado Urbano con Carlos Mendoza mañana a las 11:30 AM.',
        {
          playSound: activeNotificationSettings.enableAudioChime,
          soundType: 'reminder',
        }
      );
      if (activeNotificationSettings.clientBrowserPush) {
        sendBrowserNotification('🗓️ Recordatorio: Cita Mañana', {
          body: 'Tu cita de Fade & Degradado con Carlos Mendoza es mañana a las 11:30 AM.',
        });
      }
    } else if (type === 'client_reminder_2h') {
      showToast(
        'warning',
        '⏰ Tu Cita es en 2 Horas (Cliente)',
        'Tu servicio Arreglo de Barba Spa con Luis Navarro comienza en 2 horas (3:00 PM). ¡Te esperamos!',
        {
          playSound: activeNotificationSettings.enableAudioChime,
          soundType: 'reminder',
        }
      );
      if (activeNotificationSettings.clientBrowserPush) {
        sendBrowserNotification('⏰ Tu Cita es en 2 Horas', {
          body: 'Tu servicio Arreglo de Barba Spa con Luis Navarro es en 2 horas. Te esperamos en Masaryk 360.',
        });
      }
    } else if (type === 'sound_only') {
      playNotificationSound('booking');
      showToast('info', 'Sonido de Notificación', 'Reproduciendo chime de audio para Chrome y Safari.');
    }
  };

  return (
    <BarbershopContext.Provider
      value={{
        services,
        barbers,
        products,
        posSales,
        appointments,
        schedules,
        blockedSlots,
        businessSettings,
        notificationSettings: activeNotificationSettings,
        isLoading,
        toasts,
        showToast,
        removeToast,
        bookAppointment,
        cancelAppointment,
        rescheduleAppointment,
        updateAppointmentStatus,
        saveBarber,
        saveBarberWithCredentials,
        deleteBarber,
        toggleBarberActive,
        saveService,
        deleteService,
        toggleServiceActive,
        saveProduct,
        deleteProduct,
        toggleProductActive,
        recordPosSale,
        updateProductPointsSettings,
        saveBarberSchedule,
        addBlockedSlot,
        deleteBlockedSlot,
        saveSettings,
        updateNotificationSettings,
        requestBrowserNotifications,
        testNotification,
      }}
    >
      {children}
    </BarbershopContext.Provider>
  );
};

export const useBarbershop = (): BarbershopContextType => {
  const context = useContext(BarbershopContext);
  if (!context) throw new Error('useBarbershop must be used within a BarbershopProvider');
  return context;
};
