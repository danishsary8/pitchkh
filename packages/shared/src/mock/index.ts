/**
 * Server-side reuse of the mock backend's pure parts: the demo seed and the
 * joins that turn rows into API shapes. apps/api imports this as
 * "@pitchkh/shared/mock". The web app never imports it (it loads the mock
 * server lazily through the api client).
 */
export { seedDb } from "./seed";
export type { MockDb, ReportRow, ReviewRow, FavoriteRow } from "./db";
export { parse, paginate, notFound } from "./server";
export { venueSummary, venueDetail, bookingDetail, reportOut, userName, type TimeWindow } from "./handlers/expand";
export { dayPoints, earns } from "./handlers/owner";
