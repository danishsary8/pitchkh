"use client";

/**
 * The parts of Telegram's Mini App API (telegram-web-app.js) this app uses.
 * Outside Telegram `getMiniApp()` returns null and every caller falls back to
 * normal web behaviour.
 */
interface TelegramUser {
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
