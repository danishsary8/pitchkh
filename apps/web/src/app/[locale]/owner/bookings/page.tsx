import { OwnerBookings } from "@/features/owner/owner-bookings";
import { usePageLocale, type LocalePageProps } from "@/i18n/page";

export default function Page({ params }: LocalePageProps) {
  usePageLocale(params);
  return <OwnerBookings />;
}
