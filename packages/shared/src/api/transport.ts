export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type QueryValue = string | number | boolean | null | undefined;

export interface ApiRequest {
  method: HttpMethod;
  /** Path relative to the API base, e.g. "/venues/abc" */
  path: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  /** Skip the Authorization header (login, refresh). */
  anonymous?: boolean;
}

/**
 * A transport sends one request and resolves with the parsed JSON body or
 * rejects with an ApiError. There are two: the HTTP client ("real" mode) and
 * the in-memory mock server ("mock" mode). Api services only know this type.
 */
export type Transport = <T>(request: ApiRequest) => Promise<T>;

export function buildQuery(query?: Record<string, QueryValue>): string {
  if (!query) return "";
  const parts: string[] = [];
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
}
