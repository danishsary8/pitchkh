export const API_ERROR_CODES = [
  "validation_failed",
  "invalid_credentials",
  "unauthorized",
  "token_expired",
  "forbidden",
  "not_found",
  "conflict",
  "slot_unavailable",
  "outside_booking_window",
  "cancellation_window_passed",
  "email_taken",
  "account_suspended",
  "network_error",
  "server_error",
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/** Field name -> list of problems, as returned by the API for 422 responses. */
export type ApiErrorDetails = Record<string, string[]>;

/** The only error type api services throw. UI code can switch on `code`. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details?: ApiErrorDetails;

  constructor(status: number, code: ApiErrorCode, message: string, details?: ApiErrorDetails) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

const STATUS_TO_CODE: Record<number, ApiErrorCode> = {
  400: "validation_failed",
  401: "unauthorized",
  403: "forbidden",
  404: "not_found",
  409: "conflict",
  422: "validation_failed",
};

/** Maps any HTTP error response body onto a typed ApiError. */
export function toApiError(status: number, body: unknown): ApiError {
  const fallback = STATUS_TO_CODE[status] ?? "server_error";
  if (typeof body === "object" && body !== null && "error" in body) {
    const e = (body as { error: { code?: unknown; message?: unknown; details?: unknown } }).error;
    const code = (API_ERROR_CODES as readonly string[]).includes(String(e.code)) ? (e.code as ApiErrorCode) : fallback;
    const message = typeof e.message === "string" ? e.message : `Request failed (${status})`;
    return new ApiError(status, code, message, e.details as ApiErrorDetails | undefined);
  }
  return new ApiError(status, fallback, `Request failed (${status})`);
}
