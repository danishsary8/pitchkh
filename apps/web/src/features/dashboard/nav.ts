"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart3, CalendarRange, ClipboardList, Flag, LayoutDashboard, type LucideIcon, Store, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { qk } from "@/lib/query";

/** `short` replaces `label` in the narrow mobile tab bar. */
export type DashboardLink = { href: string; label: string; short?: string; icon: LucideIcon; badge?: number };

/** Owner dashboard sections. Used by the desktop sidebar and the mobile tab bar. */
export function useOwnerLinks(): DashboardLink[] {
  const t = useTranslations("owner.nav");
  const tNav = useTranslations("nav");
  const earnings = useQuery({ queryKey: qk.owner.earnings, queryFn: api.owner.earnings });
  return [
    { href: "/owner", label: t("overview"), icon: LayoutDashboard },
    { href: "/owner/bookings", label: t("bookings"), icon: ClipboardList, badge: earnings.data?.pendingRequests },
    { href: "/owner/schedule", label: t("schedule"), icon: CalendarRange },
    { href: "/owner/venues", label: t("venues"), short: tNav("venues"), icon: Store },
  ];
}

/** Admin panel sections. Used by the desktop sidebar and the mobile tab bar. */
export function useAdminLinks(): DashboardLink[] {
  const t = useTranslations("admin.nav");
  const analytics = useQuery({ queryKey: qk.admin.analytics, queryFn: api.admin.analytics });
  return [
    { href: "/admin", label: t("analytics"), icon: BarChart3 },
    { href: "/admin/venues", label: t("venues"), icon: Store, badge: analytics.data?.pendingVenues },
    { href: "/admin/users", label: t("users"), icon: Users },
    { href: "/admin/reports", label: t("reports"), icon: Flag, badge: analytics.data?.openReports },
  ];
}

/** The first link is the section root: it is current only on its exact path, the others on any sub-path. */
export function isDashboardCurrent(links: DashboardLink[], pathname: string, href: string): boolean {
  return href === links[0]?.href ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}
