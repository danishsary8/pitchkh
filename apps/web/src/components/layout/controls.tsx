"use client";

import { Moon, Sun } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useIsClient } from "@/lib/hooks";
import { cn } from "@/lib/utils";

/** EN <-> ខ្មែរ. Keeps the visitor on the same page. */
export function LocaleToggle({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const next = locale === "en" ? "km" : "en";
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("h-11 min-w-11 px-3 font-bold", className)}
      onClick={() => router.replace(`${pathname}${window.location.search}`, { locale: next, scroll: false })}
      lang={next}
    >
      {/* Named by its own text so the name contains what is shown ("EN English"): voice users can say "click EN". */}
      {next === "km" ? "ខ្មែរ" : <>EN<span className="sr-only"> {t("switchToEnglish")}</span></>}
    </Button>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useTranslations("common");
  const client = useIsClient();
  const dark = client && resolvedTheme === "dark";
  return (
    <Button variant="ghost" size="icon" className={className} onClick={() => setTheme(dark ? "light" : "dark")} aria-label={t("toggleTheme")}>
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}
