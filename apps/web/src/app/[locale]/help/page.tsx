import { HelpPage } from "@/features/content/content-pages";
import { usePageLocale, type LocalePageProps } from "@/i18n/page";

export default function Page({ params }: LocalePageProps) {
  usePageLocale(params);
  return <HelpPage />;
}
