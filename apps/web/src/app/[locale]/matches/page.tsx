import { MatchesBoard } from "@/features/matches/matches-board";
import { usePageLocale, type LocalePageProps } from "@/i18n/page";

export default function Page({ params }: LocalePageProps) {
  usePageLocale(params);
  return <MatchesBoard />;
}
