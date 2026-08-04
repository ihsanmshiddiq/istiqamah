import { createContext, createElement, useContext, type ReactNode } from "react";
import { authClient } from "@/lib/auth";

export const PERSONAS: Record<string, string> = {
  "tantrin268@gmail.com": "tantri",
  "ihsanmshiddiq@gmail.com": "ihsan",
};

export function getPersonaForUser(email: string): string | null {
  return PERSONAS[email.trim().toLowerCase()] ?? null;
}

const PersonaContext = createContext<string | null | undefined>(undefined);

export function PersonaProvider({ children }: { children: ReactNode }) {
  const { data: session } = authClient.useSession();
  const persona = getPersonaForUser(session?.user?.email ?? "");

  return createElement(PersonaContext.Provider, { value: persona }, children);
}

export function usePersona(): string | null {
  const persona = useContext(PersonaContext);
  if (persona === undefined) {
    throw new Error("usePersona must be used within PersonaProvider");
  }
  return persona;
}
