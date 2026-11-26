"use client";

import { telegramLocale } from "@pitchkh/shared";
import { useLocale } from "next-intl";
import { useTheme } from "next-themes";
import Script from "next/script";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { getMiniApp } from "@/lib/telegram-webapp";

const LOCALE_PICKED = "pitchkh-tg-locale";
// Header and background colours per theme, matching --background in globals.css.
const COLORS = { light: "#f2f5ef", dark: "#07120e" } as const;

/**
 * Makes the site behave like a Telegram Mini App when it is opened from the
 * PitchKH bot: full height, Telegram's theme and language, and Telegram's own
 * back button. Renders nothing; outside Telegram it only loads the small script.
 */
export function TelegramMiniApp() {
  const [loaded, setLoaded] = useState(false);
  const { setTheme } = useTheme();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  // Start-up: ready, full height, theme, and the user's language on first open.
  useEffect(() => {
    const app = getMiniApp();
    if (!loaded || !app) return;
    document.documentElement.dataset.telegram = "true";
    app.ready();
    app.expand();
    const syncTheme = (): void => {
      setTheme(app.colorScheme);
      app.setHeaderColor(COLORS[app.colorScheme]);
      app.setBackgroundColor(COLORS[app.colorScheme]);
    };
    syncTheme();
    app.onEvent("themeChanged", syncTheme);

    try {
      if (!localStorage.getItem(LOCALE_PICKED)) {
        localStorage.setItem(LOCALE_PICKED, "1");
        const wanted = telegramLocale(app.initDataUnsafe.user?.language_code);
        if (wanted !== locale) router.replace(pathname, { locale: wanted });
      }
    } catch {
      // Storage blocked: keep the current language.
    }
    return () => app.offEvent("themeChanged", syncTheme);
    // Runs once when the script is ready; language and path are read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  // Telegram's back button on every page but the home page.
  const back = useCallback(() => router.back(), [router]);
  useEffect(() => {
    const app = getMiniApp();
    if (!loaded || !app) return;
    if (pathname === "/") app.BackButton.hide();
    else app.BackButton.show();
    app.BackButton.onClick(back);
    return () => app.BackButton.offClick(back);
  }, [loaded, pathname, back]);

  return <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" onReady={() => setLoaded(true)} />;
}
