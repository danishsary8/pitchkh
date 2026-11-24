"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";

const COLORS = ["var(--primary)", "var(--accent)", "var(--krama)", "#ffffff", "var(--sport-tennis)"];

/**
 * A short, light confetti burst (30 small pieces, transform/opacity only).
 * Plays once on mount and renders nothing for people who prefer reduced motion.
 */
export function Confetti({ pieces = 30 }: { pieces?: number }) {
  const reduce = useReducedMotion();
  // Random values are fixed once per mount so re-renders don't restart the burst.
  const [bits] = useState(() =>
    Array.from({ length: pieces }, (_, i) => {
      const angle = (Math.PI * 2 * i) / pieces + Math.random() * 0.4;
      const distance = 90 + Math.random() * 110;
      return {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance * 0.7 - 40,
        fall: 140 + Math.random() * 120,
        rotate: (Math.random() - 0.5) * 720,
        color: COLORS[i % COLORS.length],
        wide: i % 3 === 0,
        delay: Math.random() * 0.08,
      };
    }),
  );
  if (reduce) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute top-14 left-1/2 z-20 size-0">
      {bits.map((b, i) => (
        <motion.span
          key={i}
          className="absolute block rounded-[2px]"
          style={{ width: b.wide ? 10 : 6, height: b.wide ? 5 : 9, background: b.color }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 0.4 }}
          animate={{ x: [0, b.x, b.x * 1.1], y: [0, b.y, b.y + b.fall], rotate: b.rotate, opacity: [1, 1, 0], scale: 1 }}
          transition={{ duration: 1.5, delay: 0.2 + b.delay, ease: [0.16, 1, 0.3, 1], times: [0, 0.35, 1] }}
        />
      ))}
    </div>
  );
}
