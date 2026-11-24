import { MatchesBoard } from "@/features/matches/matches-board";
import { usePageLocale, type LocalePageProps } from "@/i18n/page";
import { requireFeature } from "@/lib/features";

export default function Page({ params }: LocalePageProps) {
  usePageLocale(params);
  requireFeature("matches");
  return <MatchesBoard />;
}
