import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  Barber,
  Service,
  Appointment,
  BarberSchedule,
  BlockedSlot,
  BusinessSettings,
  AppointmentStatus,
} from '../types';
import { dataService } from '../services/firebase/dataService';
import { SEED_BUSINESS_SETTINGS } from '../services/firebase/seedData';
import { useAuth } from './AuthContext';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

interface BarbershopContextType {
  services: Service[];
  barbers: Barber[];
  appointments: Appointment[];
  schedules: Record<string, BarberSchedule>;
  blockedSlots: BlockedSlot[];
  businessSettings: BusinessSettings;
  isLoading: boolean;
  toasts: ToastMessage[];
  showToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
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
  toggleBarberActive: (barberId: string, active: boolean) => Promise<void>;
  saveService: (service: Partial<Service> & { id?: string }) => Promise<string>;
  deleteService: (serviceId: string) => Promise<void>;
  toggleServiceActive: (serviceId: string, active: boolean) => Promise<void>;
  saveBarberSchedule: (barberId: string, schedule: BarberSchedule) => Promise<void>;
  addBlockedSlot: (slot: Omit<BlockedSlot, 'id' | 'createdAt'>) => Promise<string>;
  deleteBlockedSlot: (slotId: string) => Promise<void>;
  saveSettings: (settings: Partial<BusinessSettings>) => Promise<void>;
}

const BarbershopContext = createContext<BarbershopContextType | undefined>(undefined);

export const BarbershopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentRole, userProfile, currentBarberId } = useAuth();

  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [schedules, setSchedules] = useState<Record<string, BarberSchedule>>({});
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>(SEED_BUSINESS_SETTINGS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
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
      if (isMounted) setServices(srvs);
    });

    const unsubBarbers = dataService.subscribeToBarbers((barbs) => {
      if (isMounted) setBarbers(barbs);
    });

    const unsubSchedules = dataService.subscribeToBarberSchedules((scheds) => {
      if (isMounted) setSchedules(scheds);
    });

    const unsubBlocked = dataService.subscribeToBlockedSlots((blocks) => {
      if (isMounted) setBlockedSlots(blocks);
    });

    const unsubSettings = dataService.subscribeToBusinessSettings((settings) => {
      if (isMounted) setBusinessSettings(settings);
    });

    setIsLoading(false);

    return () => {
      isMounted = false;
      unsubServices();
      unsubBarbers();
      unsubSchedules();
      unsubBlocked();
      unsubSettings();
    };
  }, []);

  // 2. Appointments subscription based on role/user
  useEffect(() => {
    const unsubAppts = dataService.subscribeToAppointments(
      currentRole,
      userProfile?.id,
      currentBarberId || undefined,
      (appts) => {
        setAppointments(appts);
      }
    );

    return () => unsubAppts();
  }, [currentRole, userProfile?.id, currentBarberId]);

  // Actions
  const bookAppointment = async (data: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const created = await dataService.createAppointment(data);
      showToast('success', '¡Cita Confirmada!', `Tu cita con ${data.barberName} para el ${data.date} a las ${data.startTime} ha sido agendada con éxito.`);
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
      showToast('success', 'Cita Reprogramada', `Tu cita fue movida al ${newDate} a las ${newStartTime}.`);
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

  const toggleBarberActive = async (barberId: string, active: boolean) => {
    try {
      await dataService.toggleBarberActive(barberId, active);
      showToast('info', 'Estado Modificado', `Barbero ${active ? 'activado' : 'desactivado'}.`);
    } catch (error: any) {
      showToast('error', 'Error', error.message);
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
      showToast('success', 'Configuración Guardada', 'La información de Monarca Barber ha sido actualizada.');
    } catch (error: any) {
      showToast('error', 'Error al guardar configuración', error.message);
      throw error;
    }
  };

  return (
    <BarbershopContext.Provider
      value={{
        services,
        barbers,
        appointments,
        schedules,
        blockedSlots,
        businessSettings,
        isLoading,
        toasts,
        showToast,
        removeToast,
        bookAppointment,
        cancelAppointment,
        rescheduleAppointment,
        updateAppointmentStatus,
        saveBarber,
        toggleBarberActive,
        saveService,
        deleteService,
        toggleServiceActive,
        saveBarberSchedule,
        addBlockedSlot,
        deleteBlockedSlot,
        saveSettings,
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
