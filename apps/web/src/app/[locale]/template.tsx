"use client";

import { motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { isViewTransitionActive } from "@/lib/view-transition";

// The very first paint must show the server-rendered HTML untouched: animating
// it in would hide the content until JavaScript loads and wreck LCP on 4G.
let firstLoad = true;

/**
 * Page-enter transition for route changes after the first load. When the
 * browser is already running a View Transition for this navigation, the page
 * appears instantly and the browser's crossfade does the work instead.
 */
export default function Template({ children }: { children: ReactNode }) {
  const [skip] = useState(() => firstLoad || isViewTransitionActive());
  useEffect(() => {
    firstLoad = false;
  }, []);
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
