"use client";

import { useCallback, useSyncExternalStore } from "react";

/** SSR-safe media query hook (false on the server, real value after hydration). */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

const noop = () => () => undefined;
/** True once the component runs in the browser (for client-only UI such as theme icons). */
export function useIsClient(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}
