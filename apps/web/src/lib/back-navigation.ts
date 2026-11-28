/**
 * Where "back" goes when there is no earlier page in this visit (the page was
 * opened from a link, a bot button or the home-screen icon). Pathnames are
 * without the locale prefix, as next-intl's usePathname returns them.
 */
export function parentOf(pathname: string): string | null {
  if (pathname === "/" || pathname === "") return null;
  // Every page today hangs off the home page (branches, staff, terms, privacy, credits).
  return "/";
}
