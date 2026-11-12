"use client";

import { motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { isViewTransitionActive } from "@/lib/view-transition";

/**
 * Page-enter transition for every route change. When the browser is already
 * running a View Transition for this navigation, the page appears instantly
 * and the browser's crossfade does the work instead (no double animation).
 */
export default function Template({ children }: { children: ReactNode }) {
  const [skip] = useState(isViewTransitionActive);
  return (
    <motion.div
      className="flex flex-1 flex-col"
      initial={skip ? false : { opacity: 0, transform: "translateY(8px)" }}
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
    >
      {children}
    </motion.div>
  );
}
