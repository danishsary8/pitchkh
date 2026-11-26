"use client";

import { SPORTS, VENUE_SORTS, type VenueSort } from "@pitchkh/shared";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { List, Map as MapIcon, Search, SearchX, SlidersHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { SportIcon } from "@/components/brand/pitch-art";
import { Container, PageHeader } from "@/components/common/page";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Stagger, StaggerItem } from "@/components/common/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/misc";
import { api } from "@/lib/api";
import { useDates } from "@/lib/format";
import { qk } from "@/lib/query";
import { cn } from "@/lib/utils";
import { useVenueText } from "./text";
import { useVenueFilters } from "./use-venue-filters";
import { VenueCard, VenueCardSkeleton } from "./venue-card";
import { VenueFilterFields } from "./venue-filters";
import { venuesToPins } from "./map-pins";

/** "Free tonight" = free for the usual length of a game from 7pm today. */
const TONIGHT = "19:00";

const VenuesMap = dynamic(() => import("./venues-map"), { ssr: false, loading: () => <Skeleton className="size-full rounded-none" /> });

export function VenuesBrowse() {
  const t = useTranslations();
  const dates = useDates();
  const text = useVenueText();
  const { filters, setFilters, query, activeCount } = useVenueFilters(dates.today);
  const tonight = filters.date === dates.today && filters.from === TONIGHT;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [search, setSearch] = useState(filters.q);
  const [activePin, setActivePin] = useState<string | null>(null);

  // Debounce typing so we search once the user pauses.
  useEffect(() => {
    if (search === filters.q) return;
    const timer = window.setTimeout(() => setFilters({ q: search }), 350);
    return () => window.clearTimeout(timer);
  }, [search, filters.q, setFilters]);

  // "Show more" appends the next page, so phones scroll one list instead of paging.
  const { data, isPending, isError, error, refetch, isPlaceholderData, hasNextPage, fetchNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: [...qk.venues(query), "infinite"],
    queryFn: ({ pageParam }) => api.venues.list({ ...query, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });
  const venues = data?.pages.flatMap((p) => p.data) ?? [];
  const total = data?.pages[0]?.meta.total ?? 0;
  const clear = (): void => {
    setSearch("");
    setFilters({ q: "", sport: null, province: null, district: null, maxPrice: null, date: null, from: null });
  };
  const activeVenue = venues.find((v) => v.id === activePin);

  const results = isPending ? (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy aria-label={t("common.loading")}>
      {Array.from({ length: 6 }, (_, i) => <VenueCardSkeleton key={i} />)}
    </div>
  ) : isError ? (
    <ErrorState error={error} onRetry={() => void refetch()} />
  ) : venues.length === 0 ? (
    <EmptyState icon={<SearchX />} title={t("venues.emptyTitle")} body={t("venues.emptyBody")}>
      {/* A full evening is the usual dead end: offer to drop just the time, keeping sport and area. */}
      <div className="flex flex-wrap justify-center gap-2">
        {filters.date ? <Button onClick={() => setFilters({ date: null, from: null })}>{t("venues.anyTime")}</Button> : null}
        <Button variant={filters.date ? "secondary" : "default"} onClick={clear}>{t("venues.clearFilters")}</Button>
      </div>
    </EmptyState>
  ) : (
    <>
      <Stagger key={JSON.stringify(query)} className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 transition-opacity duration-200", filters.view === "map" ? "xl:grid-cols-2" : "xl:grid-cols-3", isPlaceholderData && "opacity-60")}>
        {venues.map((venue, i) => (
          <StaggerItem key={venue.id}>
            <VenueCard venue={venue} priority={i < 2} className="h-full" layout="auto" />
          </StaggerItem>
        ))}
      </Stagger>
      {filters.view === "list" && hasNextPage ? (
        <div className="flex flex-col items-center gap-2 pt-6">
          <p className="text-sm text-muted-foreground">{t("venues.shownOf", { shown: venues.length, total })}</p>
          <Button variant="secondary" className="min-w-44" disabled={isFetchingNextPage} onClick={() => void fetchNextPage()}>
            {isFetchingNextPage ? <Spinner /> : null}
            {t("common.seeMore")}
          </Button>
        </div>
      ) : null}
    </>
  );

  return (
    <Container>
      <PageHeader title={t("venues.title")} subtitle={t("venues.subtitle")} />

      <div className="sticky top-(--header-h) z-20 -mx-4 flex flex-col gap-2 bg-background px-4 pb-3 lg:static lg:mx-0 lg:px-0">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input type="search" inputMode="search" enterKeyHint="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("venues.searchPlaceholder")} aria-label={t("venues.searchPlaceholder")} className="pl-10" />
          </div>
          <Button variant="secondary" className="h-12 shrink-0 px-4 lg:hidden" onClick={() => setSheetOpen(true)} aria-haspopup="dialog">
            <SlidersHorizontal />
            <span className="max-[380px]:sr-only">{t("venues.filters")}</span>
            {activeCount > 0 ? <Badge variant="default" className="font-num px-2 py-0.5">{activeCount}</Badge> : null}
          </Button>
        </div>
        {/* Phones: the two questions most people start with, one tap each. Desktop has the sidebar. */}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] lg:hidden" role="group" aria-label={t("venues.filterSport")}>
          {([null, ...SPORTS] as const).map((sport) => (
            <button key={sport ?? "all"} type="button" aria-pressed={filters.sport === sport} onClick={() => setFilters({ sport })} className="press flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-secondary px-3.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-primary aria-pressed:text-primary-foreground">
              {sport ? <SportIcon sport={sport} className="size-4" /> : null}
              {sport ? t(`sport.${sport}`) : t("common.all")}
            </button>
          ))}
          <button type="button" aria-pressed={tonight} onClick={() => setFilters(tonight ? { date: null, from: null } : { date: dates.today, from: TONIGHT })} className="press flex h-9 shrink-0 items-center rounded-full border-2 border-primary/30 px-3.5 text-sm font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground">
            {t("venues.freeTonight")}
          </button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-sm text-muted-foreground" aria-live="polite">
            {isPending ? t("common.loading") : t("venues.resultCount", { count: total })}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Select aria-label={t("venues.sortBy")} value={filters.sort} onChange={(e) => setFilters({ sort: e.target.value as VenueSort })} className="h-10 w-auto rounded-full py-0 pr-9 pl-3.5 text-sm font-semibold">
              {VENUE_SORTS.map((sort) => (
                <option key={sort} value={sort}>{t(`venues.sort.${sort}`)}</option>
              ))}
            </Select>
            <div className="flex rounded-full bg-secondary p-1" role="group" aria-label={t("venues.viewMode")}>
              {(["list", "map"] as const).map((view) => (
                <button key={view} type="button" aria-pressed={filters.view === view} onClick={() => setFilters({ view })} className="grid h-8 w-10 place-items-center rounded-full text-muted-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-card aria-pressed:text-foreground" aria-label={t(`venues.view.${view}`)}>
                  {view === "list" ? <List className="size-4.5" /> : <MapIcon className="size-4.5" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-8 pt-1">
        <aside className="hidden w-72 shrink-0 lg:block" aria-label={t("venues.filters")}>
          <div className="sticky top-24 flex flex-col gap-5 rounded-2xl bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{t("venues.filters")}</h2>
              {activeCount > 0 ? (
                <Button variant="link" size="sm" className="h-auto p-0" onClick={clear}>
                  {t("venues.clearFilters")}
                </Button>
              ) : null}
            </div>
            <VenueFilterFields filters={filters} onChange={setFilters} idPrefix="side" />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <h2 className="sr-only">{t("venues.results")}</h2>
          {filters.view === "map" ? (
            <div className="flex flex-col gap-4 xl:flex-row-reverse">
              <div className="relative isolate h-[58dvh] overflow-hidden rounded-2xl bg-muted xl:sticky xl:top-24 xl:h-[calc(100dvh-8rem)] xl:flex-1">
                <VenuesMap pins={venuesToPins(venues, text.name)} activeId={activePin ?? undefined} onOpen={(pin) => setActivePin(pin.id)} />
                {activeVenue ? (
                  <div key={activeVenue.id} className="absolute inset-x-3 bottom-3 z-[1000] mx-auto max-w-sm animate-page-in">
                    <VenueCard venue={activeVenue} className="shadow-xl [&>div:first-child]:aspect-[16/7]" />
                    <button type="button" onClick={() => setActivePin(null)} aria-label={t("common.close")} className="absolute -top-3 -left-2 z-20 grid size-9 place-items-center rounded-full bg-foreground text-background">
                      <X className="size-4.5" />
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="xl:w-[26rem] xl:shrink-0">{results}</div>
            </div>
          ) : (
            results
          )}
        </div>
      </div>

      <Sheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={t("venues.filters")}
        footer={
          <>
            <Button variant="secondary" onClick={clear} disabled={activeCount === 0}>
              {t("venues.clearFilters")}
            </Button>
            <Button onClick={() => setSheetOpen(false)}>{t("venues.showResults", { count: total })}</Button>
          </>
        }
      >
        <VenueFilterFields filters={filters} onChange={setFilters} idPrefix="sheet" />
      </Sheet>
    </Container>
  );
}
