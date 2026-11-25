"use client";

import { Bell, Moon, Sun } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Link } from "@/components/common/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { usePathname, useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { useIsClient } from "@/lib/hooks";
import { qk } from "@/lib/query";
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

export function useUnreadNotifications(): number {
  const { user } = useAuth();
  const { data } = useQuery({ queryKey: qk.notifications, queryFn: api.notifications.list, enabled: !!user, refetchInterval: 60_000 });
  return data?.filter((n) => !n.read).length ?? 0;
}

export function NotificationBell({ className }: { className?: string }) {
  const { user } = useAuth();
  const t = useTranslations("nav");
  const unread = useUnreadNotifications();
  if (!user) return null;
  return (
    <Button variant="ghost" size="icon" asChild className={cn("relative", className)}>
      {/* Named by its own text ("Notifications 3 unread"), so the name always contains the visible badge. */}
      <Link href="/account/notifications">
        <Bell aria-hidden />
        <span className="sr-only">{t("notifications")}</span>
        {unread > 0 ? (
          <span className="font-num absolute top-1.5 right-1.5 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-destructive px-1 text-[0.65rem] font-bold text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
            <span className="sr-only"> {t("unread")}</span>
          </span>
        ) : null}
      </Link>
    </Button>
  );
}
