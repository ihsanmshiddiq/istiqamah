import type { Row } from "./store";

// ---------- dates ----------
export function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function parseYmd(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(s: string, n: number) {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
}
export function daysBetween(a: string, b: string) {
  return Math.round((parseYmd(b).getTime() - parseYmd(a).getTime()) / 86400000);
}
export function last7Days(): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    out.push(ymd(d));
  }
  return out;
}
export function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
export function monthLabel(date: Date, lang: "id" | "en") {
  return date.toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
    month: "long",
    year: "numeric",
  });
}
export function shortDay(s: string, lang: "id" | "en") {
  return parseYmd(s).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { weekday: "short" });
}
export function niceDate(s: string, lang: "id" | "en") {
  return parseYmd(s).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ---------- currency ----------
export function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}
export function formatCompact(n: number) {
  return new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

// ---------- habits ----------
export const HABIT_SUGGESTIONS = [
  { key: "quran", name_id: "Baca Al-Qur'an", name_en: "Read Qur'an", icon: "BookOpen", color: "emerald" },
  { key: "dhikr", name_id: "Dzikir pagi & petang", name_en: "Morning & evening dhikr", icon: "Sparkles", color: "gold" },
  { key: "dhuha", name_id: "Sholat Dhuha", name_en: "Dhuha prayer", icon: "Sunrise", color: "amber" },
  { key: "sedekah", name_id: "Sedekah harian", name_en: "Daily charity", icon: "HandHeart", color: "rose" },
  { key: "water", name_id: "Minum air cukup", name_en: "Drink enough water", icon: "Droplets", color: "sky" },
  { key: "exercise", name_id: "Olahraga", name_en: "Exercise", icon: "Dumbbell", color: "teal" },
  { key: "sleep", name_id: "Tidur lebih awal", name_en: "Sleep early", icon: "Moon", color: "indigo" },
  { key: "read", name_id: "Membaca buku", name_en: "Read a book", icon: "Library", color: "amber" },
  { key: "istighfar", name_id: "Istighfar 100x", name_en: "Istighfar 100x", icon: "Heart", color: "rose" },
  { key: "family", name_id: "Waktu bersama keluarga", name_en: "Family time", icon: "Users", color: "teal" },
];

export const HABIT_COLORS: Record<string, { dot: string; soft: string; text: string }> = {
  emerald: { dot: "bg-emerald-500", soft: "bg-emerald-500/12", text: "text-emerald-600 dark:text-emerald-400" },
  gold: { dot: "bg-amber-400", soft: "bg-amber-400/12", text: "text-amber-600 dark:text-amber-400" },
  amber: { dot: "bg-amber-500", soft: "bg-amber-500/12", text: "text-amber-600 dark:text-amber-400" },
  rose: { dot: "bg-rose-400", soft: "bg-rose-400/12", text: "text-rose-500 dark:text-rose-300" },
  sky: { dot: "bg-sky-400", soft: "bg-sky-400/12", text: "text-sky-600 dark:text-sky-300" },
  teal: { dot: "bg-teal-500", soft: "bg-teal-500/12", text: "text-teal-600 dark:text-teal-300" },
  indigo: { dot: "bg-indigo-400", soft: "bg-indigo-400/12", text: "text-indigo-500 dark:text-indigo-300" },
};

/** Streak for a habit given its set of completed YYYY-MM-DD dates. */
export function habitStreak(doneDates: Set<string>): number {
  let streak = 0;
  const cursor = new Date();
  // allow today not done yet — start from today; if today missing, start yesterday
  if (!doneDates.has(ymd(cursor))) cursor.setDate(cursor.getDate() - 1);
  for (;;) {
    if (doneDates.has(ymd(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }
  return streak;
}

// ---------- prayers ----------
export const PRAYERS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
export type PrayerKey = (typeof PRAYERS)[number];

export const SUNNAH_PRAYERS = [
  { key: "tahajjud", name_id: "Tahajud", name_en: "Tahajjud" },
  { key: "witr", name_id: "Witir", name_en: "Witr" },
  { key: "dhuha", name_id: "Dhuha", name_en: "Dhuha" },
  { key: "rawatib_fajr", name_id: "Qobliyah Subuh", name_en: "Sunnah before Fajr" },
  { key: "rawatib_dhuhr", name_id: "Rawatib Dzuhur", name_en: "Rawatib Dhuhr" },
  { key: "rawatib_maghrib", name_id: "Ba'diyah Maghrib", name_en: "Sunnah after Maghrib" },
  { key: "rawatib_isha", name_id: "Ba'diyah Isya", name_en: "Sunnah after Isha" },
  { key: "tarawih", name_id: "Tarawih", name_en: "Tarawih" },
];

export function prayerStreak(logsByDate: Map<string, Row>): number {
  let streak = 0;
  const cursor = new Date();
  const complete = (r?: Row) =>
    !!r && PRAYERS.every((p) => Number(r[p] ?? 0) > 0);
  if (!complete(logsByDate.get(ymd(cursor)))) cursor.setDate(cursor.getDate() - 1);
  for (;;) {
    if (complete(logsByDate.get(ymd(cursor)))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }
  return streak;
}

// ---------- hifdz ----------
export const PAGES_PER_JUZ = 20;

/** Mushaf Rasm Utsmani: 604 halaman. Juz 1-29 = 20 hlm, Juz 30 = 24 hlm. */
export function juzStartPage(juz: number): number {
  return (juz - 1) * 20 + 1;
}
export function juzPageCount(juz: number): number {
  if (juz < 1 || juz > 30) return 20;
  return juz === 30 ? 24 : 20;
}
export function juzPages(juz: number): number[] {
  const start = juzStartPage(juz);
  const count = juzPageCount(juz);
  return Array.from({ length: count }, (_, i) => start + i);
}

export type PageStatus = "none" | "memorized" | "weak" | "mutqin";
export const PAGE_STATUS_ORDER: PageStatus[] = ["none", "memorized", "weak", "mutqin"];
export const PAGE_STATUS_META: Record<PageStatus, { label: string; color: string; bg: string; ring: string }> = {
  none:      { label: "Belum Dihafal",  color: "text-muted-foreground", bg: "bg-muted/40",  ring: "ring-muted-foreground/30" },
  memorized: { label: "Sudah Dihafal",  color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/15", ring: "ring-blue-500/40" },
  weak:      { label: "Belum Lancar",   color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/15", ring: "ring-rose-500/40" },
  mutqin:    { label: "Sudah Lancar/Mutqin", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/15", ring: "ring-emerald-500/40" },
};
export function cyclePageStatus(cur: PageStatus): PageStatus {
  const idx = PAGE_STATUS_ORDER.indexOf(cur);
  return PAGE_STATUS_ORDER[(idx + 1) % PAGE_STATUS_ORDER.length];
}

/** Parse JSON safely, returning fallback on error. */
export function parseJsonSafe<T>(val: unknown, fallback: T): T {
  if (typeof val !== "string") return fallback;
  try { return JSON.parse(val) as T; } catch { return fallback; }
}

// ---------- cycle ----------
export interface CyclePrediction {
  status: "period" | "clean";
  dayInPeriod?: number;
  nextStart?: string;
  daysUntilNext?: number;
}
export function predictCycle(
  logs: { startDate: string; endDate?: string | null }[],
  avgLength: number,
): CyclePrediction {
  const sorted = [...logs].sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  const latest = sorted[0];
  const todayStr = ymd(new Date());
  if (!latest) return { status: "clean" };

  const start = latest.startDate;
  const end = latest.endDate;
  if (start <= todayStr && (!end || end >= todayStr)) {
    return { status: "period", dayInPeriod: daysBetween(start, todayStr) + 1 };
  }
  const nextStart = addDays(start, avgLength);
  return {
    status: "clean",
    nextStart,
    daysUntilNext: daysBetween(todayStr, nextStart),
  };
}

export const CYCLE_SYMPTOMS = [
  { key: "cramps", id: "Kram", en: "Cramps" },
  { key: "headache", id: "Sakit kepala", en: "Headache" },
  { key: "fatigue", id: "Lelah", en: "Fatigue" },
  { key: "mood", id: "Perubahan mood", en: "Mood swings" },
  { key: "bloating", id: "Kembung", en: "Bloating" },
  { key: "backache", id: "Sakit punggung", en: "Backache" },
];

export const MOODS = [
  { key: "grateful", icon: "Sprout", id: "Bersyukur", en: "Grateful" },
  { key: "calm", icon: "Cloud", id: "Tenang", en: "Calm" },
  { key: "happy", icon: "Sun", id: "Bahagia", en: "Happy" },
  { key: "tired", icon: "Moon", id: "Lelah", en: "Tired" },
  { key: "sad", icon: "CloudRain", id: "Sedih", en: "Sad" },
  { key: "anxious", icon: "Wind", id: "Cemas", en: "Anxious" },
];

export const FINANCE_CATEGORIES = [
  { key: "food", id: "Makanan", en: "Food" },
  { key: "transport", id: "Transportasi", en: "Transport" },
  { key: "bills", id: "Tagihan", en: "Bills" },
  { key: "shopping", id: "Belanja", en: "Shopping" },
  { key: "sadaqah", id: "Sedekah/Infaq", en: "Charity" },
  { key: "health", id: "Kesehatan", en: "Health" },
  { key: "education", id: "Pendidikan", en: "Education" },
  { key: "salary", id: "Gaji", en: "Salary" },
  { key: "other", id: "Lainnya", en: "Other" },
];

export const VERSES = [
  {
    ar: "فَاذْكُرُونِي أَذْكُرْكُمْ",
    id: "Maka ingatlah kepada-Ku, Aku pun akan ingat kepadamu.",
    en: "So remember Me; I will remember you.",
    ref: "Al-Baqarah 2:152",
  },
  {
    ar: "إِنَّ مَعَ الْعُسْرِ يُسْرًا",
    id: "Sesungguhnya bersama kesulitan ada kemudahan.",
    en: "Indeed, with hardship comes ease.",
    ref: "Ash-Sharh 94:6",
  },
  {
    ar: "وَبَشِّرِ الصَّابِرِينَ",
    id: "Dan sampaikanlah kabar gembira kepada orang-orang yang sabar.",
    en: "And give good tidings to the patient.",
    ref: "Al-Baqarah 2:155",
  },
  {
    ar: "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ",
    id: "Cukuplah Allah bagi kami, dan Dia sebaik-baik pelindung.",
    en: "Allah is sufficient for us, and He is the best disposer of affairs.",
    ref: "Ali 'Imran 3:173",
  },
];

export function verseOfDay() {
  const day = Math.floor(Date.now() / 86400000);
  return VERSES[day % VERSES.length];
}
