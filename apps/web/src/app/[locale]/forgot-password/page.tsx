import { ForgotPasswordPage } from "@/features/auth/password-pages";
import { usePageLocale, type LocalePageProps } from "@/i18n/page";

export default function Page({ params }: LocalePageProps) {
  usePageLocale(params);
  return <ForgotPasswordPage />;
}
