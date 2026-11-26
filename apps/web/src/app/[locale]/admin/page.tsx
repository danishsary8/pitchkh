import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminPage } from "@/features/staff/admin-page";
import { usePageLocale, type LocalePageProps } from "@/i18n/page";

export const metadata: Metadata = { title: "Bookings", robots: { index: false } };

export default function Page({ params }: LocalePageProps) {
  usePageLocale(params);
  return (
    <Suspense>
      <AdminPage />
    </Suspense>
  );
}
