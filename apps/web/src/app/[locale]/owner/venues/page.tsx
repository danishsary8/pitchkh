import { OwnerVenues } from "@/features/owner/owner-venues";
import { usePageLocale, type LocalePageProps } from "@/i18n/page";

export default function Page({ params }: LocalePageProps) {
  usePageLocale(params);
  return <OwnerVenues />;
}
