"use client";

import { addDays, DISTRICTS, minutesOf, PROVINCES, SPORTS, timeOf, VENUE_SORTS, type Province, type Sport, type VenueListQuery, type VenueSort } from "@pitchkh/shared";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";

export interface VenueFilters {
  q: string;
  sport: Sport | null;
  province: Province | null;
  district: string | null;
  maxPrice: number | null;
  date: string | null;
  from: string | null;
  /** Minutes: 60, 90 or 120. */
  duration: number;
  sort: VenueSort;
  view: "list" | "map";
}

const oneOf = <T extends string>(list: readonly T[], value: string | null): T | null => (value && (list as readonly string[]).includes(value) ? (value as T) : null);

/** Filters live in the URL, so a search can be shared, bookmarked and survives the back button. */
export function useVenueFilters(today: string) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = useMemo<VenueFilters>(() => {
    const province = oneOf(PROVINCES, params.get("province"));
    const district = params.get("district");
    const date = params.get("date");
    const from = params.get("from");
    return {
      q: params.get("q") ?? "",
      sport: oneOf(SPORTS, params.get("sport")),
      province,
      district: province && district && DISTRICTS[province].includes(district) ? district : null,
      maxPrice: Number(params.get("max")) || null,
      date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= today && date <= addDays(today, 30) ? date : null,
      from: from && /^\d{2}:\d{2}$/.test(from) ? from : null,
      duration: [60, 90, 120].includes(Number(params.get("dur"))) ? Number(params.get("dur")) : 60,
      sort: oneOf(VENUE_SORTS, params.get("sort")) ?? "recommended",
      view: params.get("view") === "map" ? "map" : "list",
    };
  }, [params, today]);

  const setFilters = useCallback(
    (patch: Partial<VenueFilters>) => {
      const next = { ...filters, ...patch };
      if (patch.province !== undefined && patch.province !== filters.province) next.district = null;
      const search = new URLSearchParams();
      const put = (key: string, value: string | number | null, skip?: string | number): void => {
        if (value !== null && value !== "" && value !== skip) search.set(key, String(value));
      };
      put("q", next.q.trim());
      put("sport", next.sport);
      put("province", next.province);
      put("district", next.district);
      put("max", next.maxPrice);
      put("date", next.date);
      put("from", next.date ? next.from : null);
      put("dur", next.date && next.from ? next.duration : null, 60);
      put("sort", next.sort, "recommended");
      put("view", next.view, "list");
      const qs = search.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [filters, pathname, router],
  );

  /** The same filters as API query params. The list loads more pages on demand ("Show more"); the map gets one big page. */
  const query = useMemo<VenueListQuery>(() => {
    const window = filters.date && filters.from ? { date: filters.date, from: filters.from, to: timeOf(Math.min(24 * 60, minutesOf(filters.from) + filters.duration)) } : {};
    return {
      q: filters.q || undefined,
      sport: filters.sport ?? undefined,
      province: filters.province ?? undefined,
      district: filters.district ?? undefined,
      maxPrice: filters.maxPrice ?? undefined,
      ...window,
      sort: filters.sort,
      pageSize: filters.view === "map" ? 50 : 12,
    };
  }, [filters]);

  const activeCount = [filters.sport, filters.province, filters.district, filters.maxPrice, filters.date].filter(Boolean).length;
  return { filters, setFilters, query, activeCount };
}
