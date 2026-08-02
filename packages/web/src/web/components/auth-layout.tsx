import { type ReactNode } from "react";
import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";
import { Wordmark } from "./logo";
import { ThemeToggle, LangToggle } from "./switches";
import { verseOfDay } from "@/lib/domain";

export function AuthLayout({ children }: { children: ReactNode }) {
  const { lang } = useI18n();
  const verse = verseOfDay();
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Form side */}
      <div className="relative flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link to="/">
            <Wordmark />
          </Link>
          <div className="flex items-center gap-1">
            <LangToggle />
            <ThemeToggle />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>

      {/* Brand / verse side */}
      <div className="relative hidden overflow-hidden bg-primary lg:block">
        <div className="geo-texture absolute inset-0 opacity-10" />
        <div
          aria-hidden
          className="animate-float-slow absolute -right-16 top-16 h-64 w-64 rounded-full bg-gold/25 blur-3xl"
        />
        <div className="relative flex h-full flex-col justify-center px-14 text-primary-foreground">
          <p className="font-arabic text-right text-5xl leading-[1.9] text-gold">{verse.ar}</p>
          <div className="mt-8 h-px w-24 bg-primary-foreground/25" />
          <p className="mt-8 max-w-md font-display text-2xl italic leading-relaxed">
            “{lang === "id" ? verse.id : verse.en}”
          </p>
          <p className="mt-4 text-sm font-medium text-primary-foreground/70">— {verse.ref}</p>
        </div>
      </div>
    </div>
  );
}
