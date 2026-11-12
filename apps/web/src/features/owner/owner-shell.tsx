"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarRange, ClipboardList, LayoutDashboard, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { DashboardShell } from "@/features/dashboard/shared";
import { api } from "@/lib/api";
import { qk } from "@/lib/query";

export function OwnerShell({ children }: { children: ReactNode }) {
  const t = useTranslations("owner");
  const earnings = useQuery({ queryKey: qk.owner.earnings, queryFn: api.owner.earnings });
  return (
    <DashboardShell
      title={t("title")}
      links={[
        { href: "/owner", label: t("nav.overview"), icon: LayoutDashboard },
        { href: "/owner/bookings", label: t("nav.bookings"), icon: ClipboardList, badge: earnings.data?.pendingRequests },
        { href: "/owner/schedule", label: t("nav.schedule"), icon: CalendarRange },
        { href: "/owner/venues", label: t("nav.venues"), icon: Store },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
