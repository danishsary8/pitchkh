"use client";

import { CalendarCheck, Heart, LayoutDashboard, LogOut, MessageCircle, ShieldCheck, Star, Swords, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useNavigate } from "@/components/common/link";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/ui/misc";
import { useAuth } from "@/features/auth/auth-provider";
import { features } from "@/lib/features";

/**
 * Account dropdown for signed-in users (desktop header). Loaded on demand from
 * the app shell, so visitors who are not signed in never download the menu
 * and its positioning code.
 */
export default function UserMenu() {
  const { user, logout } = useAuth();
  const t = useTranslations("nav");
  const navigate = useNavigate();
  if (!user) return null;
  const items = [
    { href: "/account/bookings", label: t("myBookings"), icon: CalendarCheck },
    ...(features.matches ? [{ href: "/account/matches", label: t("myMatches"), icon: Swords }] : []),
    { href: "/account/favorites", label: t("favorites"), icon: Heart },
    ...(features.chat ? [{ href: "/account/messages", label: t("messages"), icon: MessageCircle }] : []),
    ...(features.reviews ? [{ href: "/account/reviews", label: t("reviews"), icon: Star }] : []),
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
