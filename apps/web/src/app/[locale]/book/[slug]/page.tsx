import { Suspense, use } from "react";
import { BookingFlow } from "@/features/booking/booking-flow";
import { MotionRoot } from "@/features/booking/motion-root";
import { usePageLocale } from "@/i18n/page";

export default function Page({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  usePageLocale(params);
  const { slug } = use(params);
  return (
    <Suspense>
      <MotionRoot>
        <BookingFlow slug={slug} />
      </MotionRoot>
    </Suspense>
  );
}
