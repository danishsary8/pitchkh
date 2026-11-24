import { MyMatches } from "@/features/account/account-pages";
import { usePageLocale, type LocalePageProps } from "@/i18n/page";
import { requireFeature } from "@/lib/features";

export default function Page({ params }: LocalePageProps) {
  usePageLocale(params);
  requireFeature("matches");
  return <MyMatches />;
}
