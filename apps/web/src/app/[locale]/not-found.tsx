import { Compass } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/components/common/link";
import { EmptyState } from "@/components/common/states";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const t = useTranslations("common");
  return (
    <EmptyState icon={<Compass />} title={t("notFoundTitle")} body={t("notFoundBody")} className="my-auto">
      <Button asChild>
        <Link href="/">{t("goHome")}</Link>
      </Button>
    </EmptyState>
  );
}
