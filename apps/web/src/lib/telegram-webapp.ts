"use client";

/**
 * The parts of Telegram's Mini App API (telegram-web-app.js) this app uses.
 * Outside Telegram `getMiniApp()` returns null and every caller falls back to
 * normal web behaviour.
 */
interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface BottomButton {
  show(): void;
  hide(): void;
  onClick(cb: () => void): void;
  offClick(cb: () => void): void;
}

export interface MiniApp {
  initData: string;
  initDataUnsafe: { user?: TelegramUser; start_param?: string };
  colorScheme: "light" | "dark";
  ready(): void;
  expand(): void;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  openTelegramLink(url: string): void;
  openLink(url: string): void;
  onEvent(event: "themeChanged", cb: () => void): void;
  offEvent(event: "themeChanged", cb: () => void): void;
  BackButton: BottomButton;
  HapticFeedback?: { impactOccurred(style: "light" | "medium"): void };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: MiniApp };
  }
}

/** The Mini App bridge when the page is open inside Telegram, otherwise null. */
export function getMiniApp(): MiniApp | null {
  if (typeof window === "undefined") return null;
  const app = window.Telegram?.WebApp;
  // The script also loads in a normal browser; initData is only set inside Telegram.
  return app && app.initData ? app : null;
}

const INIT_KEY = "pitchkh-tg-init";

/** Pulls `tgWebAppData` out of a launch string such as Telegram's URL fragment. */
function fromLaunchParams(raw: string | null | undefined): string {
  if (!raw) return "";
  try {
    return new URLSearchParams(raw.replace(/^#/, "")).get("tgWebAppData") ?? "";
  } catch {
    return "";
  }
}

/**
 * Telegram opens the Mini App with the signed identity in the URL fragment
 * (#tgWebAppData=...). Read it the moment this module loads, before any page
 * navigation can drop the fragment, and keep it for this tab.
 */
if (typeof window !== "undefined") {
  const launched = fromLaunchParams(window.location.hash);
  if (launched) {
    try {
      sessionStorage.setItem(INIT_KEY, launched);
    } catch {
      // Storage blocked: the script's own copy is still used below.
    }
  }
}

/**
 * The signed identity to send to our server, or "" outside Telegram. Does not
 * wait for telegram-web-app.js: it also reads the launch fragment and the
 * copies kept in session storage (ours and Telegram's own).
 */
export function telegramInitData(): string {
  if (typeof window === "undefined") return "";
  const fromScript = window.Telegram?.WebApp?.initData;
  if (fromScript) return fromScript;
  const fromHash = fromLaunchParams(window.location.hash);
  if (fromHash) return fromHash;
  try {
    const kept = sessionStorage.getItem(INIT_KEY);
    if (kept) return kept;
    const theirs = JSON.parse(sessionStorage.getItem("__telegram__initParams") ?? "null") as Record<string, string> | null;
    return theirs?.tgWebAppData ?? "";
  } catch {
    return "";
  }
}

/** "Dara Sok (@dara)" for booking messages, or null outside Telegram. */
export function telegramDisplayName(): string | null {
  const user = getMiniApp()?.initDataUnsafe.user;
  if (!user) return null;
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
  return user.username ? `${name} (@${user.username})` : name;
}

/**
 * Opens a t.me link. Inside Telegram it stays in the app (a plain link would
 * leave for the browser); returns false outside Telegram so the <a> handles it.
 */
export function openTelegramLink(url: string): boolean {
  const app = getMiniApp();
  if (!app) return false;
  app.openTelegramLink(url);
  return true;
}
