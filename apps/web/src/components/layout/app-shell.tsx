"use client";

import { CalendarCheck, Home, LayoutDashboard, type LucideIcon, MapPin, ShieldCheck, Swords, User as UserIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { Link } from "@/components/common/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { type DashboardLink, isDashboardCurrent, useAdminLinks, useOwnerLinks } from "@/features/dashboard/nav";
import { usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { LocaleToggle, NotificationBell, ThemeToggle } from "./controls";
import { DemoNotice } from "./demo-notice";
import { features } from "@/lib/features";

const isActive = (pathname: string, href: string): boolean => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

/** Focused flows (booking stepper, chat thread) hide the tab bar so their own sticky bar owns the bottom edge. */
const hidesTabBar = (pathname: string): boolean => pathname.startsWith("/book/") || /^\/account\/messages\/.+/.test(pathname);

// The dropdown (and its positioning library) is only downloaded once someone is signed in.
const UserMenu = dynamic(() => import("./user-menu"), { ssr: false, loading: () => <span className="block size-10 rounded-full bg-secondary" aria-hidden /> });

function AccountControl() {
  const { user } = useAuth();
  const t = useTranslations("nav");
  if (user) return <UserMenu />;
  return (
    <Button asChild size="sm" className="h-10 px-4">
      <Link href="/login">{t("signIn")}</Link>
    </Button>
  );
}

function Header() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { user } = useAuth();
  const links = [
    { href: "/venues", label: t("venues") },
    ...(features.matches ? [{ href: "/matches", label: t("matches") }] : []),
    { href: "/account/bookings", label: t("myBookings") },
    { href: "/help", label: t("help") },
  ];
  return (
    <header className="pt-safe sticky top-0 z-40 bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/85">
      <div className="mx-auto flex h-(--header-h) w-full max-w-7xl items-center gap-2 px-4 lg:h-16 lg:px-6">
        <Link href="/" aria-label="PitchKH" className="mr-auto rounded-lg lg:mr-6">
          <Wordmark />
        </Link>
        <nav aria-label={t("main")} className="mr-auto hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(pathname, link.href) ? "page" : undefined}
              className="rounded-full px-4 py-2 text-[0.95rem] font-semibold text-muted-foreground transition-colors duration-150 hover:text-foreground aria-[current=page]:bg-secondary aria-[current=page]:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        {user?.role === "owner" || !user ? (
          <Button asChild variant="ghost" size="sm" className="hidden h-10 xl:inline-flex">
            <Link href={user ? "/owner" : "/login?next=/owner"}>{user ? t("ownerDashboard") : t("listVenue")}</Link>
          </Button>
        ) : null}
        <LocaleToggle />
        <ThemeToggle />
        <NotificationBell />
        <div className="hidden lg:block">
          <AccountControl />
        </div>
      </div>
    </header>
  );
}

type Tab = { href: string; label: string; icon: LucideIcon; badge?: number; current: boolean };

function TabBar({ tabs }: { tabs: Tab[] }) {
  const t = useTranslations("nav");
  return (
    <nav aria-label={t("main")} className="pb-safe fixed inset-x-0 bottom-0 z-40 bg-card shadow-[0_-1px_0_var(--border)] lg:hidden">
      <ul className="mx-auto flex h-(--tabbar-h) max-w-xl items-stretch">
        {tabs.map((tab) => (
          <li key={tab.href} className="min-w-0 flex-1">
            <Link
              href={tab.href}
              aria-current={tab.current ? "page" : undefined}
              className={cn("press flex h-full flex-col items-center justify-center gap-0.5 text-[0.7rem] font-semibold outline-none focus-visible:bg-secondary", tab.current ? "text-primary" : "text-muted-foreground")}
            >
              <span className={cn("relative grid h-8 w-14 place-items-center rounded-full transition-colors duration-150", tab.current && "bg-primary/12")}>
                <tab.icon className="size-5.5" strokeWidth={tab.current ? 2.4 : 2} />
                {tab.badge ? (
                  <span className="font-num absolute -top-1 right-2 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-destructive px-1 text-[0.65rem] leading-none font-bold text-destructive-foreground">
                    {tab.badge > 99 ? "99+" : tab.badge}
                  </span>
                ) : null}
              </span>
              <span className="max-w-full truncate px-0.5">{tab.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Players (and guests) browse and book. Owners and admins swap "Bookings" for their dashboard; their own bookings stay under Profile. */
function PlayerTabs() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { user } = useAuth();
  const fourth =
    user?.role === "owner" ? { href: "/owner", label: t("dashboard"), icon: LayoutDashboard }
    : user?.role === "admin" ? { href: "/admin", label: t("admin"), icon: ShieldCheck }
    : { href: "/account/bookings", label: t("bookings"), icon: CalendarCheck };
  const links = [
    { href: "/", label: t("home"), icon: Home },
    { href: "/venues", label: t("venues"), icon: MapPin },
    ...(features.matches ? [{ href: "/matches", label: t("matches"), icon: Swords }] : []),
    fourth,
    { href: "/account", label: t("profile"), icon: UserIcon },
  ];
  // "Profile" owns everything under /account, except the bookings tab when it is shown.
  const current = (href: string): boolean =>
    href === "/account" ? pathname.startsWith("/account") && !(fourth.href === "/account/bookings" && pathname.startsWith("/account/bookings")) : isActive(pathname, href);
  return <TabBar tabs={links.map((link) => ({ ...link, current: current(link.href) }))} />;
}

/** Inside the owner dashboard or admin panel the tab bar holds that section's pages, plus Profile. */
function DashboardTabs({ links }: { links: DashboardLink[] }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  return <TabBar tabs={[...links.map((link) => ({ ...link, label: link.short ?? link.label, current: isDashboardCurrent(links, pathname, link.href) })), { href: "/account", label: t("profile"), icon: UserIcon, current: false }]} />;
}

function OwnerTabs() {
  return <DashboardTabs links={useOwnerLinks()} />;
}

function AdminTabs() {
  return <DashboardTabs links={useAdminLinks()} />;
}

function BottomTabs() {
  const pathname = usePathname();
  if (pathname === "/owner" || pathname.startsWith("/owner/")) return <OwnerTabs />;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return <AdminTabs />;
  return <PlayerTabs />;
}

export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations("common");
  const pathname = usePathname();
  const focused = hidesTabBar(pathname);
  return (
    <>
      <a href="#main" className="sr-only z-50 rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        {t("skipToContent")}
      </a>
      <DemoNotice />
      <Header />
      <main id="main" className={cn("flex min-h-[calc(100dvh-var(--header-h))] flex-col", focused ? "pb-0" : "pb-tabbar")}>
        {children}
      </main>
      {focused ? null : <BottomTabs />}
    </>
  );
}
