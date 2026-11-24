"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useOwnerLinks } from "@/features/dashboard/nav";
import { DashboardShell } from "@/features/dashboard/shared";

export function OwnerShell({ children }: { children: ReactNode }) {
  const t = useTranslations("owner");
  return (
    <DashboardShell title={t("title")} links={useOwnerLinks()}>
      {children}
    </DashboardShell>
  );
}
