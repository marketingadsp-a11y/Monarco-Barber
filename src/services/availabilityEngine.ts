import {
  Appointment,
  Barber,
  BarberSchedule,
  BlockedSlot,
  ScheduleException,
  BusinessSettings,
  AvailableTimeSlot,
  AlternativeBarberSuggestion,
  DaySchedule,
} from '../types';
import {
  timeToMinutes,
  minutesToTime,
  isTimeSlotInPast,
} from '../utils/dateTime';

export interface AvailabilityParams {
  barberId: string;
  serviceDurationMinutes: number;
  date: string; // YYYY-MM-DD
  barberSchedule?: BarberSchedule | null;
  appointments: Appointment[];
  blockedSlots: BlockedSlot[];
  exceptions?: ScheduleException[];
  settings?: BusinessSettings | null;
  ignoreMinNotice?: boolean;
}

export interface AlternativeBarberParams {
  serviceId: string;
  serviceDurationMinutes: number;
  date: string;
  desiredTime: string; // "17:00"
  preferredBarberId: string;
  allBarbers: Barber[];
  favoriteBarberIds?: string[];
  allAppointments: Appointment[];
  allSchedules: Record<string, BarberSchedule>;
  allBlockedSlots: BlockedSlot[];
  settings?: BusinessSettings | null;
}

/**
 * Checks whether two time intervals overlap: [startA, endA) and [startB, endB)
 */
export function doIntervalsOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  const minAStart = timeToMinutes(startA);
  const minAEnd = timeToMinutes(endA);
  const minBStart = timeToMinutes(startB);
  const minBEnd = timeToMinutes(endB);

  return Math.max(minAStart, minBStart) < Math.min(minAEnd, minBEnd);
}

/**
 * Returns the day of week index (0 = Sunday ... 6 = Saturday) for a YYYY-MM-DD string.
 */
export function getDayOfWeekFromDateStr(date: string): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  const [year, month, day] = date.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  return dateObj.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

/**
 * Returns whether the barbershop is open on a given YYYY-MM-DD date according to BusinessSettings.
 */
export function isShopOpenOnDate(date: string, settings?: BusinessSettings | null): boolean {
  const dayOfWeek = getDayOfWeekFromDateStr(date);
  const weekly = settings?.weeklySchedule;
  if (weekly && weekly[dayOfWeek]) {
    const dayCfg: DaySchedule = weekly[dayOfWeek];
    return Boolean(dayCfg.isOpen && Array.isArray(dayCfg.slots) && dayCfg.slots.length > 0);
  }
  return dayOfWeek !== 0;
}

/**
 * Computes effective slot grid step based on configured base interval and registered service duration.
 * - If service is shorter than base interval (e.g., 15 or 20 min on a 30 min grid), step adapts to serviceDurationMinutes.
 * - If service is equal or longer than base interval (e.g., 40 or 60 min on a 30 min grid), keeps baseInterval so
 *   existing appointments round cleanly (e.g. 3:00 PM + 40 min -> 3:40 PM -> next slot at 4:00 PM with 20 min buffer).
 */
export function getAdaptiveSlotStep(baseIntervalMinutes: number, serviceDurationMinutes: number): number {
  const safeBase = Math.max(5, baseIntervalMinutes || 30);
  const safeDuration = Math.max(5, serviceDurationMinutes || safeBase);
  if (safeDuration < safeBase) {
    return safeDuration;
  }
  return safeBase;
}

/**
 * Main Availability Engine: calculates valid bookable time slots for a specific barber, date and duration.
 */
export function getAvailableSlots(params: AvailabilityParams): AvailableTimeSlot[] {
  const {
    barberId,
    serviceDurationMinutes,
    date,
    barberSchedule,
    appointments,
    blockedSlots,
    exceptions = [],
    settings,
    ignoreMinNotice = false,
  } = params;

  const result: AvailableTimeSlot[] = [];
  const baseInterval = Math.max(5, settings?.slotIntervalMinutes || 30);
  const effectiveStep = getAdaptiveSlotStep(baseInterval, serviceDurationMinutes);
  const minNoticeMinutes = ignoreMinNotice ? 0 : (settings?.minBookingNoticeMinutes ?? 30);

  // 1. Get Day of Week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const dayOfWeek = getDayOfWeekFromDateStr(date);

  // 2. Check for barber-specific exceptions for this date
  const exception = exceptions.find((e) => e.barberId === barberId && e.date === date);
  if (exception?.isDayOff) {
    return []; // Barber is on vacation / day off
  }

  // 3. Determine working windows: Barbershop weekly schedule is authoritative
  let workingWindows: Array<{ start: string; end: string }> = [];

  if (settings?.weeklySchedule && settings.weeklySchedule[dayOfWeek]) {
    const shopDay = settings.weeklySchedule[dayOfWeek];
    if (!shopDay.isOpen || !shopDay.slots || shopDay.slots.length === 0) {
      return []; // Barbershop closed this day
    }
    workingWindows = [...shopDay.slots].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
  } else if (settings?.openingTime && settings?.closingTime) {
    if (dayOfWeek === 0) {
      return [];
    }
    workingWindows = [{ start: settings.openingTime, end: settings.closingTime }];
  } else if (barberSchedule?.weeklySchedule && barberSchedule.weeklySchedule[dayOfWeek]) {
    const dayConfig = barberSchedule.weeklySchedule[dayOfWeek];
    if (!dayConfig.isOpen || !dayConfig.slots || dayConfig.slots.length === 0) {
      return [];
    }
    workingWindows = [...dayConfig.slots].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
  } else {
    if (dayOfWeek === 0) {
      return [];
    }
    workingWindows = [
      { start: '10:00', end: '14:00' },
      { start: '15:00', end: '20:00' },
    ];
  }

  // Apply custom barber exception slots if provided (clamped inside shop open hours when defined)
  if (exception?.customSlots && exception.customSlots.length > 0) {
    workingWindows = [...exception.customSlots].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
  }

  // Filter relevant appointments for this barber and date
  const activeAppointments = appointments.filter((app) => {
    return (
      app.barberId === barberId &&
      app.date === date &&
      app.status !== 'cancelled' &&
      app.status !== 'rejected'
    );
  });

  // Filter relevant blocked slots
  const activeBlockedSlots = blockedSlots.filter((block) => {
    return block.barberId === barberId && block.date === date;
  });

  // 4. Generate prospective slots across all working windows
  for (const window of workingWindows) {
    const windowStartMin = timeToMinutes(window.start);
    const windowEndMin = timeToMinutes(window.end);
    if (windowEndMin <= windowStartMin) continue;

    for (let currentMin = windowStartMin; currentMin + serviceDurationMinutes <= windowEndMin; currentMin += effectiveStep) {
      const slotStartTime = minutesToTime(currentMin);
      const slotEndTime = minutesToTime(currentMin + serviceDurationMinutes);

      // Check if slot is in the past
      if (isTimeSlotInPast(date, slotStartTime, minNoticeMinutes)) {
        continue;
      }

      // Check overlap with existing appointments with grid-aligned cleanup buffer
      let hasAppointmentConflict = false;
      let conflictReason: string | undefined = undefined;

      for (const app of activeAppointments) {
        const appDuration = Math.max(1, timeToMinutes(app.endTime) - timeToMinutes(app.startTime));
        const roundedDuration = Math.ceil(appDuration / effectiveStep) * effectiveStep;
        const appRoundedEndTime = minutesToTime(timeToMinutes(app.startTime) + roundedDuration);

        if (doIntervalsOverlap(slotStartTime, slotEndTime, app.startTime, appRoundedEndTime)) {
          hasAppointmentConflict = true;
          conflictReason = `Reservado (${app.startTime} - ${app.endTime})`;
          break;
        }
      }

      // Check overlap with blocked slots / breaks
      let hasBlockedConflict = false;
      if (!hasAppointmentConflict) {
        for (const block of activeBlockedSlots) {
          if (doIntervalsOverlap(slotStartTime, slotEndTime, block.startTime, block.endTime)) {
            hasBlockedConflict = true;
            conflictReason = `Bloqueado: ${block.reason || 'Descanso'}`;
            break;
          }
        }
      }

      const isAvailable = !hasAppointmentConflict && !hasBlockedConflict;

      result.push({
        startTime: slotStartTime,
        endTime: slotEndTime,
        available: isAvailable,
        barberId,
        conflictReason,
      });
    }
  }

  return result;
}

/**
 * Intelligent alternative suggestions engine when chosen barber is unavailable at requested time.
 */
export function findAlternativeBarbers(params: AlternativeBarberParams): AlternativeBarberSuggestion[] {
  const {
    serviceId,
    serviceDurationMinutes,
    date,
    desiredTime,
    preferredBarberId,
    allBarbers,
    favoriteBarberIds = [],
    allAppointments,
    allSchedules,
    allBlockedSlots,
    settings,
  } = params;

  const suggestions: AlternativeBarberSuggestion[] = [];
  const desiredMinutes = timeToMinutes(desiredTime);

  const candidateBarbers = allBarbers.filter(
    (b) => b.active && b.id !== preferredBarberId && (b.serviceIds.length === 0 || b.serviceIds.includes(serviceId))
  );

  for (const barber of candidateBarbers) {
    const schedule = allSchedules[barber.id];
    const slots = getAvailableSlots({
      barberId: barber.id,
      serviceDurationMinutes,
      date,
      barberSchedule: schedule,
      appointments: allAppointments,
      blockedSlots: allBlockedSlots,
      settings,
    });

    const availableSlots = slots.filter((s) => s.available);
    if (availableSlots.length === 0) continue;

    // Find the slot closest to desiredTime
    let closestSlot: AvailableTimeSlot | null = null;
    let minDiff = Infinity;

    for (const slot of availableSlots) {
      const slotMin = timeToMinutes(slot.startTime);
      const diff = Math.abs(slotMin - desiredMinutes);
      if (diff < minDiff) {
        minDiff = diff;
        closestSlot = slot;
      }
    }

    if (closestSlot) {
      const isExact = closestSlot.startTime === desiredTime;
      const isFav = favoriteBarberIds.includes(barber.id);

      suggestions.push({
        barber,
        availableSlot: closestSlot,
        isExactMatch: isExact,
        isFavorite: isFav,
        timeDifferenceMinutes: minDiff,
      });
    }
  }

  // Sort suggestions:
  // 1. Exact time matches first
  // 2. Shortest time difference
  // 3. Favorites first
  // 4. Highest rating
  suggestions.sort((a, b) => {
    if (a.isExactMatch && !b.isExactMatch) return -1;
    if (!a.isExactMatch && b.isExactMatch) return 1;

    if (a.timeDifferenceMinutes !== b.timeDifferenceMinutes) {
      return a.timeDifferenceMinutes - b.timeDifferenceMinutes;
    }

    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;

    return b.barber.rating - a.barber.rating;
  });

  return suggestions;
}
