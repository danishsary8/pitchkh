import { use } from "react";
import { LayoutEditor } from "@/features/owner/layout-editor";
import { usePageLocale } from "@/i18n/page";

export default function Page({ params }: { params: Promise<{ locale: string; id: string }> }) {
  usePageLocale(params);
  const { id } = use(params);
  return <LayoutEditor venueId={id} />;
}
