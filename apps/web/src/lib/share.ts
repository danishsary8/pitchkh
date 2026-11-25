"use client";

import { telegramShareUrl as shareUrl } from "@pitchkh/shared";

export interface ShareContent {
  title: string;
  text: string;
  url: string;
}

/** Telegram's share link: opens the app (or web) with a chat picker. */
export function telegramShareUrl({ text, url }: ShareContent): string {
  return shareUrl(url, text);
}

/**
 * Shares through the phone's share sheet (which lists Telegram, Messenger...)
 * and falls back to Telegram's web share on desktops. Returns false if the
 * person closed the sheet.
 */
export async function shareGame(content: ShareContent): Promise<boolean> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share(content);
      return true;
    } catch {
      return false;
    }
  }
  window.open(telegramShareUrl(content), "_blank", "noopener,noreferrer");
  return true;
}
