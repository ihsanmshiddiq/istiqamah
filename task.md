# Istiqamah — UPGRADE (Hayat blueprint)

Goal: upgrade existing Istiqamah into full Muslim LifeOS, mirroring Hayat's features/design,
minus cut features. Runable stack only (Bun/Vite/React/Hono/Drizzle/oRPC). Refs are read-only.

## Cut features (do NOT build): Qibla, Dhikr/tasbih, Asma'ul Husna, Sunnah Fasts, Sadaqah, Zakat

## Final pages
Overview: Dashboard, Calendar, Daily Journal, Habits
Worship: Quran (reader), Khatma, Hifz, Salah, Duas
System: Notes, Goals, Focus, Achievements, Analytics, Settings
Istiqamah extras: Finance, Cycle

## Existing tables (keep)
userProfile, habits, habitLogs, prayerLogs, hifdzSettings, hifdzLogs, murajaah,
transactions, budgets, savingsGoals, cycleLogs, notes, journalEntries

## NEW tables to add (schema.ts + sync.ts COLLECTION_TABLES + store.ts COLLECTIONS, bump DB_VERSION)
- calendarEvents (title, date, time, type, note)
- khatmaPlans (name, scope, startPage, endPage, totalPages, startDate, targetDays, dailyTarget, completedPages, isActive, completedAt)
- quranLogs (date, pagesRead, ayahsRead, lastSurah, lastAyah, targetPages, minutesSpent) — daily reading log (unique per day)
- quranBookmarks (surah, ayah, note) — reader bookmarks
- duaFavorites (duaId)
- goals (title, category, progress, targetDate, milestone, done)
- focusSessions (startedAt, durationSec, elapsedSec, mode, intention, completed)
- achievements singleton or table: unlocked (json array of ids) — SINGLETON via userProfile.achievements json OR table. Use table achievementsUnlocked (achievementId, unlockedAt)

## Content libs to port (trim cut features)
- lib/islamic.ts -> surah list, Hijri date calc, prayer times, achievements defs, journal prompts, islamic events. DROP: ASMA_UL_HUSNA, dhikr sets, qibla calc.
- lib/duas.ts -> DUA_CATEGORIES, DUAS (full)

## Nav restructure (app-shell.tsx)
Grouped desktop sidebar (Overview / Worship / System + extras). Mobile bottom nav = 5 primary
(Dashboard, Quran, Salah, Habits, More) with More sheet listing the rest.

## Visual polish
Dark mode (exists), full responsive, animated stat cards (bklit-inspired), tasteful motion
(reactbits-inspired), clean card/list patterns (kokonutui-inspired). Original implementations.

## Landing: merge Istiqamah current + Hayat landing best sections.

## Execution phases
1. Schema + sync + store wiring + drizzle push
2. Port content libs (trimmed) into web/lib/content/
3. Nav restructure (sidebar groups + mobile bottom nav + More sheet) + routes
4. New pages: calendar, quran, khatma, goals, focus, achievements, analytics, duas
5. Upgrade existing: dashboard, journal, ibadah split (habits/salah/hifz), settings
6. Landing merge + visual polish pass
7. bun run build, dev server, mb smoke test, deliver

## Progress
- [x] phase 1 — schema (8 new tables) + sync COLLECTION_TABLES + store COLLECTIONS + DB_VERSION=4 + drizzle push DONE
      NOTE: store.ts COLLECTIONS edit silently failed twice; re-verified by reading the array. All 8 stores confirmed
      created in IndexedDB (v4) via mb: calendarEvents, khatmaPlans, quranLogs, quranBookmarks, duaFavorites,
      goals, focusSessions, achievements.
- [x] phase 2 — ported content libs to web/lib/content/{islamic,duas}.ts, trimmed 32 cut-feature blocks.
- [x] phase 3 — nav restructure (sidebar groups Overview/Worship/System + mobile bottom nav + More sheet) + routes wired.
- [x] phase 4 — new pages DONE: calendar, quran, khatma, goals, focus, achievements, analytics, duas, notes (extracted from journal).
      All wired into app.tsx (no ComingSoon placeholders left).
- [x] i18n audit — 32 missing keys added to BOTH id + en (verify with `grep -c` per key = exactly 2). Fixed "Jurnal"
      hardcode in analytics.tsx and khatma.daysLeft casing.
- [x] write-path verification (proves store fix): goals, khatmaPlans, quranLogs, duaFavorites all persist to IndexedDB
      end-to-end via UI. Achievements auto-unlock reacts to quranLogs (1/16 unlocked).
- [x] PREVIEW 2 delivered — awaiting user feedback
- [x] phase 5 — upgrade existing: dashboard, journal, ibadah split, settings DONE
- [x] phase 6 — landing merge (Istiqamah + Hayat landing) + visual polish / responsive pass DONE
- [ ] phase 7 — final build, visual upgrade polish, full mb smoke, deliver

## Database migration process

**Proyek ini pakai `drizzle-kit push` (bukan generate+migrate).** Artinya: tidak ada file migrasi SQL yang di-commit ke repo. Skema hanya "didorong" langsung ke database yang ditunjuk `.env`.

### Cara push schema baru ke production:
```bash
# 1. Set env vars ke production Turso DB
export DATABASE_URL='libsql://istiqamah-prod-....turso.io'
export DATABASE_AUTH_TOKEN='...'

# 2. Push schema
cd packages/web
bun drizzle-kit push

# 3. Jika push gagal (PRIMARY KEY constraint cannot be altered),
#    gunakan SQL manual via Turso CLI atau libSQL client:
bun -e "import {createClient} from '@libsql/client'; const c=createClient({url:process.env.DATABASE_URL,authToken:process.env.DATABASE_AUTH_TOKEN}); await c.execute('CREATE TABLE IF NOT EXISTS ...');"
```

### Penting:
- **SELALU** push ke production SETELAH menambah tabel baru di schema.ts
- **JANGAN** lupa push ke prod — push ke dev saja tidak cukup
- Error `no such table` di production = tabel belum di-push ke prod

## Open question for user
- Mascot/companion gamification (pixel pet / XP) from NizamOS refs — deferred, clashes with "premium & calm". Unanswered.

## Content exports available (web/lib/content/islamic.ts)
computePrayerTimes, getNextPrayer, getHijriDate, getGregorianDate, DAILY_MOTIVATIONS,
VERSES_OF_THE_DAY/getVerseOfTheDay, JOURNAL_PROMPTS/getDailyPrompts, ACHIEVEMENTS/TIER_STYLES,
SURAHS + QURAN_SURAHS/getSurah/TOTAL_QURAN_AYAHS, ISLAMIC_EVENTS/getUpcomingIslamicEvents/getIslamicEventDescription,
HADITHS_OF_THE_DAY/getHadithOfTheDay, QURAN_RECITERS/surahAudioUrl, SCHOLAR_QUOTES/getScholarQuoteOfTheDay,
HABIT_CATEGORIES/getHabitCategoryStyle, FOCUS_MODES/FOCUS_BREAKS/FOCUS_PRESETS/FOCUS_INTENTIONS,
HIFZ_STATUS_META/daysUntilReview, greetingByHour. content/duas.ts: DUA_CATEGORIES, DUAS, getDuasByCategory.
NOTE: domain.ts already has ymd/dates, formatIDR, PRAYERS(lowercase keys), habits/cycle helpers — reuse those.
