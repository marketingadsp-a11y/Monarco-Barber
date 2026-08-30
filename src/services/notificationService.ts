import { NotificationSettings } from '../types';

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  barberNewBookingToast: true,
  barberNewBookingSound: true,
  barberBrowserPush: true,
  clientBookingConfirmation: true,
  clientReminder24h: true,
  clientReminder2h: true,
  clientBrowserPush: true,
  enableAudioChime: true,
};

let audioCtx: AudioContext | null = null;

/**
 * Initializes and resumes AudioContext safely across Chrome, Safari (macOS & iOS).
 */
function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Synthesizes a luxury acoustic chime using Web Audio API.
 * Works 100% offline with 0 network latency on Chrome and Safari.
 */
export function playNotificationSound(type: 'booking' | 'reminder' | 'success' | 'alert' = 'booking'): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (type === 'booking') {
      // Elegant 3-chord royal gold fanfare (D5 -> F#5 -> A5 -> D6)
      const frequencies = [587.33, 739.99, 880.0, 1174.66];
      frequencies.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.08);

        gain.gain.setValueAtTime(0.001, now + index * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.22, now + index * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.08 + 0.55);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + index * 0.08);
        osc.stop(now + index * 0.08 + 0.6);
      });
    } else if (type === 'reminder') {
      // Gentle 2-tone melodic chime (A5 -> E6)
      const notes = [880.0, 1318.51];
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + index * 0.12);

        gain.gain.setValueAtTime(0.001, now + index * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.18, now + index * 0.12 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.12 + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + index * 0.12);
        osc.stop(now + index * 0.12 + 0.65);
      });
    } else {
      // Clean positive confirmation blip
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.15);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    }
  } catch (err) {
    console.warn('[NotificationSound] Audio play failed:', err);
  }
}

/**
 * Checks if browser notifications are supported (Chrome, Safari, Edge, Firefox).
 */
export function isBrowserNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Returns current browser notification permission state.
 */
export function getBrowserNotificationPermission(): NotificationPermission {
  if (!isBrowserNotificationSupported()) return 'denied';
  return Notification.permission;
}

/**
 * Requests browser notification permissions gracefully for Chrome & Safari.
 */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (!isBrowserNotificationSupported()) return 'denied';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.warn('[BrowserNotification] Permission request error:', error);
    return Notification.permission;
  }
}

/**
 * Sends a native browser push notification if supported and granted.
 * Works seamlessly on Chrome Desktop/Android and Safari macOS/iOS 16.4+.
 */
export function sendBrowserNotification(
  title: string,
  options?: {
    body?: string;
    icon?: string;
    tag?: string;
    badge?: string;
    silent?: boolean;
    data?: any;
  }
): boolean {
  if (!isBrowserNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    const defaultIcon = 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=192&q=80';
    const notification = new Notification(title, {
      body: options?.body || '',
      icon: options?.icon || defaultIcon,
      badge: options?.badge || defaultIcon,
      tag: options?.tag || `monarca_${Date.now()}`,
      silent: options?.silent ?? false,
      data: options?.data,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return true;
  } catch (err) {
    console.warn('[BrowserNotification] Failed to show notification:', err);
    return false;
  }
}

/**
 * Local storage tracking to avoid duplicate appointment reminder spamming.
 */
const REMINDER_STORAGE_KEY_PREFIX = 'monarca_reminded_';

export function hasDispatchedReminder(appointmentId: string, type: '24h' | '2h'): boolean {
  try {
    const key = `${REMINDER_STORAGE_KEY_PREFIX}${type}_${appointmentId}`;
    return localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

export function markReminderDispatched(appointmentId: string, type: '24h' | '2h'): void {
  try {
    const key = `${REMINDER_STORAGE_KEY_PREFIX}${type}_${appointmentId}`;
    localStorage.setItem(key, 'true');
  } catch {
    // ignore
  }
}
