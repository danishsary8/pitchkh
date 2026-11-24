"use client";

import { useEffect, useRef, useState } from "react";

const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);

/**
 * Shows a number that rolls from its previous value to the new one, so a
 * changing price is noticed. First render shows the value as is (no motion on
 * load), and people who prefer reduced motion see plain updates. Plain
 * requestAnimationFrame: Price is on most pages, so no animation library here.
 */
export function CountUp({ value, format, duration = 450 }: { value: number; format: (n: number) => string; duration?: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    from.current = value;
    if (start === value) return;
    // Reduced motion: jump straight to the new value on the next frame.
    const length = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : duration;
    let frame = 0;
    const t0 = performance.now();
    const tick = (now: number): void => {
      const p = length === 0 ? 1 : Math.min(1, (now - t0) / length);
      setShown(Math.round((start + (value - start) * easeOut(p)) * 100) / 100);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  return <>{format(shown)}</>;
}
