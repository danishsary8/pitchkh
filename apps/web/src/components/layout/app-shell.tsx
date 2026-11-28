"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { Link } from "@/components/common/link";
import { BackButton } from "./back-button";
import { LocaleToggle, ThemeToggle } from "./controls";

function Header() {
  return (
    <header className="pt-safe sticky top-0 z-40 bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/85">
      <div className="mx-auto flex h-(--header-h) w-full max-w-6xl items-center gap-2 px-4 lg:h-16 lg:px-6">
        <BackButton />
        <Link href="/" aria-label="PitchKH" className="mr-auto rounded-lg">
          <Wordmark />
        </Link>
        <LocaleToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations("common");
  return (
    <>
      <a href="#main" className="sr-only z-50 rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        {t("skipToContent")}
      </a>
      <Header />
      <main id="main" className="flex min-h-[calc(100dvh-var(--header-h))] flex-col pb-8">
        {children}
      </main>
    </>
  );
}
