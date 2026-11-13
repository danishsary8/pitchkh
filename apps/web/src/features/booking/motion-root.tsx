"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/** Makes every animation inside honour the user's reduced-motion setting. Only the booking screens load the animation library. */
export function MotionRoot({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
