import { Suspense, use } from "react";
import { RequireAuth } from "@/features/auth/require-auth";
import { BookingDetail } from "@/features/booking/booking-detail";
import { usePageLocale } from "@/i18n/page";

export default function Page({ params }: { params: Promise<{ locale: string; id: string }> }) {
  usePageLocale(params);
  const { id } = use(params);
  return (
    <RequireAuth>
      <Suspense>
        <BookingDetail id={id} />
      </Suspense>
    </RequireAuth>
  );
}
