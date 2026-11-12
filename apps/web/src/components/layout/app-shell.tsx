"use client";

import { CalendarCheck, Heart, Home, LayoutDashboard, LogOut, MapPin, MessageCircle, ShieldCheck, Star, Swords, User as UserIcon, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { Wordmark } from "@/components/brand/wordmark";
import { Link, useNavigate } from "@/components/common/link";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/ui/misc";
import { useAuth } from "@/features/auth/auth-provider";
import { usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { LocaleToggle, NotificationBell, ThemeToggle } from "./controls";

const isActive = (pathname: string, href: string): boolean => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

/** Focused flows (booking stepper, chat thread) hide the tab bar so their own sticky bar owns the bottom edge. */
const hidesTabBar = (pathname: string): boolean => pathname.startsWith("/book/") || /^\/account\/messages\/.+/.test(pathname);

function UserMenu() {
  const { user, logout } = useAuth();
  const t = useTranslations("nav");
  const navigate = useNavigate();
  if (!user) {
    return (
      <Button asChild size="sm" className="h-10 px-4">
        <Link href="/login">{t("signIn")}</Link>
      </Button>
    );
  }
  const items = [
    { href: "/account/bookings", label: t("myBookings"), icon: CalendarCheck },
    { href: "/account/matches", label: t("myMatches"), icon: Swords },
    { href: "/account/favorites", label: t("favorites"), icon: Heart },
    { href: "/account/messages", label: t("messages"), icon: MessageCircle },
    { href: "/account/reviews", label: t("reviews"), icon: Star },
    { href: "/account", label: t("profile"), icon: UserRound },
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="press rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" aria-label={t("account")}>
          <Avatar name={user.name} src={user.avatarUrl} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <span className="block text-sm font-bold text-foreground">{user.name}</span>
          <span className="block truncate font-normal">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {user.role !== "player" ? (
            <DropdownMenuItem onSelect={() => navigate(user.role === "admin" ? "/admin" : "/owner")}>
              {user.role === "admin" ? <ShieldCheck /> : <LayoutDashboard />}
              {user.role === "admin" ? t("adminPanel") : t("ownerDashboard")}
            </DropdownMenuItem>
          ) : null}
          {items.map((item) => (
            <DropdownMenuItem key={item.href} onSelect={() => navigate(item.href)}>
              <item.icon />
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            void logout().then(() => {
              toast(t("signedOut"));
              navigate("/");
            });
          }}
        >
          <LogOut />
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Header() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { user } = useAuth();
  const links = [
    { href: "/venues", label: t("venues") },
    { href: "/matches", label: t("matches") },
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
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

function BottomTabs() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const tabs = [
    { href: "/", label: t("home"), icon: Home },
    { href: "/venues", label: t("venues"), icon: MapPin },
    { href: "/matches", label: t("matches"), icon: Swords },
    { href: "/account/bookings", label: t("bookings"), icon: CalendarCheck },
    { href: "/account", label: t("profile"), icon: UserIcon },
  ];
  // "Profile" owns everything under /account except the bookings tab.
  const active = (href: string): boolean => (href === "/account" ? pathname.startsWith("/account") && !pathname.startsWith("/account/bookings") : isActive(pathname, href));
  return (
    <nav aria-label={t("main")} className="pb-safe fixed inset-x-0 bottom-0 z-40 bg-card shadow-[0_-1px_0_var(--border)] lg:hidden">
      <ul className="mx-auto flex h-(--tabbar-h) max-w-xl items-stretch">
        {tabs.map((tab) => {
          const current = active(tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={current ? "page" : undefined}
                className={cn("press flex h-full flex-col items-center justify-center gap-0.5 text-[0.7rem] font-semibold outline-none focus-visible:bg-secondary", current ? "text-primary" : "text-muted-foreground")}
              >
                <span className={cn("grid h-8 w-14 place-items-center rounded-full transition-colors duration-150", current && "bg-primary/12")}>
                  <tab.icon className="size-5.5" strokeWidth={current ? 2.4 : 2} />
                </span>
                <span className="max-w-full truncate px-0.5">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
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
      <Header />
      <main id="main" className={cn("flex min-h-[calc(100dvh-var(--header-h))] flex-col", focused ? "pb-0" : "pb-tabbar")}>
        {children}
      </main>
      {focused ? null : <BottomTabs />}
    </>
  );
}
