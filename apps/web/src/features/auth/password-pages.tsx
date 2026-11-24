"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { schemas } from "@pitchkh/shared";
import { MailCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "@/components/common/link";
import { useErrorMessage } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, Spinner } from "@/components/ui/misc";
import { api } from "@/lib/api";
import { AuthFrame, PasswordInput, useAfterAuth } from "./auth-pages";

/** Step 1: ask for a reset link. Same answer whether or not the email has an account. */
export function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const te = useTranslations("errors");
  const errorMessage = useErrorMessage();
  const [sent, setSent] = useState<{ demoResetUrl?: string } | null>(null);
  const form = useForm<{ email: string }>({ resolver: zodResolver(schemas.ForgotPasswordDto), defaultValues: { email: "" } });
  const { errors, isSubmitting } = form.formState;
  const submit = async ({ email }: { email: string }): Promise<void> => {
    try {
      setSent(await api.auth.forgotPassword(email));
    } catch (e) {
      form.setError("root", { message: errorMessage(e) });
    }
  };
  return (
    <AuthFrame title={t("forgotTitle")} body={t("forgotBody")}>
      {sent ? (
        <div className="flex flex-col items-center gap-3 text-center" role="status">
          <MailCheck className="size-10 text-primary" aria-hidden />
          <p className="font-semibold">{t("forgotSent")}</p>
          {sent.demoResetUrl ? (
            <Button asChild variant="secondary">
              <Link href={sent.demoResetUrl}>{t("forgotDemoLink")}</Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <form onSubmit={form.handleSubmit(submit)} noValidate>
          <FieldGroup>
            {errors.root ? <Alert variant="destructive">{errors.root.message}</Alert> : null}
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
              <Input id="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" aria-invalid={!!errors.email} {...form.register("email")} />
              <FieldError>{errors.email ? te("invalidEmail") : null}</FieldError>
            </Field>
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? <Spinner /> : null}
              {t("forgotSend")}
            </Button>
          </FieldGroup>
        </form>
      )}
      <p className="text-center text-sm">
        <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">{t("backToSignIn")}</Link>
      </p>
    </AuthFrame>
  );
}

/** Step 2: from the emailed link, choose a new password (signs in on success). */
export function ResetPasswordPage() {
  const t = useTranslations("auth");
  const te = useTranslations("errors");
  const errorMessage = useErrorMessage();
  const afterAuth = useAfterAuth();
  const token = useSearchParams().get("token") ?? "";
  const form = useForm<{ token: string; password: string }>({ resolver: zodResolver(schemas.ResetPasswordDto), defaultValues: { token, password: "" } });
  const { errors, isSubmitting } = form.formState;
  const submit = async (dto: { token: string; password: string }): Promise<void> => {
    try {
      afterAuth((await api.auth.resetPassword(dto)).user);
    } catch (e) {
      form.setError("root", { message: errorMessage(e) });
    }
  };
  return (
    <AuthFrame title={t("resetTitle")} body={t("resetBody")}>
      <form onSubmit={form.handleSubmit(submit)} noValidate>
        <FieldGroup>
          {errors.root ? (
            <Alert variant="destructive">
              {errors.root.message}{" "}
              <Link href="/forgot-password" className="font-semibold underline">{t("forgotAgain")}</Link>
            </Alert>
          ) : null}
          {!token ? <Alert variant="warning">{t("resetNoToken")}</Alert> : null}
          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="password">{t("newPassword")}</FieldLabel>
            <PasswordInput id="password" autoComplete="new-password" aria-invalid={!!errors.password} {...form.register("password")} />
            <FieldError>{errors.password ? te("tooShort") : null}</FieldError>
          </Field>
          <Button type="submit" size="lg" disabled={isSubmitting || !token}>
            {isSubmitting ? <Spinner /> : null}
            {t("resetSave")}
          </Button>
        </FieldGroup>
      </form>
    </AuthFrame>
  );
}
