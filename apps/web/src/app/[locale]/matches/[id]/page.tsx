import { use } from "react";
import { MatchDetail } from "@/features/matches/match-detail";
import { usePageLocale } from "@/i18n/page";
import { requireFeature } from "@/lib/features";

export default function Page({ params }: { params: Promise<{ locale: string; id: string }> }) {
  usePageLocale(params);
  requireFeature("matches");
  const { id } = use(params);
  return <MatchDetail id={id} />;
}
