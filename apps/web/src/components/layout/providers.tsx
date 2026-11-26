"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import dynamic from "next/dynamic";
import { useEffect, useState, type ReactNode } from "react";
import { TelegramMiniApp } from "@/features/telegram/mini-app";
import { usePathname } from "@/i18n/navigation";
import { makeQueryClient } from "@/lib/query";
import { completeTransition } from "@/lib/view-transition";

const Toaster = dynamic(() => import("@/components/ui/sonner").then((m) => m.Toaster), { ssr: false });

/**
 * Toasts only appear after someone does something, so the toast container is
 * mounted once the browser is idle instead of during hydration.
 */
function DeferredToaster() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((run: () => void) => window.setTimeout(run, 1200));
    const id = idle(() => setReady(true));
    return () => (window.cancelIdleCallback ?? window.clearTimeout)(id);
  }, []);
  return ready ? <Toaster /> : null;
}

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
          {children}
          <DeferredToaster />
          <RouteTransitionSignal />
          <ServiceWorker />
          <TelegramMiniApp />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
