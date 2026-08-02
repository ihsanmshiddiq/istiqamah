import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useI18n } from "@/lib/i18n";
import { authClient } from "@/lib/auth";
import { AuthLayout } from "@/components/auth-layout";
import { Button, Field, Input } from "@/components/ui/primitives";
import { GoogleButton } from "@/components/google-button";

export default function Signup() {
  const { t } = useI18n();
  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await authClient.signUp.email({ email, password, name });
    setLoading(false);
    if (error) {
      setError(error.message ?? t("auth.error.generic"));
      return;
    }
    navigate("/app");
  }

  return (
    <AuthLayout>
      <h1 className="font-display text-3xl font-semibold tracking-tight">{t("auth.signup.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("auth.signup.sub")}</p>

      <div className="mt-8">
        <GoogleButton label={t("auth.google")} onError={setError} />
      </div>

      <div className="my-6 flex items-center gap-4">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{t("auth.or")}</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label={t("auth.name")}>
          <Input
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("auth.namePlaceholder")}
          />
        </Field>
        <Field label={t("auth.email")}>
          <Input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
          />
        </Field>
        <Field label={t("auth.password")}>
          <Input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? t("common.loading") : t("auth.signup.btn")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("auth.toLogin")}{" "}
        <Link to="/login" className="font-medium text-primary hover:underline">
          {t("auth.toLoginLink")}
        </Link>
      </p>
    </AuthLayout>
  );
}
