/**
 * Date and Time utilities for MONARCA BARBER
 * Handled with timezone awareness and strict slot calculations.
 */

export const DEFAULT_TIMEZONE = 'America/Mexico_City';

/**
 * Converts "HH:mm" to total minutes from midnight
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Converts total minutes from midnight to "HH:mm"
 */
export function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const hh = hours.toString().padStart(2, '0');
  const mm = minutes.toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Format "HH:mm" (24h) to "h:mm A" (12h) e.g., "17:30" -> "5:30 PM"
 */
export function formatTime12h(timeStr: string): string {
  if (!timeStr || !timeStr.includes(':')) return timeStr;
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr.padStart(2, '0');
  const period = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${period}`;
}

/**
 * Adds duration in minutes to a "HH:mm" string
 */
export function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  const currentMinutes = timeToMinutes(timeStr);
  return minutesToTime(currentMinutes + minutesToAdd);
}

/**
 * Get today's date formatted as YYYY-MM-DD
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format YYYY-MM-DD to localized Spanish label, e.g. "Jueves 28 Ago"
 */
export function formatDateSpanish(dateStr: string, includeYear = false): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  // Construct date object safely
  const date = new Date(year, month - 1, day);

  const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];

  const dayOfWeek = daysOfWeek[date.getDay()];
  const monthName = months[date.getMonth()];

  const todayStr = getTodayDateString();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${(tomorrow.getMonth() + 1).toString().padStart(2, '0')}-${tomorrow.getDate().toString().padStart(2, '0')}`;

  let prefix = '';
  if (dateStr === todayStr) prefix = 'Hoy, ';
  else if (dateStr === tomorrowStr) prefix = 'Mañana, ';

  return `${prefix}${dayOfWeek}, ${day} ${monthName}${includeYear ? ` ${year}` : ''}`;
}

/**
 * Generate a list of dates for the next N days
 */
export function getUpcomingDays(count = 14): Array<{ dateStr: string; dayName: string; dayNumber: number; monthName: string; isToday: boolean }> {
  const days = [];
  const daysShort = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const monthsShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  
  const today = new Date();

  for (let i = 0; i < count; i++) {
    const current = new Date();
    current.setDate(today.getDate() + i);

    const year = current.getFullYear();
    const month = (current.getMonth() + 1).toString().padStart(2, '0');
    const day = current.getDate().toString().padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    days.push({
      dateStr,
      dayName: daysShort[current.getDay()],
      dayNumber: current.getDate(),
      monthName: monthsShort[current.getMonth()],
      isToday: i === 0,
    });
  }

  return days;
}

/**
 * Check if a given date string is today
 */
export function isToday(dateStr: string): boolean {
  return dateStr === getTodayDateString();
}

/**
 * Check if a date + time is in the past or violates minimum advance booking notice
 */
export function isTimeSlotInPast(dateStr: string, timeStr: string, minNoticeMinutes = 30): boolean {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  const slotDate = new Date(year, month - 1, day, hours, minutes);
  
  const now = new Date();
  const minAllowedTime = new Date(now.getTime() + minNoticeMinutes * 60 * 1000);
  
  return slotDate.getTime() < minAllowedTime.getTime();
}

/**
 * Calculate minutes remaining until appointment start
 */
export function getMinutesUntilAppointment(dateStr: string, timeStr: string): number {
  if (!dateStr || !timeStr) return Infinity;
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    const apptDate = new Date(year, month - 1, day, hours, minutes, 0);
    const now = new Date();
    return (apptDate.getTime() - now.getTime()) / (1000 * 60);
  } catch {
    return Infinity;
  }
}

/**
 * Format currency with symbol
 */
export function formatCurrency(amount: number, currency = 'MXN', symbol = '$'): string {
  return `${symbol}${amount.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${currency}`;
}
