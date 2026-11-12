import { WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { ReloadButton } from "@/components/common/reload-button";
import { EmptyState } from "@/components/common/states";
import { usePageLocale, type LocalePageProps } from "@/i18n/page";

export default function OfflinePage({ params }: LocalePageProps) {
  usePageLocale(params);
  const t = useTranslations("offline");
  return (
    <EmptyState icon={<WifiOff />} title={t("title")} body={t("body")} className="my-auto">
      <ReloadButton label={t("retry")} />
    </EmptyState>
  );
}
