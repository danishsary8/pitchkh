"use client";

import { Bell, CalendarCheck, Heart, MessageCircle, Shield, Star, Swords, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Link } from "@/components/common/link";
import { Container } from "@/components/common/page";
import { useUnreadNotifications } from "@/components/layout/controls";
import { usePathname } from "@/i18n/navigation";

export function useAccountLinks() {
  const t = useTranslations("nav");
  return [
    { href: "/account/bookings", label: t("myBookings"), icon: CalendarCheck },
    { href: "/account/matches", label: t("myMatches"), icon: Swords },
    { href: "/account/favorites", label: t("favorites"), icon: Heart },
    { href: "/account/messages", label: t("messages"), icon: MessageCircle },
    { href: "/account/notifications", label: t("notifications"), icon: Bell },
    { href: "/account/reviews", label: t("reviews"), icon: Star },
    { href: "/account/team", label: t("myTeam"), icon: Shield },
    { href: "/account", label: t("profile"), icon: UserRound },
  ];
}

/** Desktop: sidebar + content. Phones: content only (the Profile tab is the hub). */
export function AccountShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const links = useAccountLinks();
  const t = useTranslations("nav");
  const unread = useUnreadNotifications();
  return (
    <Container className="grid grid-cols-1 gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:pt-8">
      <nav aria-label={t("account")} className="hidden lg:block">
        <ul className="sticky top-24 flex flex-col gap-1">
          {links.map((link) => {
            const current = link.href === "/account" ? pathname === "/account" : pathname.startsWith(link.href);
            return (
              <li key={link.href}>
                <Link href={link.href} aria-current={current ? "page" : undefined} className="flex h-11 items-center gap-3 rounded-full px-4 text-[0.95rem] font-semibold text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:bg-card aria-[current=page]:text-foreground">
                  <link.icon className="size-4.5" />
                  {link.label}
                  {link.href === "/account/notifications" && unread > 0 ? <span className="font-num ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1.5 text-xs font-bold text-destructive-foreground">{unread}</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="min-w-0 pb-6">{children}</div>
    </Container>
  );
}
