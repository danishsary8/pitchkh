import { use } from "react";
import { VenueDetail } from "@/features/venues/venue-detail";
import { usePageLocale } from "@/i18n/page";

export default function Page({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  usePageLocale(params);
  const { slug } = use(params);
  return <VenueDetail slug={slug} />;
}
