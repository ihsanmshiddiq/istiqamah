# Istiqamah — Design System

Premium Muslim LifeOS. Calm, elegant, editorial. Anti-AI-slop: no purple-on-white, no cookie-cutter rounded card grids, no generic sans everywhere.

## Brand
- Name: **Istiqamah** (steadfastness). Tagline: "Konsisten dalam kebaikan."
- Voice: warm, respectful, quietly premium. Bilingual ID/EN.

## Typography
- Display / headings: **Fraunces** (serif, opsz high, elegant). Used for hero, section titles, numbers.
- Body / UI: **Plus Jakarta Sans** (clean, humanist).
- Arabic (surah names, dua): **Amiri** where Arabic script appears.
- Hierarchy via size + weight + optical size, generous line-height (1.6 body).

## Color (OKLCH)
Light ("Paper"):
- background: warm ivory  oklch(0.985 0.008 95)
- foreground: deep ink    oklch(0.24 0.02 160)
- primary (pine emerald): oklch(0.42 0.09 165)
- primary-foreground:     oklch(0.98 0.01 95)
- accent (brass/gold):    oklch(0.74 0.11 78)
- muted paper:            oklch(0.95 0.01 95)
- card:                   oklch(0.995 0.004 95)
- border:                 oklch(0.88 0.012 120)

Dark ("Midnight"):
- background: deep forest oklch(0.19 0.02 165)
- foreground: soft ivory  oklch(0.94 0.01 95)
- primary (sage emerald): oklch(0.68 0.09 160)
- accent (warm brass):    oklch(0.78 0.1 78)
- card:                   oklch(0.23 0.022 165)
- border:                 oklch(1 0 0 / 10%)

Accents used for emphasis only (streaks, active states, CTA), never decoration.

## Texture & backgrounds
- Subtle Islamic geometric pattern (8-point star / girih) as very-low-opacity SVG texture on hero and section dividers. Hand-drawn feel, not clipart.
- Layered paper grain + soft radial glow behind hero. No harsh gradients.

## Layout
- Editorial, asymmetric. Generous negative space on marketing; controlled density in the app dashboard.
- Landing: large serif hero, offset imagery, horizontal feature rhythm (not a 3-card grid).
- App shell: left rail nav (icon + label), content max-w with breathing room.

## Motion
- One orchestrated page-load per view: staggered fade/slide reveals via Motion (framer-motion). Springy but restrained.
- Micro: check-off ripple, streak count-up, gentle hover lift. No bouncing everywhere.

## Iconography
- lucide-react, 1.5 stroke. Prayer/quran use custom-labeled lucide (Moon, Sunrise, BookOpen, etc.).

## Anti-patterns to avoid
- Purple gradients, Inter/Roboto, identical rounded cards in a 3-grid, emoji as UI, center-everything monotony.
