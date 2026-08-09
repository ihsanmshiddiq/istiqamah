import { authClient } from "@/lib/auth";
import { useSingleton } from "@/hooks/use-store";
import type { Row } from "@/lib/store";

/**
 * Email & name are loaded from env vars to avoid leaking PII in a public repo.
 * Add to .env (never commit):
 *   VITE_SPECIAL_USER_EMAIL=tantrin268@gmail.com
 *   VITE_SPECIAL_USER_NAME=tantri nuraeni
 *   VITE_SPECIAL_USER_NICKNAMES=Bayi Tercinta,Nona Kejuku,Smurf Manisku,Orang Hebatku,Manusia Favoritku
 */
const SPECIAL_EMAIL = (import.meta.env.VITE_SPECIAL_USER_EMAIL ?? "").trim().toLowerCase();
const SPECIAL_NAME = (import.meta.env.VITE_SPECIAL_USER_NAME ?? "").trim().toLowerCase();

/** Detect if current user is the special user */
export function useIsSpecialUser(): boolean {
  const { data: session } = authClient.useSession();
  const profile = useSingleton<Row>("userProfile");
  const email = (session?.user?.email || "").trim().toLowerCase();
  const name = (profile?.displayName || session?.user?.name || "").trim().toLowerCase();
  return Boolean(SPECIAL_EMAIL && (email === SPECIAL_EMAIL || name === SPECIAL_NAME));
}

/** Rotating nicknames — different per day, consistent throughout the day */
export const SPECIAL_NICKNAMES = (() => {
  const raw = import.meta.env.VITE_SPECIAL_USER_NICKNAMES;
  if (raw) return raw.split(",").map((s: string) => s.trim()).filter(Boolean);
  return ["Kamu"];
})();

export function getSpecialNickname(): string {
  const dayIndex = new Date().getDate() % SPECIAL_NICKNAMES.length;
  return SPECIAL_NICKNAMES[dayIndex];
}
