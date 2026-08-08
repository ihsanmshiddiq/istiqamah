/**
 * Smart Notification Service
 * Handles prayer time reminders, habit reminders, and muraja'ah scheduling.
 * Uses the Web Notification API with adaptive timing.
 */

import { computePrayerTimes, localTimezoneHours } from "@/lib/content/islamic";

export type NotificationType = "prayer" | "habit" | "muraja'ah" | "achievement";

export interface NotificationConfig {
  enabled: boolean;
  prayerReminders: boolean;
  habitReminders: boolean;
  murajaahReminders: boolean;
  reminderMinutesBefore: number; // minutes before prayer
}

const DEFAULT_CONFIG: NotificationConfig = {
  enabled: true,
  prayerReminders: true,
  habitReminders: true,
  murajaahReminders: true,
  reminderMinutesBefore: 15,
};

const STORAGE_KEY = "istq-notifications";

// ─── Permission ───
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function isNotificationSupported(): boolean {
  return "Notification" in window;
}

// ─── Config ───
export function getNotificationConfig(): NotificationConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT_CONFIG;
}

export function setNotificationConfig(config: Partial<NotificationConfig>) {
  const current = getNotificationConfig();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...config }));
}

// ─── Send Notification ───
export function sendNotification(
  title: string,
  options?: {
    body?: string;
    icon?: string;
    tag?: string;
    requireInteraction?: boolean;
  }
) {
  if (!isNotificationSupported() || Notification.permission !== "granted") return;

  const config = getNotificationConfig();
  if (!config.enabled) return;

  try {
    new Notification(title, {
      body: options?.body,
      icon: options?.icon ?? "/icons/icon-192.png",
      tag: options?.tag,
      requireInteraction: options?.requireInteraction ?? false,
    });
  } catch {
    // Silent fail for notification errors
  }
}

// ─── Prayer Reminders ───
let prayerTimer: ReturnType<typeof setTimeout> | null = null;

export function schedulePrayerReminders() {
  clearPrayerReminders();

  const config = getNotificationConfig();
  if (!config.enabled || !config.prayerReminders) return;

  const now = new Date();
  const tz = localTimezoneHours(now);
  const prayerTimes = computePrayerTimes({
    date: now,
    lat: -6.2088, // Default Jakarta
    lng: 106.8456,
    timezone: tz,
  });

  const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;
  const nowMs = now.getTime();

  for (const prayer of prayers) {
    const prayerTime = prayerTimes[prayer];
    if (!prayerTime || !(prayerTime instanceof Date)) continue;

    const reminderMs = prayerTime.getTime() - config.reminderMinutesBefore * 60_000;
    const delayMs = reminderMs - nowMs;

    if (delayMs > 0 && delayMs < 24 * 60 * 60_000) {
      // Schedule for this prayer
      const timer = setTimeout(() => {
        const prayerNames: Record<string, string> = {
          Fajr: "Subuh",
          Dhuhr: "Dzuhur",
          Asr: "Ashar",
          Maghrib: "Maghrib",
          Isha: "Isya",
        };
        sendNotification(`Waktunya ${prayerNames[prayer] ?? prayer}`, {
          body: `${config.reminderMinutesBefore} menit lagi waktu ${prayerNames[prayer] ?? prayer}`,
          tag: `prayer-${prayer}`,
          requireInteraction: true,
        });
      }, delayMs);

      // Store first timer for cleanup
      if (!prayerTimer) prayerTimer = timer;
    }
  }
}

export function clearPrayerReminders() {
  if (prayerTimer) {
    clearTimeout(prayerTimer);
    prayerTimer = null;
  }
}

// ─── Habit Reminders ───
export function sendHabitReminder(habitName: string) {
  sendNotification("Waktu kebiasaan!", {
    body: `Jangan lupa: ${habitName}`,
    tag: "habit-reminder",
  });
}

// ─── Muraja'ah Reminders ───
export function sendMurajaahReminder(section: string) {
  sendNotification("Waktunya Muraja'ah!", {
    body: `Ulang bacaan: ${section}`,
    tag: "murajaah-reminder",
  });
}

// ─── Achievement Unlocked ───
export function sendAchievementNotification(title: string, description: string) {
  sendNotification("🏆 Pencapaian Baru!", {
    body: `${title}: ${description}`,
    tag: "achievement",
  });
}

// ─── Initialize ───
export function initializeNotifications() {
  if (!isNotificationSupported()) return;

  const config = getNotificationConfig();
  if (config.enabled && config.prayerReminders) {
    schedulePrayerReminders();
  }
}
