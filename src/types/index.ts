export type UserRole = 'client' | 'barber' | 'admin';

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'rejected';

export interface UserProfile {
  id: string;
  role: UserRole;
  name: string;
  email?: string;
  phone: string;
  clientNumber?: string; // Unique 6-digit numeric client ID, e.g. "849201"
  pin?: string; // 4-digit numeric password
  points?: number;
  membershipTier?: 'VIP' | 'Gold' | 'Black' | 'Classic';
  qrCodeData?: string;
  photoUrl?: string;
  favoriteBarberIds?: string[];
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Barber {
  id: string;
  userId?: string;
  displayName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  bio: string;
  photoUrl: string;
  gallery: string[];
  specialties: string[];
  serviceIds: string[];
  active: boolean;
  featured?: boolean;
  rating: number;
  reviewCount: number;
  instagram?: string;
  experienceYears?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  description?: string;
  iconName?: string;
  sortOrder: number;
  active: boolean;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  price: number;
  durationMinutes: number;
  imageUrl?: string;
  active: boolean;
  sortOrder: number;
  accentColor?: string;
  includesWash?: boolean;
  isPopular?: boolean;
  barberId?: string; // If set, this is a personalized service created by a specific barber
  createdByType?: 'admin' | 'barber';
  createdAt?: string;
  updatedAt?: string;
}

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  barberId: string;
  barberName: string;
  barberPhoto?: string;
  serviceId: string;
  serviceIds?: string[];
  serviceNameSnapshot: string;
  servicePriceSnapshot: number;
  serviceDurationSnapshot: number;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: AppointmentStatus;
  notes?: string;
  cancelledAt?: string | null;
  cancelledBy?: 'client' | 'barber' | 'admin' | null;
  cancelReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DaySchedule {
  isOpen: boolean;
  slots: Array<{
    start: string; // "10:00"
    end: string;   // "14:00"
  }>;
}

export interface WeeklySchedule {
  0: DaySchedule; // Sunday (0)
  1: DaySchedule; // Monday (1)
  2: DaySchedule; // Tuesday (2)
  3: DaySchedule; // Wednesday (3)
  4: DaySchedule; // Thursday (4)
  5: DaySchedule; // Friday (5)
  6: DaySchedule; // Saturday (6)
}

export interface BarberSchedule {
  barberId: string;
  weeklySchedule: WeeklySchedule;
  timeZone?: string;
  slotIntervalMinutes?: number;
  updatedAt?: string;
}

export interface BlockedSlot {
  id: string;
  barberId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  reason: string;
  createdAt: string;
}

export interface ScheduleException {
  id: string;
  barberId: string;
  date: string; // YYYY-MM-DD
  isDayOff: boolean;
  customSlots?: Array<{ start: string; end: string }>;
  reason?: string;
}

export interface BusinessSettings {
  id: string;
  name: string;
  tagline: string;
  logoUrl?: string;
  address: string;
  googleMapsUrl?: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  minBookingNoticeMinutes: number; // e.g. 30
  maxBookingAdvanceDays: number; // e.g. 30
  minCancelNoticeHours: number; // e.g. 2
  minRescheduleNoticeHours: number; // e.g. 2
  slotIntervalMinutes: number; // e.g. 30
  timeZone: string; // "America/Mexico_City"
  currency: string; // "MXN"
  currencySymbol: string; // "$"
  openingTime: string; // "09:00"
  closingTime: string; // "21:00"
  announcement?: string;
}

export interface Review {
  id: string;
  appointmentId: string;
  clientId: string;
  clientName: string;
  barberId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'appointment_confirmed' | 'appointment_cancelled' | 'reminder' | 'system';
  read: boolean;
  appointmentId?: string;
  createdAt: string;
}

export interface AvailableTimeSlot {
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  available: boolean;
  barberId: string;
  serviceId?: string;
  conflictReason?: string;
}

export interface AlternativeBarberSuggestion {
  barber: Barber;
  availableSlot: AvailableTimeSlot;
  isExactMatch: boolean;
  isFavorite: boolean;
  timeDifferenceMinutes: number;
}

export interface ImageUploadResult {
  id?: string;
  url: string;
  display_url?: string;
  thumb?: string;
  delete_url?: string;
  isSimulated?: boolean;
}
