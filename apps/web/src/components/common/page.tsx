"use client";

import type { Sport } from "@pitchkh/shared";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { SportIcon } from "@/components/brand/pitch-art";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "./link";

export function Container({ className, children, size = "lg" }: { className?: string; children: ReactNode; size?: "sm" | "md" | "lg" }) {
  return <div className={cn("mx-auto w-full px-4 lg:px-6", size === "sm" ? "max-w-xl" : size === "md" ? "max-w-4xl" : "max-w-7xl", className)}>{children}</div>;
}

/** Page title block with an optional back link and action. */
export function PageHeader({ title, subtitle, back, action, className }: { title: string; subtitle?: string; back?: string; action?: ReactNode; className?: string }) {
  const t = useTranslations("common");
  return (
    <div className={cn("flex flex-col gap-3 pt-4 pb-5 lg:pt-8", className)}>
      {back ? (
        <Link href={back} className="-ml-2 inline-flex h-10 w-fit items-center gap-1 rounded-full px-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4.5" />
          {t("back")}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="font-display text-[1.75rem] text-balance sm:text-4xl">{title}</h1>
          {subtitle ? <p className="max-w-2xl text-pretty text-muted-foreground">{subtitle}</p> : null}
        </div>
        {action}
      </div>
    </div>
  );
}

export function SectionHeading({ title, action, className }: { title: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <h2 className="font-display text-2xl text-balance sm:text-3xl">{title}</h2>
      {action}
    </div>
  );
}

export function SportBadge({ sport, className }: { sport: Sport; className?: string }) {
  const t = useTranslations("sport");
  return (
    <Badge variant={sport} className={className}>
      <SportIcon sport={sport} className="size-3.5" />
      {t(sport)}
    </Badge>
  );
}

export function Rating({ value, count, className }: { value: number; count?: number; className?: string }) {
  const t = useTranslations("common");
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm font-semibold", className)}>
      <Star className="size-4 fill-accent text-accent" aria-hidden />
      <span className="font-num">{count === 0 ? t("new") : value.toFixed(1)}</span>
      {count ? <span className="font-num font-normal text-muted-foreground">({count})</span> : null}
    </span>
  );
}

export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex gap-0.5", className)} role="img" aria-label={`${value}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn("size-4", n <= Math.round(value) ? "fill-accent text-accent" : "fill-muted text-muted")} />
      ))}
    </span>
  );
}

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  const t = useTranslations("common");
  if (totalPages <= 1) return null;
  return (
    <nav className="flex items-center justify-center gap-3 pt-6" aria-label={t("page", { page, total: totalPages })}>
      <Button variant="secondary" size="icon" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label={t("previous")}>
        <ChevronLeft />
      </Button>
      <span className="font-num text-sm font-semibold">{t("page", { page, total: totalPages })}</span>
      <Button variant="secondary" size="icon" disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label={t("next")}>
        <ChevronRight />
      </Button>
    </nav>
  );
}

/** Fixed action bar for phones. Sits above the tab bar (or the screen edge in focused flows). */
export function StickyBar({ children, className, aboveTabs = true }: { children: ReactNode; className?: string; aboveTabs?: boolean }) {
  return (
    <div
      className={cn("fixed inset-x-0 z-30 bg-card px-4 py-3 shadow-[0_-1px_0_var(--border)] lg:hidden", aboveTabs ? "bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))]" : "bottom-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))]", className)}
    >
      <div className="mx-auto flex max-w-xl items-center gap-3">{children}</div>
    </div>
  );
}
