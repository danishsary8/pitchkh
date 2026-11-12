"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/features/auth/auth-provider";
import { usePathname } from "@/i18n/navigation";
import { makeQueryClient } from "@/lib/query";
import { completeTransition } from "@/lib/view-transition";

/** Tells the view transition that the next route is on screen. */
function RouteTransitionSignal() {
  const pathname = usePathname();
  useEffect(() => {
    completeTransition();
  }, [pathname]);
  return null;
}

/** Registers the service worker (production only) for installability + the offline page. */
function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MotionConfig reducedMotion="user">
            {children}
            <Toaster />
            <RouteTransitionSignal />
            <ServiceWorker />
          </MotionConfig>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
