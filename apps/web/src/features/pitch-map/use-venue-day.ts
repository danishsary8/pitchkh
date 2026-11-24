"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { qk } from "@/lib/query";

/**
 * Every field's slots for one day in a single request. Also fills each
 * field's own availability cache, so the slot grid opens instantly.
 */
export function useVenueDay(venueId: string | undefined, date: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: qk.venueAvailability(venueId ?? "", date),
    enabled: !!venueId,
    staleTime: 15_000,
    queryFn: async () => {
      const day = await api.venues.dayAvailability(venueId ?? "", date);
      for (const field of day.fields) queryClient.setQueryData(qk.availability(field.fieldId, date), field);
      return day;
    },
  });
}
