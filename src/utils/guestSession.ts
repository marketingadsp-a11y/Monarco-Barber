import { Appointment } from '../types';

export const GUEST_CLIENT_ID_KEY = 'monarca_guest_client_id';
export const GUEST_APPOINTMENT_IDS_KEY = 'monarca_guest_appointment_ids';
export const GUEST_APPOINTMENTS_EVENT = 'monarca_guest_appointments_changed';

export const getGuestClientId = (): string | null => {
  try {
    const val = localStorage.getItem(GUEST_CLIENT_ID_KEY);
    return val && val.trim() ? val.trim() : null;
  } catch {
    return null;
  }
};

export const getOrCreateGuestClientId = (): string => {
  const existing = getGuestClientId();
  if (existing) return existing;

  const newId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  try {
    localStorage.setItem(GUEST_CLIENT_ID_KEY, newId);
  } catch {
    // ignore storage quota / privacy mode errors
  }
  return newId;
};

export const getGuestAppointmentIds = (): string[] => {
  try {
    const raw = localStorage.getItem(GUEST_APPOINTMENT_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

export const addGuestAppointmentId = (appointmentId: string): void => {
  if (!appointmentId) return;
  try {
    const existing = getGuestAppointmentIds();
    if (!existing.includes(appointmentId)) {
      const updated = [...existing, appointmentId];
      localStorage.setItem(GUEST_APPOINTMENT_IDS_KEY, JSON.stringify(updated));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(GUEST_APPOINTMENTS_EVENT));
    }
  } catch {
    // ignore
  }
};

export const isAppointmentOwnedByCurrentBrowser = (
  app: Pick<Appointment, 'id' | 'clientId'>
): boolean => {
  const guestClientId = getGuestClientId();
  const guestAppointmentIds = getGuestAppointmentIds();

  if (guestClientId && app.clientId === guestClientId) {
    return true;
  }
  if (app.id && guestAppointmentIds.includes(app.id)) {
    return true;
  }
  return false;
};
