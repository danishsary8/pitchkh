"use client";

import { useEffect, useRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Scroll-reveal and staggered lists in plain CSS (see globals.css).
 * These run on every page, so they deliberately avoid the animation library:
 * it only loads on the screens that need springs or exit animations.
 */

/**
 * Fades and rises once when the block scrolls into view. The server HTML is
 * fully visible; only blocks that start below the fold are hidden after
 * hydration, so nothing can stay invisible if JavaScript fails.
 */
export function Reveal({ children, delay = 0, className, ...props }: { children: ReactNode; delay?: number } & HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
    el.dataset.reveal = "pending";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        el.dataset.reveal = "shown";
        observer.disconnect();
      },
      { rootMargin: "0px 0px -60px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className={cn("reveal", className)} style={delay ? { transitionDelay: `${Math.round(delay * 1000)}ms` } : undefined} {...props}>
      {children}
    </div>
  );
}

/** Children rise in one after another (45ms apart, first 12 staggered). */
export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("stagger", className)}>{children}</div>;
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}
