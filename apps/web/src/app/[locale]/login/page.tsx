import { Suspense } from "react";
import { LoginPage } from "@/features/auth/auth-pages";
import { usePageLocale, type LocalePageProps } from "@/i18n/page";

export default function Page({ params }: LocalePageProps) {
  usePageLocale(params);
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}
