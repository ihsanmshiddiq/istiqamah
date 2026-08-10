/**
 * Curated icon map — only imports icons actually used in the app.
 * This enables tree-shaking and reduces bundle size significantly.
 */
import {
  Award,
  BookMarked,
  BookOpen,
  Brain,
  Circle,
  Crown,
  Disc,
  Flame,
  GraduationCap,
  Heart,
  Infinity,
  Library,
  PenLine,
  Repeat,
  Sparkles,
  Star,
  Sunrise,
  Trophy,
  Activity,
  Users,
  type LucideIcon,
} from "lucide-react";

export const ICON_MAP: Record<string, LucideIcon> = {
  Award,
  BookMarked,
  BookOpen,
  Brain,
  Circle,
  Crown,
  Disc,
  Flame,
  GraduationCap,
  Heart,
  Infinity,
  Library,
  PenLine,
  Repeat,
  Sparkles,
  Star,
  Sunrise,
  Trophy,
  Activity,
  Users,
};

export function getIconByName(name: string): LucideIcon {
  return ICON_MAP[name] ?? Award;
}

export type { LucideIcon };
