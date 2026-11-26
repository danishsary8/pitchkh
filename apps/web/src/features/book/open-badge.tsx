"use client";

import { useTranslations } from "next-intl";
import { openState } from "@/lib/booking-rules";
import type { Branch } from "@/lib/branches";
import { useIsClient } from "@/lib/hooks";
import { cn } from "@/lib/utils";

/**
 * "Open now, until 22:00" or "Opens at 06:00". The page is pre-rendered, so the
 * badge appears in the browser only, where the clock is right.
 */
export function OpenBadge({ branch, className }: { branch: Pick<Branch, "open" | "close">; className?: string }) {
  const t = useTranslations("book.open");
  const client = useIsClient();
  if (!client) return null;
  const state = openState(branch);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold backdrop-blur-md", state.open ? "bg-primary text-primary-foreground" : "bg-black/55 text-white", className)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", state.open ? "bg-accent" : "bg-white/60")} />
      {state.open ? t("now", { time: state.until }) : t("later", { time: state.opensAt })}
    </span>
  );
}
