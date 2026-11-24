"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, isApiError, schemas, type LoginDto, type RegisterDto, type Role } from "@pitchkh/shared";
import { Eye, EyeOff, LayoutDashboard, ShieldCheck, Volleyball } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { KramaStrip } from "@/components/brand/pitch-art";
import { Link, useNavigate } from "@/components/common/link";
import { Container } from "@/components/common/page";
import { useErrorMessage } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, Spinner } from "@/components/ui/misc";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAuth } from "./auth-provider";

const homeFor = (role: Role): string => (role === "admin" ? "/admin" : role === "owner" ? "/owner" : "/");

export function useAfterAuth() {
  const navigate = useNavigate();
  const params = useSearchParams();
  const t = useTranslations("auth");
  return (user: { name: string; role: Role }) => {
    toast.success(t("welcome", { name: user.name.split(" ").pop() ?? user.name }));
    const next = params.get("next");
    // Only follow internal paths, and never send a player into a dashboard.
    const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
    const allowed = safe && !((safe.startsWith("/owner") && user.role === "player") || (safe.startsWith("/admin") && user.role !== "admin"));
    navigate(allowed ? safe : homeFor(user.role), { replace: true });
  };
}

export function AuthFrame({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <Container size="sm" className="flex flex-1 flex-col justify-center py-8">
      <div className="overflow-hidden rounded-3xl bg-card">
        <KramaStrip />
        <div className="flex flex-col gap-6 p-5 sm:p-8">
          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-3xl">{title}</h1>
            <p className="text-muted-foreground">{body}</p>
          </div>
          {children}
        </div>
      </div>
    </Container>
  );
}

export function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const t = useTranslations("auth");
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className="pr-12" />
      <button type="button" onClick={() => setVisible((v) => !v)} aria-label={visible ? t("hidePassword") : t("showPassword")} className="absolute top-0.5 right-0.5 grid size-11 place-items-center rounded-xl text-muted-foreground hover:text-foreground">
        {visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
      </button>
    </div>
  );
}

export function LoginPage() {
  const t = useTranslations("auth");
  const te = useTranslations("errors");
  const { login } = useAuth();
  const afterAuth = useAfterAuth();
  const errorMessage = useErrorMessage();
  const params = useSearchParams();
  const [demoPending, setDemoPending] = useState<string | null>(null);
  const form = useForm<LoginDto>({ resolver: zodResolver(schemas.LoginDto), defaultValues: { email: "", password: "" } });
  const { errors, isSubmitting } = form.formState;

  const submit = async (dto: LoginDto): Promise<void> => {
    try {
      afterAuth(await login(dto));
    } catch (error) {
      form.setError("root", { message: errorMessage(error) });
    }
  };
  const demo = async (email: string): Promise<void> => {
    setDemoPending(email);
    try {
      afterAuth(await login({ email, password: DEMO_PASSWORD }));
    } catch (error) {
      toast.error(errorMessage(error));
      setDemoPending(null);
    }
  };
  const demoMeta = { player: { icon: Volleyball, label: t("demoPlayer"), hint: t("demoPlayerHint") }, owner: { icon: LayoutDashboard, label: t("demoOwner"), hint: t("demoOwnerHint") }, admin: { icon: ShieldCheck, label: t("demoAdmin"), hint: t("demoAdminHint") } };
  const next = params.get("next");

  return (
    <AuthFrame title={t("signInTitle")} body={t("signInBody")}>
      <section aria-labelledby="demo-title" className="flex flex-col gap-3 rounded-2xl bg-secondary p-4">
        <div>
          <h2 id="demo-title" className="font-bold">{t("demoTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("demoBody")}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {DEMO_ACCOUNTS.map((account) => {
            const meta = demoMeta[account.role];
            return (
              <button key={account.email} type="button" disabled={demoPending !== null} onClick={() => void demo(account.email)} className="press flex min-h-14 items-center gap-3 rounded-xl bg-card px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 sm:flex-col sm:items-start sm:gap-1.5 sm:py-3">
                {demoPending === account.email ? <Spinner className="size-5 text-primary" /> : <meta.icon className="size-5 shrink-0 text-primary" />}
                <span className="flex flex-col">
                  <span className="text-sm font-bold">{meta.label}</span>
                  <span className="text-xs text-muted-foreground">{meta.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <form onSubmit={form.handleSubmit(submit)} noValidate>
        <FieldGroup>
          {errors.root ? <Alert variant="destructive">{errors.root.message}</Alert> : null}
          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
            <Input id="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" aria-invalid={!!errors.email} {...form.register("email")} />
            <FieldError>{errors.email ? te("invalidEmail") : null}</FieldError>
          </Field>
          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
            <PasswordInput id="password" autoComplete="current-password" aria-invalid={!!errors.password} {...form.register("password")} />
            <FieldError>{errors.password ? te("tooShort") : null}</FieldError>
            <Link href="/forgot-password" className="w-fit text-sm font-semibold text-primary underline-offset-4 hover:underline">{t("forgotLink")}</Link>
          </Field>
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? <Spinner /> : null}
            {t("signIn")}
          </Button>
        </FieldGroup>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"} className="font-semibold text-primary underline-offset-4 hover:underline">
          {t("createAccount")}
        </Link>
      </p>
    </AuthFrame>
  );
}

export function RegisterPage() {
  const t = useTranslations("auth");
  const te = useTranslations("errors");
  const { register: signUp } = useAuth();
  const afterAuth = useAfterAuth();
  const errorMessage = useErrorMessage();
  const form = useForm<RegisterDto>({ resolver: zodResolver(schemas.RegisterDto), defaultValues: { name: "", email: "", phone: "", password: "", role: "player" } });
  const { errors, isSubmitting } = form.formState;
  const role = useWatch({ control: form.control, name: "role" });

  const submit = async (dto: RegisterDto): Promise<void> => {
    try {
      afterAuth(await signUp(dto));
    } catch (error) {
      if (isApiError(error) && error.code === "email_taken") form.setError("email", { message: te("email_taken") });
      else form.setError("root", { message: errorMessage(error) });
    }
  };

  return (
    <AuthFrame title={t("registerTitle")} body={t("registerBody")}>
      <form onSubmit={form.handleSubmit(submit)} noValidate>
        <FieldGroup>
          {errors.root ? <Alert variant="destructive">{errors.root.message}</Alert> : null}
          <Field>
            <FieldLabel id="role-label">{t("iAm")}</FieldLabel>
            <ToggleGroup type="single" value={role} onValueChange={(value) => value && form.setValue("role", value as RegisterDto["role"])} aria-labelledby="role-label">
              <ToggleGroupItem value="player" className="flex-1">{t("rolePlayer")}</ToggleGroupItem>
              <ToggleGroupItem value="owner" className="flex-1">{t("roleOwner")}</ToggleGroupItem>
            </ToggleGroup>
          </Field>
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="name">{t("name")}</FieldLabel>
            <Input id="name" autoComplete="name" aria-invalid={!!errors.name} {...form.register("name")} />
            <FieldError>{errors.name ? te("required") : null}</FieldError>
          </Field>
          <Field data-invalid={!!errors.phone}>
            <FieldLabel htmlFor="phone">{t("phone")}</FieldLabel>
            <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="012 345 678" aria-invalid={!!errors.phone} {...form.register("phone")} />
            <FieldError>{errors.phone ? te("invalidPhone") : null}</FieldError>
          </Field>
          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
            <Input id="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" aria-invalid={!!errors.email} {...form.register("email")} />
            <FieldError>{errors.email ? (errors.email.message === te("email_taken") ? errors.email.message : te("invalidEmail")) : null}</FieldError>
          </Field>
          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
            <PasswordInput id="password" autoComplete="new-password" aria-invalid={!!errors.password} aria-describedby="password-hint" {...form.register("password")} />
            {errors.password ? <FieldError>{te("tooShort")}</FieldError> : <FieldDescription id="password-hint">{t("passwordHint")}</FieldDescription>}
          </Field>
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? <Spinner /> : null}
            {t("createAccount")}
          </Button>
        </FieldGroup>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
          {t("signIn")}
        </Link>
      </p>
    </AuthFrame>
  );
}
