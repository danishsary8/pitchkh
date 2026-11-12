"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="top-center"
      offset={{ top: "calc(env(safe-area-inset-top) + 12px)" }}
      mobileOffset={{ top: "calc(env(safe-area-inset-top) + 12px)" }}
      toastOptions={{
        style: { borderRadius: "16px", fontFamily: "inherit", fontSize: "0.95rem", border: "none", background: "var(--foreground)", color: "var(--background)" },
        classNames: { description: "!text-current opacity-80", actionButton: "!bg-accent !text-accent-foreground !rounded-full !font-semibold" },
      }}
    />
  );
}
