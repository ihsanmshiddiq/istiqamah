import { useEffect, useRef, useState, type ReactNode } from "react";
import { Redirect } from "wouter";
import { authClient } from "@/lib/auth";
import { initStore, getSingleton, type Row } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import { LogoMark } from "./logo";

function FullScreenLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <LogoMark className="h-12 w-12 animate-pulse" />
        <div className="h-1 w-24 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/2 animate-[loader_1.1s_ease-in-out_infinite] rounded-full bg-primary" />
        </div>
      </div>
      <style>{`@keyframes loader{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`}</style>
    </div>
  );
}

/**
 * Boots the offline store once a session exists, then applies the server-side
 * profile theme/language preferences (first-load only, local choice wins after).
 */
export function StoreBootstrap({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const [ready, setReady] = useState(false);
  const started = useRef(false);
  const { setTheme } = useTheme();
  const { setLang } = useI18n();

  useEffect(() => {
    if (isPending || !session?.user?.id || started.current) return;
    started.current = true;
    void (async () => {
      await initStore(session.user.id);
      const prof = getSingleton<Row>("userProfile");
      if (prof) {
        if (!localStorage.getItem("istq-theme") && prof.theme)
          setTheme(prof.theme as "light" | "dark");
        if (!localStorage.getItem("istq-lang") && prof.language)
          setLang(prof.language as "id" | "en");
      }
      setReady(true);
    })();
  }, [isPending, session, setTheme, setLang]);

  if (isPending) return <FullScreenLoader />;
  if (!session?.user?.id) return <Redirect to="/login" />;
  if (!ready) return <FullScreenLoader />;
  return <>{children}</>;
}

/** For public auth pages — bounce to dashboard when already signed in. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  if (isPending) return <FullScreenLoader />;
  if (session?.user?.id) return <Redirect to="/app" />;
  return <>{children}</>;
}
