import { Suspense } from "react";
import { VenuesBrowse } from "@/features/venues/venues-browse";
import { usePageLocale, type LocalePageProps } from "@/i18n/page";

export default function Page({ params }: LocalePageProps) {
  usePageLocale(params);
  return (
    <Suspense>
      <VenuesBrowse />
    </Suspense>
  );
}
