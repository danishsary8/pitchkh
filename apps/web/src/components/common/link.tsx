"use client";

import type { ComponentProps, MouseEvent } from "react";
import { useCallback } from "react";
import { Link as IntlLink, useRouter } from "@/i18n/navigation";
import { navigateWithTransition } from "@/lib/view-transition";

type LinkProps = Omit<ComponentProps<typeof IntlLink>, "href"> & { href: string };

/** Locale-aware link that animates the route change. Use this everywhere instead of next/link. */
export function Link({ href, onClick, replace, scroll, ...props }: LinkProps) {
  const router = useRouter();
  const handleClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);
      const plainClick = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
      if (event.defaultPrevented || !plainClick || props.target === "_blank" || href.startsWith("http")) return;
      event.preventDefault();
      navigateWithTransition(() => (replace ? router.replace(href, { scroll }) : router.push(href, { scroll })));
    },
    [href, onClick, props.target, replace, router, scroll],
  );
  return <IntlLink href={href} onClick={handleClick} replace={replace} scroll={scroll} {...props} />;
}

/** Programmatic navigation with the same transition. */
export function useNavigate(): (href: string, options?: { replace?: boolean }) => void {
  const router = useRouter();
  return useCallback((href, options) => navigateWithTransition(() => (options?.replace ? router.replace(href) : router.push(href))), [router]);
}
