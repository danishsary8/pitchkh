"use client";

import { useEffect, useState, type ReactNode } from "react";
import { isViewTransitionActive } from "@/lib/view-transition";

// The very first paint must show the server-rendered HTML untouched: animating
// it in would hide the content until JavaScript loads and hurt LCP on 4G.
let firstLoad = true;

/**
 * Page-enter transition for route changes after the first load (a CSS
 * animation, so no animation library is needed on every page). When the
 * browser is already running a View Transition for this navigation, the page
 * appears instantly and the browser's crossfade does the work instead.
 */
export default function Template({ children }: { children: ReactNode }) {
  const [animate] = useState(() => !firstLoad && !isViewTransitionActive());
  useEffect(() => {
    firstLoad = false;
  }, []);
  return <div className={animate ? "flex flex-1 animate-page-in flex-col" : "flex flex-1 flex-col"}>{children}</div>;
}
