import { CreditsPage } from "@/features/content/content-pages";
import credits from "@/features/content/photo-credits.json";
import { usePageLocale, type LocalePageProps } from "@/i18n/page";

export default function Page({ params }: LocalePageProps) {
  usePageLocale(params);
  return <CreditsPage credits={credits} />;
}
