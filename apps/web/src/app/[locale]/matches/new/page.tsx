import { RequireAuth } from "@/features/auth/require-auth";
import { MatchCreate } from "@/features/matches/match-create";
import { usePageLocale, type LocalePageProps } from "@/i18n/page";

export default function Page({ params }: LocalePageProps) {
  usePageLocale(params);
  return (
    <RequireAuth>
      <MatchCreate />
    </RequireAuth>
  );
}
