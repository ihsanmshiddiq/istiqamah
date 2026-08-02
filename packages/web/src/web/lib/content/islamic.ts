/**
 * Islamic utilities for Hayat — Islamic LifeOS.
 * - Astronomical prayer time calculation (Adhan/PrayTimes-style, simplified & self-contained).
 * - Hijri date formatting via Intl (Umm al-Qura).
 * - Arabic helpers & constants.
 */

export const PRAYERS = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;
export type PrayerName = (typeof PRAYERS)[number];

export const PRAYER_AR: Record<string, string> = {
  Fajr: "الفجر",
  Sunrise: "الشروق",
  Dhuhr: "الظهر",
  Asr: "العصر",
  Maghrib: "المغرب",
  Isha: "العشاء",
};

export const OBLIGATORY_PRAYERS: PrayerName[] = [
  "Fajr",
  "Dhuhr",
  "Asr",
  "Maghrib",
  "Isha",
];

/* ---------------- Prayer calculation methods ---------------- */

export type CalcMethod = {
  name: string;
  fajr: number; // angle
  isha: number; // angle or minutes after maghrib (when > 0 & < 1 uses minutes)
  maghrib: number; // minutes after sunset (0 = astronomical)
};

export const CALC_METHODS: Record<string, CalcMethod> = {
  MWL: { name: "Muslim World League", fajr: 18, isha: 17, maghrib: 0 },
  ISNA: { name: "ISNA", fajr: 15, isha: 15, maghrib: 0 },
  Egypt: { name: "Egyptian Authority", fajr: 19.5, isha: 17.5, maghrib: 0 },
  Makkah: { name: "Umm al-Qura, Makkah", fajr: 18.5, isha: 90, maghrib: 0 },
  Karachi: { name: "Univ. of Karachi", fajr: 18, isha: 18, maghrib: 0 },
  // Kemenag Indonesia — close to MWL with 20° twilight; represented for the selector
  Kemenag: { name: "Kemenag (Indonesia)", fajr: 20, isha: 18, maghrib: 0 },
};

/* ---------------- Astronomical helpers ---------------- */

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

function fixHour(h: number): number {
  h = h - 24 * Math.floor(h / 24);
  return h < 0 ? h + 24 : h;
}

function sin(d: number) {
  return Math.sin(d * DEG2RAD);
}
function cos(d: number) {
  return Math.cos(d * DEG2RAD);
}
function tan(d: number) {
  return Math.tan(d * DEG2RAD);
}
function arcsin(x: number) {
  return Math.asin(x) * RAD2DEG;
}
function arccos(x: number) {
  return Math.acos(x) * RAD2DEG;
}
function arctan2(y: number, x: number) {
  return Math.atan2(y, x) * RAD2DEG;
}
function arccot(x: number) {
  return arctan2(1, x);
}

/** Julian Day Number for a given Date (UTC). */
function julian(year: number, month: number, day: number): number {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return (
    Math.floor(365.25 * (year + 4716)) +
    Math.floor(30.6001 * (month + 1)) +
    day +
    B -
    1524.5
  );
}

/** Sun position: returns [declination, equation of time in hours]. */
function sunPosition(jd: number): [number, number] {
  const D = jd - 2451545.0;
  const g = fixHour(357.529 + 0.98560028 * D);
  const q = fixHour(280.459 + 0.98564736 * D);
  const L = fixHour(q + 1.915 * sin(g) + 0.02 * sin(2 * g));
  const e = 23.439 - 0.00000036 * D;
  const RA = arctan2(cos(e) * sin(L), cos(L)) / 15;
  const eqt = q / 15 - fixHour(RA);
  const decl = arcsin(sin(e) * sin(L));
  return [decl, eqt];
}

/** Time at which the sun's altitude equals `angle` (degrees). angle<0 for rising below horizon. */
function sunAngleTime(angle: number, decl: number, lat: number, noon: number, dir: 1 | -1): number {
  const t =
    (1 / 15) *
    arccos(
      (-sin(angle) - sin(decl) * sin(lat)) / (cos(decl) * cos(lat))
    );
  return noon + dir * t;
}

/** Asr time. shadowFactor = 1 (Shafi'i) or 2 (Hanafi). */
function asrTime(factor: number, decl: number, lat: number, noon: number): number {
  const angle = -arccot(factor + tan(Math.abs(lat - decl)));
  return sunAngleTime(angle, decl, lat, noon, 1);
}

/** Compute mid-day (Dhuhr) time for a date & longitude. */
function midDay(jd: number, lng: number, timezone: number): number {
  const [, eqt] = sunPosition(jd);
  return fixHour(12 - eqt - lng / 15 + timezone);
}

export interface PrayerTimesResult {
  date: Date;
  Fajr: Date;
  Sunrise: Date;
  Dhuhr: Date;
  Asr: Date;
  Maghrib: Date;
  Isha: Date;
}

/**
 * Compute prayer times for a given date, latitude, longitude, timezone (hours)
 * and calculation method key.
 */
export function computePrayerTimes(params: {
  date: Date;
  lat: number;
  lng: number;
  timezone: number;
  method?: keyof typeof CALC_METHODS;
  asrFactor?: 1 | 2; // 1 = standard (Shafi'i), 2 = Hanafi
}): PrayerTimesResult {
  const { date, lat, lng, timezone } = params;
  const method = CALC_METHODS[params.method ?? "Kemenag"] ?? CALC_METHODS.Kemenag;
  const asrFactor = params.asrFactor ?? 1;

  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const jd = julian(year, month, day) - lng / (15 * 24);

  const [decl, _eqt] = sunPosition(jd);
  const noon = midDay(jd, lng, timezone);

  const times: Record<string, number> = {};
  // PrayTimes convention: pass POSITIVE twilight/refraction angles so that
  // -sin(angle) inside sunAngleTime == sin(-altitude) (altitude is negative, below horizon).
  // Asr passes a negative angle (-arccot) by design.
  times.Fajr = sunAngleTime(method.fajr, decl, lat, noon, -1);
  times.Sunrise = sunAngleTime(0.833, decl, lat, noon, -1);
  times.Dhuhr = noon;
  times.Asr = asrTime(asrFactor, decl, lat, noon);
  times.Maghrib = sunAngleTime(0.833, decl, lat, noon, 1);
  // Isha: if value > 1, treat as minutes after maghrib (Umm al-Qura style)
  times.Isha =
    method.isha > 1
      ? times.Maghrib + method.isha / 60
      : sunAngleTime(method.isha, decl, lat, noon, 1);

  const base = new Date(year, d.getMonth(), day);
  // h is the wall-clock hour in the *location* timezone. The true UTC instant is
  // Date.UTC(Y, M-1, D, H, M) - timezone*3600000, so the prayer Date is correct
  // regardless of the runtime process timezone (important in UTC sandboxes).
  const toDate = (h: number) => {
    const hours = Math.floor(h);
    const mins = Math.round((h - hours) * 60);
    return new Date(
      Date.UTC(year, d.getMonth(), day, hours, mins, 0) - timezone * 3600000
    );
  };

  return {
    date: base,
    Fajr: toDate(times.Fajr),
    Sunrise: toDate(times.Sunrise),
    Dhuhr: toDate(times.Dhuhr),
    Asr: toDate(times.Asr),
    Maghrib: toDate(times.Maghrib),
    Isha: toDate(times.Isha),
  };
}

/** Get the timezone offset (in hours) for a date in the local environment. */
export function localTimezoneHours(date = new Date()): number {
  return -date.getTimezoneOffset() / 60;
}

/**
 * Derive a timezone offset (in hours) from a longitude.
 * Rough but sufficient for prayer-time previews (no DST in Indonesia).
 * Jakarta (lng ~107) -> +7.
 */
export function getLocationTimezoneHours(lng: number | null | undefined): number {
  if (lng == null) return 7;
  return Math.round(lng / 15);
}

/** Format a Date instant as a wall-clock time in a given timezone offset (hours). */
export function formatTimeInZone(date: Date, tzHours: number): string {
  const shifted = new Date(date.getTime() + tzHours * 3600000);
  return shifted.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
}

/** Get the wall-clock hour (0..23) of `now` in a given timezone offset (hours). */
export function getLocationHour(now: Date, tzHours: number): number {
  return new Date(now.getTime() + tzHours * 3600000).getUTCHours();
}

/* ---------------- Next prayer ---------------- */

export interface NextPrayerInfo {
  name: PrayerName;
  time: Date;
  isToday: boolean;
  msRemaining: number;
}

/** Returns the next obligatory prayer and the ms remaining until it. */
export function getNextPrayer(
  times: PrayerTimesResult,
  now = new Date()
): NextPrayerInfo {
  const order: PrayerName[] = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
  for (const name of order) {
    const t = times[name];
    if (t.getTime() > now.getTime()) {
      return {
        name,
        time: t,
        isToday: true,
        msRemaining: t.getTime() - now.getTime(),
      };
    }
  }
  // next is tomorrow's Fajr
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowTimes = computePrayerTimes({
    date: tomorrow,
    lat: 0,
    lng: 0,
    timezone: localTimezoneHours(tomorrow),
    method: "Kemenag",
  });
  // recompute with same coords as `times` if available — fallback handled by caller
  return {
    name: "Fajr",
    time: tomorrowTimes.Fajr,
    isToday: false,
    msRemaining: tomorrowTimes.Fajr.getTime() - now.getTime(),
  };
}

/** Format ms remaining as "5h 12m" or "12m 03s". */
export function formatCountdown(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/* ---------------- Hijri date ---------------- */

const HIJRI_MONTHS = [
  "Muharram",
  "Safar",
  "Rabi' al-Awwal",
  "Rabi' al-Thani",
  "Jumada al-Awwal",
  "Jumada al-Thani",
  "Rajab",
  "Sha'ban",
  "Ramadan",
  "Shawwal",
  "Dhu al-Qi'dah",
  "Dhu al-Hijjah",
];

const HIJRI_DAYS = [
  "Al-Ahad",
  "Al-Ithnayn",
  "Ath-Thulatha",
  "Al-Arba'a",
  "Al-Khamis",
  "Al-Jumu'ah",
  "As-Sabt",
];

export interface HijriDate {
  day: number;
  month: number; // 1..12
  monthName: string;
  year: number;
  weekday: string;
  formatted: string; // "15 Ramadan 1446"
  formattedLong: string; // "Saturday, 15 Ramadan 1446 AH"
}

/** Returns Hijri date for a given Gregorian date using Intl Umm al-Qura calendar. */
export function getHijriDate(date = new Date()): HijriDate {
  try {
    const fmt = new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    });
    const parts = fmt.formatToParts(date);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    const day = parseInt(get("day"), 10);
    const month = parseInt(get("month"), 10);
    const year = parseInt(get("year"), 10);
    const monthName = HIJRI_MONTHS[month - 1] ?? "";
    const weekday = HIJRI_DAYS[date.getDay()] ?? "";
    return {
      day,
      month,
      monthName,
      year,
      weekday,
      formatted: `${day} ${monthName} ${year}`,
      formattedLong: `${weekday}, ${day} ${monthName} ${year} AH`,
    };
  } catch {
    // Fallback rough conversion
    const jd =
      Math.floor((date.getTime() - Date.UTC(1970, 0, 1)) / 86400000) + 2440588;
    const l = jd - 1948440 + 10632;
    const n = Math.floor((l - 1) / 10631);
    const l2 = l - 10631 * n + 354;
    const j =
      Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
      Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
    const l3 =
      l2 -
      Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
      Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
      29;
    const month = Math.floor((24 * l3) / 709);
    const day = l3 - Math.floor((709 * month) / 24);
    const year = 30 * n + j - 30;
    const monthName = HIJRI_MONTHS[month - 1] ?? "";
    const weekday = HIJRI_DAYS[date.getDay()] ?? "";
    return {
      day,
      month,
      monthName,
      year,
      weekday,
      formatted: `${day} ${monthName} ${year}`,
      formattedLong: `${weekday}, ${day} ${monthName} ${year} AH`,
    };
  }
}

export function getGregorianDate(date = new Date()) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/* ---------------- Islamic content ---------------- */

export const DAILY_MOTIVATIONS: string[] = [
  "Every morning is a new chance to draw closer to Allah.",
  "The best of deeds are those done consistently, even if small.",
  "Start your day with Bismillah and watch the barakah unfold.",
  "Whoever relies on Allah — He is sufficient for them.",
  "Verily, with hardship comes ease.",
  "The most beloved of actions to Allah are those done with excellence.",
  "Be in this world as a stranger or a traveler passing through.",
  "A moment of patience in hardship prevents a lifetime of regret.",
  "Purify your intention, and Allah will bless your effort.",
  "Remember Allah in prosperity, He will remember you in hardship.",
];

export function getDailyMotivation(date = new Date()): string {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return DAILY_MOTIVATIONS[dayOfYear % DAILY_MOTIVATIONS.length];
}

export interface QuranVerse {
  arabic: string;
  translation: string;
  reference: string;
  surah: string;
  ayah: number;
}

export const VERSES_OF_THE_DAY: QuranVerse[] = [
  { arabic: "إِنَّ مَعَ ٱلْعُسْرِ يُسْرًۭا", translation: "Indeed, with hardship comes ease.", reference: "Ash-Sharh 94:6", surah: "Ash-Sharh", ayah: 6 },
  { arabic: "فَٱذْكُرُونِىٓ أَذْكُرْكُمْ", translation: "So remember Me; I will remember you.", reference: "Al-Baqarah 2:152", surah: "Al-Baqarah", ayah: 152 },
  { arabic: "وَمَن يَتَّقِ ٱللَّهَ يَجْعَل لَّهُۥ مَخْرَجًۭا", translation: "And whoever fears Allah — He will make for him a way out.", reference: "At-Talaq 65:2", surah: "At-Talaq", ayah: 2 },
  { arabic: "إِنَّ ٱللَّهَ مَعَ ٱلصَّٰبِرِينَ", translation: "Indeed, Allah is with the patient.", reference: "Al-Baqarah 2:153", surah: "Al-Baqarah", ayah: 153 },
  { arabic: "وَقُل رَّبِّ زِدْنِى عِلْمًۭا", translation: "And say: My Lord, increase me in knowledge.", reference: "Ta-Ha 20:114", surah: "Ta-Ha", ayah: 114 },
  { arabic: "ٱلْحَمْدُ لِلَّٰهِ رَبِّ ٱلْعَٰلَمِينَ", translation: "All praise is for Allah, Lord of the worlds.", reference: "Al-Fatihah 1:2", surah: "Al-Fatihah", ayah: 2 },
  { arabic: "وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ", translation: "And He is with you wherever you are.", reference: "Al-Hadid 57:4", surah: "Al-Hadid", ayah: 4 },
  { arabic: "نَّصْرُ ٱللَّهِ وَفَتْحٌۭ قَرِيبٌ", translation: "The victory of Allah and a conquest near at hand.", reference: "As-Saff 61:13", surah: "As-Saff", ayah: 13 },
  { arabic: "وَبَشِّرِ ٱلصَّٰبِرِينَ", translation: "And give good tidings to the patient.", reference: "Al-Baqarah 2:155", surah: "Al-Baqarah", ayah: 155 },
  { arabic: "رَّبِّ ٱرْحَمْهُمَا كَمَا رَبَّيَانِى صَغِيرًۭا", translation: "My Lord, have mercy upon them as they brought me up when small.", reference: "Al-Isra 17:24", surah: "Al-Isra", ayah: 24 },
  { arabic: "وَأَقِمِ ٱلصَّلَوٰةَ لِذِكْرِىٓ", translation: "And establish prayer for My remembrance.", reference: "Ta-Ha 20:14", surah: "Ta-Ha", ayah: 14 },
  { arabic: "إِنَّ ٱللَّهَ يُحِبُّ ٱلْمُتَوَٰكِّلِينَ", translation: "Indeed, Allah loves those who rely on Him.", reference: "Aal-E-Imran 3:159", surah: "Aal-E-Imran", ayah: 159 },
];

export function getVerseOfTheDay(date = new Date()): QuranVerse {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  return VERSES_OF_THE_DAY[dayOfYear % VERSES_OF_THE_DAY.length];
}

/* ---------------- 99 Names of Allah (Asma'ul Husna) ---------------- */

export interface JournalPrompt {
  category: "gratitude" | "reflection" | "lessons" | "dua";
  text: string;
}

export const JOURNAL_PROMPTS: JournalPrompt[] = [
  { category: "gratitude", text: "Name three blessings Allah gave you today, big or small." },
  { category: "gratitude", text: "Who in your life are you most grateful for right now, and why?" },
  { category: "gratitude", text: "What is one thing your body allowed you to do today that you're thankful for?" },
  { category: "gratitude", text: "Recall a difficulty that turned into a blessing. What did you learn?" },
  { category: "reflection", text: "How did you draw closer to Allah today?" },
  { category: "reflection", text: "What habit is holding you back, and what would replacing it look like?" },
  { category: "reflection", text: "When did you feel most at peace today, and what caused it?" },
  { category: "reflection", text: "How did you treat the people around you today?" },
  { category: "reflection", text: "What consumed most of your time and attention today? Was it worthy?" },
  { category: "lessons", text: "What is one small lesson today taught you?" },
  { category: "lessons", text: "If today repeated tomorrow, what would you do differently?" },
  { category: "lessons", text: "What did you procrastinate on, and what's the first step to fix it?" },
  { category: "lessons", text: "Whose advice did you ignore today that you should reconsider?" },
  { category: "dua", text: "What are you secretly asking Allah for in this season of your life?" },
  { category: "dua", text: "Write a dua for someone who is struggling right now." },
  { category: "dua", text: "What do you need strength or patience for tomorrow?" },
  { category: "dua", text: "Ask Allah to purify your intention in one specific area." },
];

/** Returns a deterministic prompt for each category based on day-of-year. */
export function getDailyPrompts(date = new Date()): Record<JournalPrompt["category"], JournalPrompt> {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / 86400000);
  const categories: JournalPrompt["category"][] = ["gratitude", "reflection", "lessons", "dua"];
  const result = {} as Record<JournalPrompt["category"], JournalPrompt>;
  for (const cat of categories) {
    const pool = JOURNAL_PROMPTS.filter((p) => p.category === cat);
    result[cat] = pool[(dayOfYear + cat.length) % pool.length];
  }
  return result;
}

/* ---------------- Achievements / Badges ---------------- */

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // lucide icon name
  category: "prayer" | "quran" | "dhikr" | "habit" | "journal" | "streak" | "special";
  tier: "bronze" | "silver" | "gold" | "platinum";
  goal: number; // numeric target
  unit: string; // e.g. "days", "pages", "count"
}

export const ACHIEVEMENTS: Achievement[] = [
  // Prayer
  { id: "first-prayer", title: "First Step", description: "Complete your first prayer", icon: "Sparkles", category: "prayer", tier: "bronze", goal: 1, unit: "prayer" },
  { id: "prayer-7", title: "Week of Devotion", description: "Pray consistently for 7 days", icon: "Flame", category: "prayer", tier: "silver", goal: 7, unit: "days" },
  { id: "prayer-30", title: "Steady Worshipper", description: "Pray consistently for 30 days", icon: "Award", category: "prayer", tier: "gold", goal: 30, unit: "days" },
  { id: "prayer-100", title: "Pillar of Light", description: "Pray consistently for 100 days", icon: "Crown", category: "prayer", tier: "platinum", goal: 100, unit: "days" },
  // Quran
  { id: "quran-first", title: "Opening the Book", description: "Read your first page of Quran", icon: "BookOpen", category: "quran", tier: "bronze", goal: 1, unit: "page" },
  { id: "quran-60", title: "Khatm in Progress", description: "Read 60 pages (1 juz)", icon: "BookMarked", category: "quran", tier: "silver", goal: 60, unit: "pages" },
  { id: "quran-300", title: "Halfway There", description: "Read 300 pages", icon: "Library", category: "quran", tier: "gold", goal: 300, unit: "pages" },
  { id: "quran-604", title: "Khatm Complete", description: "Finish the entire Quran (604 pages)", icon: "Crown", category: "quran", tier: "platinum", goal: 604, unit: "pages" },
  // Dhikr
  { id: "dhikr-100", title: "Tongue of Remembrance", description: "Recite 100 dhikr counts", icon: "Disc", category: "dhikr", tier: "bronze", goal: 100, unit: "counts" },
  { id: "dhikr-1000", title: "Thousand Lights", description: "Recite 1,000 dhikr counts", icon: "Sparkles", category: "dhikr", tier: "silver", goal: 1000, unit: "counts" },
  { id: "dhikr-10000", title: "Ocean of Dhikr", description: "Recite 10,000 dhikr counts", icon: "Infinity", category: "dhikr", tier: "gold", goal: 10000, unit: "counts" },
  // Habits
  { id: "habit-7", title: "Building Momentum", description: "Complete any habit 7 times", icon: "Repeat", category: "habit", tier: "bronze", goal: 7, unit: "check-ins" },
  { id: "habit-30", title: "Habit Forged", description: "Complete any habit 30 times", icon: "Trophy", category: "habit", tier: "silver", goal: 30, unit: "check-ins" },
  { id: "habit-100", title: "Identity Shift", description: "Complete any habit 100 times", icon: "Crown", category: "habit", tier: "gold", goal: 100, unit: "check-ins" },
  // Journal
  { id: "journal-7", title: "Reflective Soul", description: "Write 7 journal entries", icon: "PenLine", category: "journal", tier: "bronze", goal: 7, unit: "entries" },
  { id: "journal-30", title: "Keeper of Memories", description: "Write 30 journal entries", icon: "BookMarked", category: "journal", tier: "silver", goal: 30, unit: "entries" },
  // Streak / special
  { id: "perfect-day", title: "Perfect Day", description: "Reach 100% completion in a single day", icon: "Star", category: "streak", tier: "gold", goal: 1, unit: "day" },
  { id: "perfect-week", title: "Perfect Week", description: "Reach 100% for 7 consecutive days", icon: "Trophy", category: "streak", tier: "platinum", goal: 7, unit: "days" },
  { id: "early-riser", title: "Early Riser", description: "Pray Fajr on time for 7 days", icon: "Sunrise", category: "special", tier: "silver", goal: 7, unit: "days" },
];

/** Tier color helpers (used in achievements view). */
export const TIER_STYLES: Record<Achievement["tier"], { ring: string; glow: string; label: string; text: string }> = {
  bronze: { ring: "from-amber-700/30 to-amber-500/20", glow: "shadow-[0_0_24px_-4px_rgba(180,83,9,0.4)]", label: "Bronze", text: "text-amber-700 dark:text-amber-400" },
  silver: { ring: "from-slate-400/30 to-slate-300/20", glow: "shadow-[0_0_24px_-4px_rgba(100,116,139,0.5)]", label: "Silver", text: "text-slate-500 dark:text-slate-300" },
  gold: { ring: "from-amber-500/30 to-yellow-400/20", glow: "shadow-[0_0_28px_-4px_rgba(234,179,8,0.5)]", label: "Gold", text: "text-amber-600 dark:text-amber-300" },
  platinum: { ring: "from-emerald-500/30 to-teal-300/20", glow: "shadow-[0_0_32px_-4px_rgba(16,185,129,0.55)]", label: "Platinum", text: "text-emerald-600 dark:text-emerald-300" },
};

export const SURAHS: { number: number; name: string; arabic: string; english: string; ayahs: number; tafsir?: string; theme?: string; revelation?: "meccan" | "medinan" }[] = [
  { number: 1, name: "Al-Fatihah", arabic: "الفاتحة", english: "The Opening", ayahs: 7, revelation: "meccan", theme: "Foundation of prayer",
    tafsir: "The essence of the Quran. Recited in every unit of prayer, it establishes the relationship between servant and Lord — praise, sovereignty, and the plea for guidance." },
  { number: 2, name: "Al-Baqarah", arabic: "البقرة", english: "The Cow", ayahs: 286, revelation: "medinan", theme: "Comprehensive guidance",
    tafsir: "The longest surah. Covers faith, law, stories of past nations, and the changing of the qibla. Contains Ayat al-Kursi (v.255) and the final verses of forgiveness." },
  { number: 3, name: "Aal-E-Imran", arabic: "آل عمران", english: "The Family of Imran", ayahs: 200, revelation: "medinan", theme: "Steadfastness",
    tafsir: "Revealed after the Battle of Uhud. Calls believers to hold firm to truth, contrasts the family of Imran (Maryam, Isa) with the path of Muhammad ﷺ." },
  { number: 4, name: "An-Nisa", arabic: "النساء", english: "The Women", ayahs: 176, revelation: "medinan", theme: "Justice & rights",
    tafsir: "Defends the rights of women, orphans, and the vulnerable. Establishes justice in family, inheritance, and society — a revolutionary framework for its time." },
  { number: 18, name: "Al-Kahf", arabic: "الكهف", english: "The Cave", ayahs: 110, revelation: "meccan", theme: "Trials of faith",
    tafsir: "Four stories — the Sleepers of the Cave, the owner of two gardens, Musa & Khidr, and Dhul-Qarnayn — illustrate trials of religion, wealth, knowledge, and power." },
  { number: 36, name: "Ya-Sin", arabic: "يس", english: "Ya Sin", ayahs: 83, revelation: "meccan", theme: "Resurrection",
    tafsir: "Called 'the heart of the Quran'. Vividly portrays the reality of resurrection, accountability, and the fate of those who reject the messengers." },
  { number: 55, name: "Ar-Rahman", arabic: "الرحمن", english: "The Beneficent", ayahs: 78, revelation: "medinan", theme: "Divine mercy",
    tafsir: "A poetic meditation on Allah's mercy — repeating 'So which of the favors of your Lord will you deny?' as it surveys creation, heaven, hell, and final judgment." },
  { number: 56, name: "Al-Waqi'ah", arabic: "الواقعة", english: "The Inevitable", ayahs: 96, revelation: "meccan", theme: "The Last Day",
    tafsir: "Describes the Day of Judgment and the three categories of souls: the foremost, the people of the right, and the people of the left. A reminder of life's ultimate destination." },
  { number: 67, name: "Al-Mulk", arabic: "الملك", english: "The Sovereignty", ayahs: 30, revelation: "meccan", theme: "Creation's purpose",
    tafsir: "A protector from the punishment of the grave. Reflects on the perfection of creation — death and life as a test, the heavens, birds, and the earth's sustenance." },
  { number: 78, name: "An-Naba", arabic: "النبأ", english: "The Tidings", ayahs: 40, revelation: "meccan", theme: "The Day of Decision",
    tafsir: "Opens Juz Amma. Asks 'About what are they asking?' — about the great news of the Resurrection, when Hell is brought close and each soul knows what it has sent ahead." },
  { number: 79, name: "An-Nazi'at", arabic: "النازعات", english: "Those Who Drag Forth", ayahs: 46, revelation: "meccan", theme: "Resurrection",
    tafsir: "Swears by the angels who extract the soul. Vivid imagery of the Day the Trumpet sounds — hearts pounding, eyes humbled — and the story of Musa confronting Fir'awn." },
  { number: 80, name: "Abasa", arabic: "عبس", english: "He Frowned", ayahs: 42, revelation: "meccan", theme: "Equality of seekers",
    tafsir: "A gentle correction of the Prophet ﷺ for turning from a blind seeker to address the wealthy. A lesson: the message is for every soul that desires guidance, regardless of status." },
  { number: 81, name: "At-Takwir", arabic: "التكوير", english: "The Overthrowing", ayahs: 29, revelation: "meccan", theme: "Cosmic upheaval",
    tafsir: "Paints the unraveling of the cosmos on the Last Day — the sun folded up, stars darkened, mountains moved, seas boiling. A summons to remember what one's soul has earned." },
  { number: 82, name: "Al-Infitar", arabic: "الإنفطار", english: "The Cleaving", ayahs: 19, revelation: "meccan", theme: "The sky split open",
    tafsir: "When the sky is cleft, stars scattered, seas burst forth — the Day of Reckoning. Warns the human soul against being diverted by worldly disputes from its Creator." },
  { number: 83, name: "Al-Mutaffifin", arabic: "المطففين", english: "The Defrauding", ayahs: 36, revelation: "meccan", theme: "Honest measure",
    tafsir: "Condemns those who give short measure in trade but demand full when they receive. Contrasts the record of the righteous (in 'Illiyun) with that of the wicked (in Sijjin)." },
  { number: 84, name: "Al-Inshiqaq", arabic: "الإنشقاق", english: "The Splitting Open", ayahs: 25, revelation: "meccan", theme: "The earth unfolded",
    tafsir: "The earth split open to yield its burdens, hearing its Lord's call. Souls meet their Lord — some given their record in the right hand, others from behind their backs." },
  { number: 85, name: "Al-Buruj", arabic: "البروج", english: "The Mansions of the Stars", ayahs: 22, revelation: "meccan", theme: "The martyrs of faith",
    tafsir: "Swears by the zodiac signs. Recalls the People of the Trench — believers burned alive for their faith — and warns that Allah's protection encompasses all who turn to Him." },
  { number: 86, name: "At-Tariq", arabic: "الطارق", english: "The Morning Star", ayahs: 17, revelation: "meccan", theme: "The soul's witness",
    tafsir: "Swears by the night-comer, the piercing star. Reminds that every soul has a guardian over it. From a drop emitted, Allah created the human — able to bring him back on the Day of Judgment." },
  { number: 87, name: "Al-A'la", arabic: "الأعلى", english: "The Most High", ayahs: 19, revelation: "meccan", theme: "Glorify your Lord",
    tafsir: "Glorify the name of your Lord, the Most High. He who created, proportioned, destined, and guided. The reminder takes root in the willing soul; the worldly life promises only the Hereafter." },
  { number: 88, name: "Al-Ghashiyah", arabic: "الغاشية", english: "The Overwhelming", ayahs: 26, revelation: "meccan", theme: "Faces on that Day",
    tafsir: "Contrasts the faces on the Day of Judgment: some humbled, weary, scorched by a boiling spring; others joyful, pleased with their striving, in a lofty Garden." },
  { number: 89, name: "Al-Fajr", arabic: "الفجر", english: "The Dawn", ayahs: 30, revelation: "meccan", theme: "Oaths by dawn",
    tafsir: "Swears by the dawn, the ten nights, the even and the odd. Recalls the destruction of 'Ad, Thamud, and Fir'awn — and the tranquil soul welcomed into Paradise." },
  { number: 90, name: "Al-Balad", arabic: "البلد", english: "The City", ayahs: 20, revelation: "meccan", theme: "The steep path",
    tafsir: "Swears by the city (Makkah). Did We not establish for him two eyes, a tongue, and guide him to the two highways? The steep path: freeing a slave, feeding the hungry, caring the orphan." },
  { number: 91, name: "Ash-Shams", arabic: "الشمس", english: "The Sun", ayahs: 15, revelation: "meccan", theme: "The soul & its inspiration",
    tafsir: "Swears by the sun, the moon, the day, the night, the sky, the earth, and the soul. He inspired it — its piety and its corruption. Successful is the one who purifies it; lost is the one who corrupts it." },
  { number: 92, name: "Al-Layl", arabic: "الليل", english: "The Night", ayahs: 21, revelation: "meccan", theme: "Two paths",
    tafsir: "Swears by the night and the day. Truly the paths diverge: the one who gives, is mindful, and believes in the good — We ease him to ease. The one who is stingy and denies — We ease him to hardship." },
  { number: 93, name: "Ad-Duha", arabic: "الضحى", english: "The Morning Hours", ayahs: 11, revelation: "meccan", theme: "Allah's care for His Prophet",
    tafsir: "A tender consolation to the Prophet ﷺ during a pause in revelation: 'Your Lord has not abandoned you, nor does He hate you.' The Hereafter is better than this world; He found you lost and guided you." },
  { number: 94, name: "Ash-Sharh", arabic: "الشرح", english: "The Relief", ayahs: 8, revelation: "meccan", theme: "Ease after hardship",
    tafsir: "Did We not expand your breast, remove your burden, and exalt your mention? With hardship comes ease — twice named for emphasis. When you are free, stand firm in worship." },
  { number: 95, name: "At-Tin", arabic: "التين", english: "The Fig", ayahs: 8, revelation: "meccan", theme: "The human design",
    tafsir: "Swears by the fig, the olive, Mount Sinai, and the secure city. We created the human in the best stature — then reduced him to the lowest when he rejected faith." },
  { number: 96, name: "Al-'Alaq", arabic: "العلق", english: "The Clot", ayahs: 19, revelation: "meccan", theme: "The first revelation",
    tafsir: "The first revelation: 'Read in the name of your Lord who created.' Created the human from a clinging clot. The Most Generous, who taught by the pen, taught the human what he did not know." },
  { number: 97, name: "Al-Qadr", arabic: "القدر", english: "The Night of Power", ayahs: 5, revelation: "meccan", theme: "Laylat al-Qadr",
    tafsir: "We revealed it on the Night of Power — better than a thousand months. The angels and the Spirit descend by their Lord's permission with every decree. Peace until the dawn." },
  { number: 98, name: "Al-Bayyinah", arabic: "البينة", english: "The Clear Proof", ayahs: 8, revelation: "medinan", theme: "The clear evidence",
    tafsir: "The People of the Book did not divide until the clear proof came — a messenger reciting pure pages. The best of creation is the one who believes, prays, gives charity, and fears Allah." },
  { number: 99, name: "Az-Zalzalah", arabic: "الزلزلة", english: "The Earthquake", ayahs: 8, revelation: "medinan", theme: "The earth's testimony",
    tafsir: "When the earth quakes with its final quake and casts out its burdens, the human cries 'What is wrong with it?' That Day it will recount its news — your Lord has inspired it." },
  { number: 100, name: "Al-'Adiyat", arabic: "العاديات", english: "The Courser", ayahs: 11, revelation: "meccan", theme: "The charging steeds",
    tafsir: "Swears by the snorting warhorses striking sparks, raiding at dawn. The human is ungrateful to his Lord — and a witness against himself in his love of wealth." },
  { number: 101, name: "Al-Qari'ah", arabic: "القارعة", english: "The Calamity", ayahs: 11, revelation: "meccan", theme: "The Striking Hour",
    tafsir: "What is the Striking Hour? Mountains like carded wool. Scales — whose balance is heavy, pleased; whose balance is light, abyss. A blazing Fire." },
  { number: 102, name: "At-Takathur", arabic: "التكاثر", english: "The Rivalry in World Increase", ayahs: 8, revelation: "meccan", theme: "Distraction of accumulation",
    tafsir: "Rivalry in worldly increase diverts you — until you visit the graves. No! You will know. Again, no! You will know. Were you to know with certainty, you would see the Hellfire." },
  { number: 103, name: "Al-'Asr", arabic: "العصر", english: "The Declining Day", ayahs: 3, revelation: "meccan", theme: "Time & loss",
    tafsir: "By time, humanity is in loss — except those who believe, do righteous deeds, enjoin truth, and enjoin patience. Imam Shafi'i said if people pondered only this surah, it would suffice them." },
  { number: 104, name: "Al-Humazah", arabic: "الهمزة", english: "The Traducer", ayahs: 9, revelation: "meccan", theme: "The fate of the slanderer",
    tafsir: "Woe to every backbiter, slanderer, who hoards wealth and counts it — thinking his wealth makes him immortal. No! He will be flung into the Crusher, kindled by Allah." },
  { number: 105, name: "Al-Fil", arabic: "الفيل", english: "The Elephant", ayahs: 5, revelation: "meccan", theme: "Allah defends His House",
    tafsir: "The Year of the Elephant — when Abraha marched on Makkah to destroy the Ka'bah with his war elephant. Allah sent flocks of birds pelting them with baked clay, leaving them like chewed straw." },
  { number: 106, name: "Quraysh", arabic: "قريش", english: "Quraysh", ayahs: 4, revelation: "meccan", theme: "Gratitude for security",
    tafsir: "For the familiarity of Quraysh — their winter and summer caravans. Let them worship the Lord of this House, who feeds them against hunger and gives them security against fear." },
  { number: 107, name: "Al-Ma'un", arabic: "الماعون", english: "The Small Kindnesses", ayahs: 7, revelation: "meccan", theme: "True worship requires care",
    tafsir: "Three signs of denial: neglecting the orphan, not feeding the poor, praying while heedless. True prayer is rooted in action — woe to those who refuse even small kindnesses." },
  { number: 108, name: "Al-Kawthar", arabic: "الكوثر", english: "The Abundance", ayahs: 3, revelation: "meccan", theme: "A river in Paradise",
    tafsir: "We granted you al-Kawthar — a river in Paradise. Pray and sacrifice. Your hater — he is the one cut off, without legacy." },
  { number: 109, name: "Al-Kafirun", arabic: "الكافرون", english: "The Disbelievers", ayahs: 6, revelation: "meccan", theme: "Religious freedom",
    tafsir: "A declaration of independence of worship: 'To you your religion, to me mine.' Neither worships what the other worships. Recited in the Sunnah after Fajr and Maghrib for protection." },
  { number: 110, name: "An-Nasr", arabic: "النصر", english: "The Divine Support", ayahs: 3, revelation: "medinan", theme: "Victory & farewell",
    tafsir: "One of the last revelations. When Allah's help and conquest come, and people enter the religion in multitudes — glorify your Lord and seek His forgiveness. He is the Accepter of repentance." },
  { number: 111, name: "Al-Masad", arabic: "المسد", english: "The Palm Fiber", ayahs: 5, revelation: "meccan", theme: "Abu Lahab's downfall",
    tafsir: "Perish the hands of Abu Lahab, the Prophet's uncle who opposed him fiercely. His wealth did not save him. His wife, a carrier of firewood, has a rope of palm fiber around her neck." },
  { number: 112, name: "Al-Ikhlas", arabic: "الإخلاص", english: "Sincerity", ayahs: 4, revelation: "meccan", theme: "Divine oneness",
    tafsir: "Equal to a third of the Quran. A pure declaration of tawhid — Allah is One, eternal, neither born nor bearing, and incomparable to anything." },
  { number: 113, name: "Al-Falaq", arabic: "الفلق", english: "The Daybreak", ayahs: 5, revelation: "meccan", theme: "Seeking refuge",
    tafsir: "A protective seeking of refuge from the evils of creation — darkness, enviers, those who practice secret harms, and the knots of harm." },
  { number: 114, name: "An-Nas", arabic: "الناس", english: "Mankind", ayahs: 6, revelation: "meccan", theme: "Seeking refuge",
    tafsir: "Paired with Al-Falaq. Seeks refuge in the Lord of mankind, the King, the God, from the whisperer who withdraws — both jinn and human." },
];

export function getSurah(n: number) {
  return SURAHS.find((s) => s.number === n);
}

/* Notable Islamic events for the current Hijri year (approximate). */
export const ISLAMIC_EVENTS: { month: number; day: number; name: string; type: string }[] = [
  { month: 1, day: 10, name: "Day of Ashura", type: "islamic" },
  { month: 3, day: 12, name: "Mawlid an-Nabi", type: "islamic" },
  { month: 7, day: 27, name: "Laylat al-Isra wal Mi'raj", type: "islamic" },
  { month: 8, day: 15, name: "Laylat al-Bara'at", type: "islamic" },
  { month: 9, day: 1, name: "First Day of Ramadan", type: "fasting" },
  { month: 9, day: 27, name: "Laylat al-Qadr (likely)", type: "islamic" },
  { month: 10, day: 1, name: "Eid al-Fitr", type: "islamic" },
  { month: 12, day: 9, name: "Day of Arafah", type: "fasting" },
  { month: 12, day: 10, name: "Eid al-Adha", type: "islamic" },
];

export function greetingByHour(date = new Date(), tzHours?: number): string {
  const h = tzHours != null ? getLocationHour(date, tzHours) : date.getHours();
  if (h < 5) return "Peaceful night";
  if (h < 12) return "Good morning";
  if (h < 15) return "Good afternoon";
  if (h < 18) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Peaceful night";
}

/* ---------------- Hadith of the Day ---------------- */

export interface Hadith {
  id: number;
  arabic: string;
  english: string;
  narrator: string;
  source: string;
  grade: string;
  theme: string;
}

export const HADITHS_OF_THE_DAY: Hadith[] = [
  {
    id: 1,
    arabic: "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى",
    english: "Actions are but by intentions, and every man shall have only that which he intended.",
    narrator: "Umar ibn al-Khattab",
    source: "Sahih al-Bukhari 1",
    grade: "Sahih",
    theme: "Intention",
  },
  {
    id: 2,
    arabic: "مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ",
    english: "Whoever believes in Allah and the Last Day, let him speak good or remain silent.",
    narrator: "Abu Hurayrah",
    source: "Sahih al-Bukhari 6018",
    grade: "Sahih",
    theme: "Speech",
  },
  {
    id: 3,
    arabic: "لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ",
    english: "None of you truly believes until he loves for his brother what he loves for himself.",
    narrator: "Anas ibn Malik",
    source: "Sahih al-Bukhari 13",
    grade: "Sahih",
    theme: "Brotherhood",
  },
  {
    id: 4,
    arabic: "الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ",
    english: "A Muslim is the one from whose tongue and hand the Muslims are safe.",
    narrator: "Abdullah ibn Amr",
    source: "Sahih al-Bukhari 10",
    grade: "Sahih",
    theme: "Character",
  },
  {
    id: 5,
    arabic: "الدِّينُ النَّصِيحَةُ",
    english: "Religion is sincere advice.",
    narrator: "Tamim al-Dari",
    source: "Sahih Muslim 55",
    grade: "Sahih",
    theme: "Sincerity",
  },
  {
    id: 6,
    arabic: "مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ",
    english: "Whoever takes a path in search of knowledge, Allah makes easy for him a path to Paradise.",
    narrator: "Abu Hurayrah",
    source: "Sahih Muslim 2699",
    grade: "Sahih",
    theme: "Knowledge",
  },
  {
    id: 7,
    arabic: "تَبَسُّمُكَ فِي وَجْهِ أَخِيكَ لَكَ صَدَقَةٌ",
    english: "Your smile to your brother is a charity.",
    narrator: "Abu Dharr",
    source: "Jami at-Tirmidhi 1956",
    grade: "Sahih",
    theme: "Kindness",
  },
  {
    id: 8,
    arabic: "مَا نَقَصَتْ صَدَقَةٌ مِنْ مَالٍ",
    english: "Charity does not decrease wealth.",
    narrator: "Abu Hurayrah",
    source: "Sahih Muslim 2588",
    grade: "Sahih",
    theme: "Charity",
  },
  {
    id: 9,
    arabic: "الطُّهُورُ شَطْرُ الإِيمَانِ",
    english: "Cleanliness is half of faith.",
    narrator: "Abu Malik al-Ash'ari",
    source: "Sahih Muslim 223",
    grade: "Sahih",
    theme: "Purity",
  },
  {
    id: 10,
    arabic: "مَنْ لَا يَرْحَمُ النَّاسَ لَا يَرْحَمُهُ اللَّهُ",
    english: "Whoever does not show mercy to people, Allah does not show mercy to him.",
    narrator: "Jarir ibn Abdullah",
    source: "Sahih al-Bukhari 7376",
    grade: "Sahih",
    theme: "Mercy",
  },
  {
    id: 11,
    arabic: "خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ",
    english: "The best of you are those who learn the Quran and teach it.",
    narrator: "Uthman ibn Affan",
    source: "Sahih al-Bukhari 5027",
    grade: "Sahih",
    theme: "Quran",
  },
  {
    id: 12,
    arabic: "الصَّلاةُ نُورٌ",
    english: "Prayer is light.",
    narrator: "Abu Malik al-Ash'ari",
    source: "Sahih Muslim 223",
    grade: "Sahih",
    theme: "Prayer",
  },
  {
    id: 13,
    arabic: "مَنْ قَامَ رَمَضَانَ إِيمَانًا وَاحْتِسَابًا غُفِرَ لَهُ مَا تَقَدَّمَ مِنْ ذَنْبِهِ",
    english: "Whoever stands (in prayer) during Ramadan out of faith and seeking reward, his previous sins are forgiven.",
    narrator: "Abu Hurayrah",
    source: "Sahih al-Bukhari 37",
    grade: "Sahih",
    theme: "Ramadan",
  },
  {
    id: 14,
    arabic: "تَرْكُ الْمَرْءِ مَا لَا يَعْنِيهِ عَلامَةُ إِسْلَامِهِ",
    english: "A sign of one's good Islam is leaving aside what does not concern him.",
    narrator: "Abu Hurayrah",
    source: "Jami at-Tirmidhi 2317",
    grade: "Hasan",
    theme: "Discipline",
  },
  {
    id: 15,
    arabic: "احْرِصْ عَلَى مَا يَنْفَعُكَ وَاسْتَعِنْ بِاللَّهِ وَلَا تَعْجِزْ",
    english: "Strive for that which benefits you, seek the help of Allah, and do not feel helpless.",
    narrator: "Abu Hurayrah",
    source: "Sahih Muslim 2664",
    grade: "Sahih",
    theme: "Striving",
  },
];

export function getHadithOfTheDay(date = new Date()): Hadith {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  return HADITHS_OF_THE_DAY[dayOfYear % HADITHS_OF_THE_DAY.length];
}

/* ---------------- Sunnah Fasts ---------------- */

export interface QuranReciter {
  id: string;
  name: string;
  arabic: string;
  style: string;
}

export const QURAN_RECITERS: QuranReciter[] = [
  { id: "ar.alafasy", name: "Mishary Rashid Alafasy", arabic: "مشاري راشد العفاسي", style: "Modern · Kuwait" },
  { id: "ar.abdulbasitmurattal", name: "Abdul Basit (Murattal)", arabic: "عبد الباسط عبد الصمد", style: "Egyptian · Murattal" },
  { id: "ar.abdurrahmaansudais", name: "Abdur Rahman As-Sudais", arabic: "عبد الرحمن السديس", style: "Imam of Makkah" },
  { id: "ar.shaatree", name: "Abu Bakr Ash-Shaatree", arabic: "أبو بكر الشاطري", style: "Saudi · Yemeni style" },
  { id: "ar.husary", name: "Mahmoud Khalil Al-Husary", arabic: "محمود خليل الحصري", style: "Egyptian · Tajweed expert" },
  { id: "ar.minshawi", name: "Mohamed Siddiq El-Minshawi", arabic: "محمد صديق المنشاوي", style: "Egyptian · Murattal" },
  { id: "ar.muhammadayyoub", name: "Muhammad Ayyoub", arabic: "محمد أيوب", style: "Imam of Madinah" },
  { id: "ar.muhammadjibreel", name: "Muhammad Jibreel", arabic: "محمد جبريل", style: "Egyptian · Mujawwad" },
];

/** Build an Islamic Network CDN URL for an entire surah audio. */
export function surahAudioUrl(reciterId: string, surahNumber: number): string {
  const padded = String(surahNumber).padStart(3, "0");
  return `https://cdn.islamic.network/quran/audio-surah/128/${reciterId}/${padded}.mp3`;
}

/* ---------------- Scholar Quotes of the Day ---------------- */

export interface ScholarQuote {
  id: number;
  text: string;
  author: string;
  era: string;
  context?: string;
}

export const SCHOLAR_QUOTES: ScholarQuote[] = [
  {
    id: 1,
    text: "The wise person is the one who holds himself accountable and works for what comes after death.",
    author: "Umar ibn al-Khattab",
    era: "7th century",
    context: "Second Caliph",
  },
  {
    id: 2,
    text: "Knowledge is not what is memorized; knowledge is what benefits.",
    author: "Imam al-Shafi'i",
    era: "767–820 CE",
    context: "Founder of Shafi'i school",
  },
  {
    id: 3,
    text: "Whoever does not reflect on the magnificence of his Lord will end up underestimating His commands.",
    author: "Ibn al-Qayyim",
    era: "1292–1350 CE",
  },
  {
    id: 4,
    text: "The highest stage of knowledge is to say 'I do not know' when you do not know.",
    author: "Imam Malik ibn Anas",
    era: "711–795 CE",
  },
  {
    id: 5,
    text: "Sincerity is the secret between Allah and the servant, which even the angels do not write.",
    author: "Al-Fudayl ibn Iyad",
    era: "8th century",
  },
  {
    id: 6,
    text: "Patience is of two halves: half is faith, and half is patience.",
    author: "Hasan al-Basri",
    era: "642–728 CE",
  },
  {
    id: 7,
    text: "The perfection of one's Islam is leaving alone that which does not concern him.",
    author: "Imam al-Ghazali",
    era: "1058–1111 CE",
  },
  {
    id: 8,
    text: "He who knows himself knows his Lord.",
    author: "Attributed to early Sufis",
    era: "Classical",
  },
  {
    id: 9,
    text: "Do not look at the smallness of the sin, but look at the greatness of the One you are disobeying.",
    author: "Ibn Abbas",
    era: "7th century",
    context: "Companion & Qur'anic exegete",
  },
  {
    id: 10,
    text: "Knowledge enlivens the heart, dispels hunger, and arms the body against solitude.",
    author: "Imam al-Shafi'i",
    era: "767–820 CE",
  },
  {
    id: 11,
    text: "Beware of the minor sins — they are like a people who stopped in a valley and each brought a stick until they had enough to bake their bread.",
    author: "Aisha bint Abi Bakr",
    era: "7th century",
  },
  {
    id: 12,
    text: "Whoever would be pleased to be the most honorable of people, let him fear Allah.",
    author: "Abdullah ibn Mas'ud",
    era: "7th century",
  },
];

export function getScholarQuoteOfTheDay(date = new Date()): ScholarQuote {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  // Offset from hadith so they rotate independently
  return SCHOLAR_QUOTES[(dayOfYear + 5) % SCHOLAR_QUOTES.length];
}

/* ------------------------------------------------------------------ */
/* Habit Categories                                                    */
/* ------------------------------------------------------------------ */

export const HABIT_CATEGORIES = [
  { id: "worship", label: "Worship", icon: "Heart", color: "emerald" },
  { id: "health", label: "Health", icon: "Activity", color: "rose" },
  { id: "knowledge", label: "Knowledge", icon: "BookOpen", color: "amber" },
  { id: "social", label: "Social", icon: "Users", color: "teal" },
  { id: "general", label: "General", icon: "Circle", color: "slate" },
] as const;

export type HabitCategoryId = (typeof HABIT_CATEGORIES)[number]["id"];

export function getHabitCategoryStyle(id: string) {
  const map: Record<string, { bg: string; text: string }> = {
    worship: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
    health: { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400" },
    knowledge: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
    social: { bg: "bg-teal-500/10", text: "text-teal-600 dark:text-teal-400" },
    general: { bg: "bg-slate-500/10", text: "text-slate-600 dark:text-slate-400" },
  };
  return map[id] ?? map.general;
}

/* ------------------------------------------------------------------ */
/* Focus / Pomodoro configuration                                      */
/* ------------------------------------------------------------------ */

export interface FocusMode {
  id: "deep" | "study" | "quran" | "reading";
  label: string;
  arabic: string;
  description: string;
  icon: string;
  accent: string; // tailwind text color
  bg: string;     // tailwind bg color
}

export const FOCUS_MODES: FocusMode[] = [
  { id: "deep",     label: "Deep Work",     arabic: "عَمَل",   description: "Distraction-free focused work on a single hard task.", icon: "Brain",      accent: "text-primary",    bg: "bg-primary/10" },
  { id: "study",    label: "Study",         arabic: "عِلْم",   description: "Learning, reading, or taking notes.",                  icon: "GraduationCap", accent: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
  { id: "quran",    label: "Quran Time",    arabic: "قُرْآن",  description: "Recite, read translation, or memorize.",               icon: "BookOpen",    accent: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  { id: "reading",  label: "Reading",       arabic: "قِرَاءَة", description: "Reflective reading of beneficial books.",              icon: "Library",     accent: "text-rose-600 dark:text-rose-400",   bg: "bg-rose-500/10" },
];

export interface FocusBreak {
  id: "dhikr" | "stretch" | "water" | "walk" | "none";
  label: string;
  description: string;
  icon: string;
  durationSec: number;
  prompt?: string; // suggestion shown during the break
}

export const FOCUS_BREAKS: FocusBreak[] = [
  { id: "dhikr",   label: "Dhikr",   description: "33× Subhanallah, Alhamdulillah, Allahu Akbar", icon: "Disc",      durationSec: 180, prompt: "Take a moment to remember Allah. Reset your heart." },
  { id: "stretch", label: "Stretch", description: "Stand, stretch, roll shoulders",                icon: "Activity",  durationSec: 120, prompt: "Stand up and stretch your body." },
  { id: "water",   label: "Water",   description: "Drink a glass of water mindfully",              icon: "Droplets",  durationSec: 90,  prompt: "Drink water slowly, in three breaths, as the Sunnah teaches." },
  { id: "walk",    label: "Walk",    description: "Short walk to refresh",                         icon: "Footprints",durationSec: 300, prompt: "Take a brief walk — refresh your body and mind." },
  { id: "none",    label: "None",    description: "Just a quick pause",                            icon: "Pause",     durationSec: 60,  prompt: "Breathe deeply. Pause." },
];

export interface FocusPreset {
  id: string;
  label: string;
  focusMin: number;
  breakMin: number;
  description: string;
}

export const FOCUS_PRESETS: FocusPreset[] = [
  { id: "classic",    label: "Classic Pomodoro", focusMin: 25, breakMin: 5,  description: "The original. 25 / 5 cycle." },
  { id: "deep",       label: "Deep Work",        focusMin: 50, breakMin: 10, description: "Long, uninterrupted focus." },
  { id: "short",      label: "Quick Sprint",     focusMin: 15, breakMin: 3,  description: "Short burst for small tasks." },
  { id: "quran",      label: "Quran Session",    focusMin: 30, breakMin: 5,  description: "Read + reflect on a surah." },
  { id: "study90",    label: "Study Block",      focusMin: 60, breakMin: 15, description: "For deep learning sessions." },
];

export const FOCUS_INTENTIONS = [
  "Reviewing Surah Al-Kahf translation",
  "Memorizing new ayahs",
  "Reading Tafsir Ibn Kathir",
  "Studying Arabic grammar",
  "Reflection journaling",
  "Working on a community project",
  "Reading a book on Islamic history",
  "Practicing tajweed rules",
  "Writing a dua for my family",
];

/* ------------------------------------------------------------------ */
/* Upcoming Islamic events helper                                      */
/* ------------------------------------------------------------------ */

export interface UpcomingIslamicEvent {
  hijriMonth: number;
  hijriDay: number;
  name: string;
  type: string;
  description: string;
  daysUntil: number; // approximate — based on remaining days in current Hijri month
}

/** Returns the next N upcoming Islamic events from today's Hijri date. */
export function getUpcomingIslamicEvents(count = 4): UpcomingIslamicEvent[] {
  const today = getHijriDate();
  if (!today) return [];
  const curMonth = today.month;
  const curDay = today.day;
  const events: UpcomingIslamicEvent[] = ISLAMIC_EVENTS.map((ev) => {
    // Compute approximate days-until: months-ahead * 29.53 + day delta
    let monthDiff = ev.month - curMonth;
    if (monthDiff < 0 || (monthDiff === 0 && ev.day < curDay)) monthDiff += 12;
    const dayDelta = ev.day - (monthDiff === 0 ? curDay : 0);
    const daysUntil = Math.round(monthDiff * 29.53 + Math.max(dayDelta, 0));
    return { ...ev, daysUntil };
  });
  return events.sort((a, b) => a.daysUntil - b.daysUntil).slice(0, count);
}

export function getIslamicEventDescription(name: string): string {
  const map: Record<string, string> = {
    "Day of Ashura": "10th Muharram — fasting expiates the sins of the previous year.",
    "Mawlid an-Nabi": "12th Rabi' al-Awwal — birth of the Prophet ﷺ.",
    "Laylat al-Isra wal Mi'raj": "27th Rajab — the night journey and ascension.",
    "Laylat al-Bara'at": "15th Sha'ban — night of forgiveness and decree.",
    "First Day of Ramadan": "The blessed month of fasting begins.",
    "Laylat al-Qadr (likely)": "27th Ramadan — better than a thousand months.",
    "Eid al-Fitr": "1st Shawwal — celebration after Ramadan.",
    "Day of Arafah": "9th Dhul-Hijjah — fasting expiates sins of the past and coming year.",
    "Eid al-Adha": "10th Dhul-Hijjah — the festival of sacrifice.",
  };
  return map[name] ?? "A blessed day on the Islamic calendar.";
}

/* =========================================================================
   QURAN HIFZ (MEMORIZATION) DATA — Full 114 surahs list with ayah counts.
   ========================================================================= */

export interface SurahInfo {
  number: number;
  name: string;
  arabic: string;
  english: string;
  ayahs: number;
  revelation: "meccan" | "medinan";
}

export const QURAN_SURAHS: SurahInfo[] = [
  { number: 1, name: "Al-Fatihah", arabic: "الفاتحة", english: "The Opening", ayahs: 7, revelation: "meccan" },
  { number: 2, name: "Al-Baqarah", arabic: "البقرة", english: "The Cow", ayahs: 286, revelation: "medinan" },
  { number: 3, name: "Aal-E-Imran", arabic: "آل عمران", english: "Family of Imran", ayahs: 200, revelation: "medinan" },
  { number: 4, name: "An-Nisa", arabic: "النساء", english: "The Women", ayahs: 176, revelation: "medinan" },
  { number: 5, name: "Al-Ma'idah", arabic: "المائدة", english: "The Table Spread", ayahs: 120, revelation: "medinan" },
  { number: 6, name: "Al-An'am", arabic: "الأنعام", english: "The Cattle", ayahs: 165, revelation: "meccan" },
  { number: 7, name: "Al-A'raf", arabic: "الأعراف", english: "The Heights", ayahs: 206, revelation: "meccan" },
  { number: 8, name: "Al-Anfal", arabic: "الأنفال", english: "The Spoils of War", ayahs: 75, revelation: "medinan" },
  { number: 9, name: "At-Tawbah", arabic: "التوبة", english: "The Repentance", ayahs: 129, revelation: "medinan" },
  { number: 10, name: "Yunus", arabic: "يونس", english: "Jonah", ayahs: 109, revelation: "meccan" },
  { number: 11, name: "Hud", arabic: "هود", english: "Hud", ayahs: 123, revelation: "meccan" },
  { number: 12, name: "Yusuf", arabic: "يوسف", english: "Joseph", ayahs: 111, revelation: "meccan" },
  { number: 13, name: "Ar-Ra'd", arabic: "الرعد", english: "The Thunder", ayahs: 43, revelation: "medinan" },
  { number: 14, name: "Ibrahim", arabic: "إبراهيم", english: "Abraham", ayahs: 52, revelation: "meccan" },
  { number: 15, name: "Al-Hijr", arabic: "الحجر", english: "The Rocky Tract", ayahs: 99, revelation: "meccan" },
  { number: 16, name: "An-Nahl", arabic: "النحل", english: "The Bee", ayahs: 128, revelation: "meccan" },
  { number: 17, name: "Al-Isra", arabic: "الإسراء", english: "The Night Journey", ayahs: 111, revelation: "meccan" },
  { number: 18, name: "Al-Kahf", arabic: "الكهف", english: "The Cave", ayahs: 110, revelation: "meccan" },
  { number: 19, name: "Maryam", arabic: "مريم", english: "Mary", ayahs: 98, revelation: "meccan" },
  { number: 20, name: "Ta-Ha", arabic: "طه", english: "Ta-Ha", ayahs: 135, revelation: "meccan" },
  { number: 21, name: "Al-Anbiya", arabic: "الأنبياء", english: "The Prophets", ayahs: 112, revelation: "meccan" },
  { number: 22, name: "Al-Hajj", arabic: "الحج", english: "The Pilgrimage", ayahs: 78, revelation: "medinan" },
  { number: 23, name: "Al-Mu'minun", arabic: "المؤمنون", english: "The Believers", ayahs: 118, revelation: "meccan" },
  { number: 24, name: "An-Nur", arabic: "النور", english: "The Light", ayahs: 64, revelation: "medinan" },
  { number: 25, name: "Al-Furqan", arabic: "الفرقان", english: "The Criterion", ayahs: 77, revelation: "meccan" },
  { number: 26, name: "Ash-Shu'ara", arabic: "الشعراء", english: "The Poets", ayahs: 227, revelation: "meccan" },
  { number: 27, name: "An-Naml", arabic: "النمل", english: "The Ant", ayahs: 93, revelation: "meccan" },
  { number: 28, name: "Al-Qasas", arabic: "القصص", english: "The Stories", ayahs: 88, revelation: "meccan" },
  { number: 29, name: "Al-Ankabut", arabic: "العنكبوت", english: "The Spider", ayahs: 69, revelation: "meccan" },
  { number: 30, name: "Ar-Rum", arabic: "الروم", english: "The Romans", ayahs: 60, revelation: "meccan" },
  { number: 31, name: "Luqman", arabic: "لقمان", english: "Luqman", ayahs: 34, revelation: "meccan" },
  { number: 32, name: "As-Sajdah", arabic: "السجدة", english: "The Prostration", ayahs: 30, revelation: "meccan" },
  { number: 33, name: "Al-Ahzab", arabic: "الأحزاب", english: "The Combined Forces", ayahs: 73, revelation: "medinan" },
  { number: 34, name: "Saba", arabic: "سبأ", english: "Sheba", ayahs: 54, revelation: "meccan" },
  { number: 35, name: "Fatir", arabic: "فاطر", english: "Originator", ayahs: 45, revelation: "meccan" },
  { number: 36, name: "Ya-Sin", arabic: "يس", english: "Ya Sin", ayahs: 83, revelation: "meccan" },
  { number: 37, name: "As-Saffat", arabic: "الصافات", english: "Those Who Set the Ranks", ayahs: 182, revelation: "meccan" },
  { number: 38, name: "Sad", arabic: "ص", english: "The Letter Sad", ayahs: 88, revelation: "meccan" },
  { number: 39, name: "Az-Zumar", arabic: "الزمر", english: "The Troops", ayahs: 75, revelation: "meccan" },
  { number: 40, name: "Ghafir", arabic: "غافر", english: "The Forgiver", ayahs: 85, revelation: "meccan" },
  { number: 41, name: "Fussilat", arabic: "فصلت", english: "Explained in Detail", ayahs: 54, revelation: "meccan" },
  { number: 42, name: "Ash-Shura", arabic: "الشورى", english: "The Consultation", ayahs: 53, revelation: "meccan" },
  { number: 43, name: "Az-Zukhruf", arabic: "الزخرف", english: "The Ornaments of Gold", ayahs: 89, revelation: "meccan" },
  { number: 44, name: "Ad-Dukhan", arabic: "الدخان", english: "The Smoke", ayahs: 59, revelation: "meccan" },
  { number: 45, name: "Al-Jathiyah", arabic: "الجاثية", english: "The Crouching", ayahs: 37, revelation: "meccan" },
  { number: 46, name: "Al-Ahqaf", arabic: "الأحقاف", english: "The Wind-Curved Sandhills", ayahs: 35, revelation: "meccan" },
  { number: 47, name: "Muhammad", arabic: "محمد", english: "Muhammad", ayahs: 38, revelation: "medinan" },
  { number: 48, name: "Al-Fath", arabic: "الفتح", english: "The Victory", ayahs: 29, revelation: "medinan" },
  { number: 49, name: "Al-Hujurat", arabic: "الحجرات", english: "The Rooms", ayahs: 18, revelation: "medinan" },
  { number: 50, name: "Qaf", arabic: "ق", english: "The Letter Qaf", ayahs: 45, revelation: "meccan" },
  { number: 51, name: "Adh-Dhariyat", arabic: "الذاريات", english: "The Winnowing Winds", ayahs: 60, revelation: "meccan" },
  { number: 52, name: "At-Tur", arabic: "الطور", english: "The Mount", ayahs: 49, revelation: "meccan" },
  { number: 53, name: "An-Najm", arabic: "النجم", english: "The Star", ayahs: 62, revelation: "meccan" },
  { number: 54, name: "Al-Qamar", arabic: "القمر", english: "The Moon", ayahs: 55, revelation: "meccan" },
  { number: 55, name: "Ar-Rahman", arabic: "الرحمن", english: "The Beneficent", ayahs: 78, revelation: "medinan" },
  { number: 56, name: "Al-Waqi'ah", arabic: "الواقعة", english: "The Inevitable", ayahs: 96, revelation: "meccan" },
  { number: 57, name: "Al-Hadid", arabic: "الحديد", english: "The Iron", ayahs: 29, revelation: "medinan" },
  { number: 58, name: "Al-Mujadila", arabic: "المجادلة", english: "The Pleading Woman", ayahs: 22, revelation: "medinan" },
  { number: 59, name: "Al-Hashr", arabic: "الحشر", english: "The Exile", ayahs: 24, revelation: "medinan" },
  { number: 60, name: "Al-Mumtahanah", arabic: "الممتحنة", english: "She That is to be Examined", ayahs: 13, revelation: "medinan" },
  { number: 61, name: "As-Saff", arabic: "الصف", english: "The Ranks", ayahs: 14, revelation: "medinan" },
  { number: 62, name: "Al-Jumu'ah", arabic: "الجمعة", english: "The Congregation, Friday", ayahs: 11, revelation: "medinan" },
  { number: 63, name: "Al-Munafiqun", arabic: "المنافقون", english: "The Hypocrites", ayahs: 11, revelation: "medinan" },
  { number: 64, name: "At-Taghabun", arabic: "التغابن", english: "The Mutual Disillusion", ayahs: 18, revelation: "medinan" },
  { number: 65, name: "At-Talaq", arabic: "الطلاق", english: "The Divorce", ayahs: 12, revelation: "medinan" },
  { number: 66, name: "At-Tahrim", arabic: "التحريم", english: "The Prohibition", ayahs: 12, revelation: "medinan" },
  { number: 67, name: "Al-Mulk", arabic: "الملك", english: "The Sovereignty", ayahs: 30, revelation: "meccan" },
  { number: 68, name: "Al-Qalam", arabic: "القلم", english: "The Pen", ayahs: 52, revelation: "meccan" },
  { number: 69, name: "Al-Haqqah", arabic: "الحاقة", english: "The Reality", ayahs: 52, revelation: "meccan" },
  { number: 70, name: "Al-Ma'arij", arabic: "المعارج", english: "The Ascending Stairways", ayahs: 44, revelation: "meccan" },
  { number: 71, name: "Nuh", arabic: "نوح", english: "Noah", ayahs: 28, revelation: "meccan" },
  { number: 72, name: "Al-Jinn", arabic: "الجن", english: "The Jinn", ayahs: 28, revelation: "meccan" },
  { number: 73, name: "Al-Muzzammil", arabic: "المزمل", english: "The Enshrouded One", ayahs: 20, revelation: "meccan" },
  { number: 74, name: "Al-Muddaththir", arabic: "المدثر", english: "The Cloaked One", ayahs: 56, revelation: "meccan" },
  { number: 75, name: "Al-Qiyamah", arabic: "القيامة", english: "The Resurrection", ayahs: 40, revelation: "meccan" },
  { number: 76, name: "Al-Insan", arabic: "الإنسان", english: "Man", ayahs: 31, revelation: "medinan" },
  { number: 77, name: "Al-Mursalat", arabic: "المرسلات", english: "The Emissaries", ayahs: 50, revelation: "meccan" },
  { number: 78, name: "An-Naba", arabic: "النبأ", english: "The Tidings", ayahs: 40, revelation: "meccan" },
  { number: 79, name: "An-Nazi'at", arabic: "النازعات", english: "Those Who Drag Forth", ayahs: 46, revelation: "meccan" },
  { number: 80, name: "Abasa", arabic: "عبس", english: "He Frowned", ayahs: 42, revelation: "meccan" },
  { number: 81, name: "At-Takwir", arabic: "التكوير", english: "The Overthrowing", ayahs: 29, revelation: "meccan" },
  { number: 82, name: "Al-Infitar", arabic: "الانفطار", english: "The Cleaving", ayahs: 19, revelation: "meccan" },
  { number: 83, name: "Al-Mutaffifin", arabic: "المطففين", english: "The Defrauding", ayahs: 36, revelation: "meccan" },
  { number: 84, name: "Al-Inshiqaq", arabic: "الانشقاق", english: "The Sundering", ayahs: 25, revelation: "meccan" },
  { number: 85, name: "Al-Buruj", arabic: "البروج", english: "The Mansions of the Stars", ayahs: 22, revelation: "meccan" },
  { number: 86, name: "At-Tariq", arabic: "الطارق", english: "The Morning Star", ayahs: 17, revelation: "meccan" },
  { number: 87, name: "Al-A'la", arabic: "الأعلى", english: "The Most High", ayahs: 19, revelation: "meccan" },
  { number: 88, name: "Al-Ghashiyah", arabic: "الغاشية", english: "The Overwhelming", ayahs: 26, revelation: "meccan" },
  { number: 89, name: "Al-Fajr", arabic: "الفجر", english: "The Dawn", ayahs: 30, revelation: "meccan" },
  { number: 90, name: "Al-Balad", arabic: "البلد", english: "The City", ayahs: 20, revelation: "meccan" },
  { number: 91, name: "Ash-Shams", arabic: "الشمس", english: "The Sun", ayahs: 15, revelation: "meccan" },
  { number: 92, name: "Al-Layl", arabic: "الليل", english: "The Night", ayahs: 21, revelation: "meccan" },
  { number: 93, name: "Ad-Duha", arabic: "الضحى", english: "The Morning Hours", ayahs: 11, revelation: "meccan" },
  { number: 94, name: "Ash-Sharh", arabic: "الشرح", english: "The Relief", ayahs: 8, revelation: "meccan" },
  { number: 95, name: "At-Tin", arabic: "التين", english: "The Fig", ayahs: 8, revelation: "meccan" },
  { number: 96, name: "Al-Alaq", arabic: "العلق", english: "The Clot", ayahs: 19, revelation: "meccan" },
  { number: 97, name: "Al-Qadr", arabic: "القدر", english: "The Power", ayahs: 5, revelation: "meccan" },
  { number: 98, name: "Al-Bayyinah", arabic: "البينة", english: "The Clear Proof", ayahs: 8, revelation: "medinan" },
  { number: 99, name: "Az-Zalzalah", arabic: "الزلزلة", english: "The Earthquake", ayahs: 8, revelation: "medinan" },
  { number: 100, name: "Al-Adiyat", arabic: "العاديات", english: "The Courser", ayahs: 11, revelation: "meccan" },
  { number: 101, name: "Al-Qari'ah", arabic: "القارعة", english: "The Calamity", ayahs: 11, revelation: "meccan" },
  { number: 102, name: "At-Takathur", arabic: "التكاثر", english: "The Rivalry in World Increase", ayahs: 8, revelation: "meccan" },
  { number: 103, name: "Al-Asr", arabic: "العصر", english: "The Declining Day", ayahs: 3, revelation: "meccan" },
  { number: 104, name: "Al-Humazah", arabic: "الهمزة", english: "The Traducer", ayahs: 9, revelation: "meccan" },
  { number: 105, name: "Al-Fil", arabic: "الفيل", english: "The Elephant", ayahs: 5, revelation: "meccan" },
  { number: 106, name: "Quraysh", arabic: "قريش", english: "Quraysh", ayahs: 4, revelation: "meccan" },
  { number: 107, name: "Al-Ma'un", arabic: "الماعون", english: "The Small Kindnesses", ayahs: 7, revelation: "meccan" },
  { number: 108, name: "Al-Kawthar", arabic: "الكوثر", english: "The Abundance", ayahs: 3, revelation: "meccan" },
  { number: 109, name: "Al-Kafirun", arabic: "الكافرون", english: "The Disbelievers", ayahs: 6, revelation: "meccan" },
  { number: 110, name: "An-Nasr", arabic: "النصر", english: "The Divine Support", ayahs: 3, revelation: "medinan" },
  { number: 111, name: "Al-Masad", arabic: "المسد", english: "The Palm Fiber", ayahs: 5, revelation: "meccan" },
  { number: 112, name: "Al-Ikhlas", arabic: "الإخلاص", english: "Sincerity", ayahs: 4, revelation: "meccan" },
  { number: 113, name: "Al-Falaq", arabic: "الفلق", english: "The Daybreak", ayahs: 5, revelation: "meccan" },
  { number: 114, name: "An-Nas", arabic: "الناس", english: "Mankind", ayahs: 6, revelation: "meccan" },
];

export const TOTAL_QURAN_AYAHS = QURAN_SURAHS.reduce((s, x) => s + x.ayahs, 0); // 6236

export type HifzStatus = "not_started" | "in_progress" | "memorized" | "needs_review";

export const HIFZ_STATUS_META: Record<HifzStatus, { label: string; color: string; bg: string; ring: string; dot: string; icon: string }> = {
  not_started: { label: "Not Started", color: "text-muted-foreground", bg: "bg-muted/50", ring: "ring-border", dot: "bg-muted-foreground/40", icon: "Circle" },
  in_progress: { label: "Memorizing", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", ring: "ring-amber-500/30", dot: "bg-amber-500", icon: "Loader" },
  memorized: { label: "Memorized", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", ring: "ring-emerald-500/30", dot: "bg-emerald-500", icon: "CheckCircle" },
  needs_review: { label: "Needs Review", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10", ring: "ring-rose-500/30", dot: "bg-rose-500", icon: "AlertCircle" },
};

/** Murajaah schedule: a memorized surah should be reviewed within 7 days, then every 30 days.
 *  Returns days until next review is due. Negative = overdue. */
export function daysUntilReview(lastReviewed: Date | null): number {
  if (!lastReviewed) return -1;
  const ms = Date.now() - lastReviewed.getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  return 30 - days; // review every 30 days
}
