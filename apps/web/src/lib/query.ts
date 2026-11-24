import { isApiError, type BookingListQuery, type MatchListQuery, type OwnerBookingListQuery, type ReviewListQuery, type VenueListQuery } from "@pitchkh/shared";
import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        // Retrying a 4xx never helps; retry flaky networks twice.
        retry: (count, error) => (isApiError(error) && error.status >= 400 && error.status < 500 ? false : count < 2),
      },
    },
  });
}

/** Central query keys so invalidation stays consistent across features. */
export const qk = {
  venues: (params?: VenueListQuery) => ["venues", "list", params ?? {}] as const,
  venue: (idOrSlug: string) => ["venues", "detail", idOrSlug] as const,
  availability: (fieldId: string, date: string) => ["availability", fieldId, date] as const,
  venueAvailability: (venueId: string, date: string) => ["availability", "venue", venueId, date] as const,
  weather: (province: string, date: string) => ["weather", province, date] as const,
  reviews: (params?: ReviewListQuery) => ["reviews", params ?? {}] as const,
  bookings: (params?: BookingListQuery) => ["bookings", "list", params ?? {}] as const,
  booking: (id: string) => ["bookings", "detail", id] as const,
  matches: (params?: MatchListQuery) => ["matches", "list", params ?? {}] as const,
  match: (id: string) => ["matches", "detail", id] as const,
  team: (id: string) => ["teams", id] as const,
  myTeam: ["me", "team"] as const,
  conversations: ["conversations"] as const,
  conversation: (id: string) => ["conversations", id] as const,
  notifications: ["notifications"] as const,
  owner: {
    venues: ["owner", "venues"] as const,
    bookings: (params?: OwnerBookingListQuery) => ["owner", "bookings", params ?? {}] as const,
    schedule: (venueId: string, date: string) => ["owner", "schedule", venueId, date] as const,
    earnings: ["owner", "earnings"] as const,
    telegram: ["owner", "telegram"] as const,
  },
  admin: {
    analytics: ["admin", "analytics"] as const,
    venues: (params?: object) => ["admin", "venues", params ?? {}] as const,
    users: (params?: object) => ["admin", "users", params ?? {}] as const,
    reports: (params?: object) => ["admin", "reports", params ?? {}] as const,
  },
};
