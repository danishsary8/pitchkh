import { RequireAuth } from "@/features/auth/require-auth";
import { MatchCreate } from "@/features/matches/match-create";
import { usePageLocale, type LocalePageProps } from "@/i18n/page";
import { requireFeature } from "@/lib/features";

export default function Page({ params }: LocalePageProps) {
  usePageLocale(params);
  requireFeature("matches");
  return (
    <RequireAuth>
      <MatchCreate />
    </RequireAuth>
  );
}
