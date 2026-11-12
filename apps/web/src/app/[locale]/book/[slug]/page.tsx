import { Suspense, use } from "react";
import { BookingFlow } from "@/features/booking/booking-flow";
import { usePageLocale } from "@/i18n/page";

export default function Page({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  usePageLocale(params);
  const { slug } = use(params);
  return (
    <Suspense>
      <BookingFlow slug={slug} />
    </Suspense>
  );
}
