import { createContext, createElement, useContext, type ReactNode } from "react";
import { authClient } from "@/lib/auth";
import { useSingleton } from "@/hooks/use-store";
import type { Row } from "@/lib/store";

export const PERSONAS: Record<string, string> = {
  "tantrin268@gmail.com": "tantri",
  "ihsanmshiddiq@gmail.com": "ihsan",
};

export const PERSONA_NAMES: Record<string, string> = {
  "tantri nuraeni": "tantri",
};

export function getPersonaForUser(email: string, displayName = ""): string | null {
  return (
    PERSONAS[email.trim().toLowerCase()] ??
    PERSONA_NAMES[displayName.trim().toLowerCase()] ??
    null
  );
}

const PersonaContext = createContext<string | null | undefined>(undefined);

export function PersonaProvider({ children }: { children: ReactNode }) {
  const { data: session } = authClient.useSession();
  const profile = useSingleton<Row>("userProfile");
  const persona = getPersonaForUser(session?.user?.email ?? "", String(profile?.displayName ?? ""));

  return createElement(PersonaContext.Provider, { value: persona }, children);
}

export function usePersona(): string | null {
  const persona = useContext(PersonaContext);
  if (persona === undefined) {
    throw new Error("usePersona must be used within PersonaProvider");
  }
  return persona;
}
