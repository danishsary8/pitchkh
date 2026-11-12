"use client";

import { isApiError } from "@pitchkh/shared";
import { CloudOff } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({ icon, title, body, children, className }: { icon?: ReactNode; title: string; body?: string; children?: ReactNode; className?: string }) {
  return (
    <div data-slot="empty" className={cn("mx-auto flex w-full max-w-md flex-col items-center gap-3 px-6 py-12 text-center", className)}>
      {icon ? <div className="grid size-16 place-items-center rounded-full bg-secondary text-primary [&_svg]:size-7">{icon}</div> : null}
      <h2 className="text-xl font-bold text-balance">{title}</h2>
      {body ? <p className="text-pretty text-muted-foreground">{body}</p> : null}
      {children ? <div className="mt-2 flex flex-wrap justify-center gap-2">{children}</div> : null}
    </div>
  );
}

/** Translates any thrown value into a message the user can act on. */
export function useErrorMessage(): (error: unknown) => string {
  const t = useTranslations("errors");
  return (error) => (isApiError(error) ? t(error.code) : t("server_error"));
}

export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  const t = useTranslations("common");
  const message = useErrorMessage();
  return (
    <EmptyState icon={<CloudOff />} title={t("errorTitle")} body={message(error)} className={className}>
      {onRetry ? <Button onClick={onRetry}>{t("retry")}</Button> : null}
    </EmptyState>
  );
}
