import { OwnerOverview } from "@/features/owner/owner-overview";
import { usePageLocale, type LocalePageProps } from "@/i18n/page";

export default function Page({ params }: LocalePageProps) {
  usePageLocale(params);
  return <OwnerOverview />;
}
