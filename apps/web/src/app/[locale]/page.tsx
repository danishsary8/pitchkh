import { usePageLocale, type LocalePageProps } from "@/i18n/page";

export default function HomePage({ params }: LocalePageProps) {
  usePageLocale(params);
  return <div className="p-6">PitchKH</div>;
}
