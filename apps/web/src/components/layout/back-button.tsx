"use client";

import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { parentOf } from "@/lib/back-navigation";

/**
 * True once the visitor has moved between pages in this visit. Kept outside React so it
 * survives page changes; a full reload (or opening from the home-screen icon) starts at false.
 */
let movedInsideApp = false;
let firstPath: string | null = null;

/**
 * Back arrow for every page but home. An app saved to the iPhone home screen has no browser
 * bar, so this is the only way back. It returns to the previous page of this visit, or to the
 * page's parent when there is none, so it never leaves the app. Inside Telegram it is hidden:
 * Telegram shows its own back button (see features/telegram/mini-app.tsx).
 */
export function BackButton() {
  const t = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (firstPath === null) firstPath = pathname;
    else if (pathname !== firstPath) movedInsideApp = true;
  }, [pathname]);

  const parent = parentOf(pathname);
  if (!parent) return null;

  const goBack = () => {
    if (movedInsideApp && window.history.length > 1) router.back();
    else router.push(parent);
  };

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label={t("back")}
      className="press -ml-1.5 grid size-10 shrink-0 place-items-center rounded-full text-foreground outline-none hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring app-back"
    >
      <ChevronLeft className="size-6" strokeWidth={2.4} aria-hidden />
    </button>
  );
}
