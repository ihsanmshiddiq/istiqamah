import { authClient } from "@/lib/auth";
import { useSingleton } from "@/hooks/use-store";
import type { Row } from "@/lib/store";

const TANTRI_EMAIL = "tantrin268@gmail.com";
const TANTRI_NAME = "tantri nuraeni";

/** Detect if current user is Tantri */
export function useIsTantri(): boolean {
  const { data: session } = authClient.useSession();
  const profile = useSingleton<Row>("userProfile");
  const email = (session?.user?.email || "").trim().toLowerCase();
  const name = (profile?.displayName || session?.user?.name || "").trim().toLowerCase();
  return email === TANTRI_EMAIL || name === TANTRI_NAME;
}

/** Rotating nicknames — different per day, consistent throughout the day */
export const TANTRI_NICKNAMES = [
  "Bayi Tercinta",
  "Nona Kejuku",
  "Smurf Manisku",
  "Orang Hebatku",
  "Manusia Favoritku",
];

export function getTantriNickname(): string {
  const dayIndex = new Date().getDate() % TANTRI_NICKNAMES.length;
  return TANTRI_NICKNAMES[dayIndex];
}

/** Personal message — edit this anytime without asking Freebuff */
export const TANTRI_MESSAGE =
  "Katanya anti pedes, tapi somehow tahan sama drama aku. Makasih ya 💙";
