import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Adds the /en or /km prefix and remembers the visitor's language.
export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|_next|_vercel|assets|sw.js|.*\\..*).*)"],
};
