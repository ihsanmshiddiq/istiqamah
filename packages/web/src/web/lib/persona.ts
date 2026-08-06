import { createContext, createElement, useContext, type ReactNode } from "react";
import { authClient } from "@/lib/auth";
import { useSingleton } from "@/hooks/use-store";
import type { Row } from "@/lib/store";

/**
 * Persona mappings loaded from env vars to avoid leaking PII in a public repo.
 * Add to .env.local:
 *   VITE_PERSONA_MAP=email1@domain.com:persona1,email2@domain.com:persona2
 *   VITE_PERSONA_NAME_MAP=Display Name:persona1,Another Name:persona2
 */
function parseMap(envVar: string | undefined): Record<string, string> {
  if (!envVar) return {};
  const result: Record<string, string> = {};
  for (const pair of envVar.split(",")) {
    const [key, value] = pair.split(":").map((s) => s.trim());
    if (key && value) result[key.toLowerCase()] = value.toLowerCase();
  }
  return result;
}

export const PERSONAS = parseMap(import.meta.env.VITE_PERSONA_MAP);
export const PERSONA_NAMES = parseMap(import.meta.env.VITE_PERSONA_NAME_MAP);

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
