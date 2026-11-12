import { MyBookings } from "@/features/account/account-pages";
import { usePageLocale, type LocalePageProps } from "@/i18n/page";

export default function Page({ params }: LocalePageProps) {
  usePageLocale(params);
  return <MyBookings />;
}
