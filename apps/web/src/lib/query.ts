import { QueryClient } from "@tanstack/react-query";
import { HttpError } from "./client";

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        // Retrying a 4xx never helps; retry flaky networks twice.
        retry: (count, error) => (error instanceof HttpError && error.status >= 400 && error.status < 500 ? false : count < 2),
      },
    },
  });
}

export const qk = {
  taken: (branch: string, date: string) => ["taken", branch, date] as const,
  admin: (branch: string, date: string) => ["admin", branch, date] as const,
  adminMe: ["admin", "me"] as const,
};
