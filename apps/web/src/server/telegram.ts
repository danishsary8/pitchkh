import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export interface TelegramUser {
  id: string;
  firstName: string;
  lastName: string | null;
  username: string | null;
}

/** Seconds a Mini App session stays valid for staff actions. */
const ADMIN_MAX_AGE = 24 * 60 * 60;

export type InitDataResult = { ok: true; user: TelegramUser } | { ok: false; reason: "missing" | "no_token" | "malformed" | "bad_signature" | "expired" | "no_user" };

export function inspectInitData(initData: string, botToken: string, maxAgeSeconds: number, now: number = Date.now()): InitDataResult {
  if (!initData) return { ok: false, reason: "missing" };
  if (!botToken) return { ok: false, reason: "no_token" };
  if (initData.length > 4096) return { ok: false, reason: "malformed" };
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash || !/^[0-9a-f]{64}$/.test(hash)) return { ok: false, reason: "malformed" };
  params.delete("hash");
  const checkString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expected = createHmac("sha256", secret).update(checkString).digest();
  if (!timingSafeEqual(expected, Buffer.from(hash, "hex"))) return { ok: false, reason: "bad_signature" };

  const authDate = Number(params.get("auth_date"));
  if (!Number.isFinite(authDate) || now / 1000 - authDate > maxAgeSeconds) return { ok: false, reason: "expired" };
  try {
    const user = JSON.parse(params.get("user") ?? "null") as { id?: number; first_name?: string; last_name?: string; username?: string } | null;
    if (!user?.id) return { ok: false, reason: "no_user" };
    return { ok: true, user: { id: String(user.id), firstName: user.first_name ?? "", lastName: user.last_name ?? null, username: user.username ?? null } };
  } catch {
    return { ok: false, reason: "no_user" };
  }
}

/**
 * Checks the `initData` string Telegram gives a Mini App. It is signed with
 * the bot token, so a valid one proves who the user is without any login.
 * See https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function verifyInitData(initData: string, botToken: string, maxAgeSeconds: number, now: number = Date.now()): TelegramUser | null {
  const result = inspectInitData(initData, botToken, maxAgeSeconds, now);
  return result.ok ? result.user : null;
}

/** Logs why an identity was rejected (never the data itself), so problems are visible in Vercel's logs. */
function checked(request: Request, maxAgeSeconds: number, where: string): TelegramUser | null {
  const raw = request.headers.get("x-telegram-init-data") ?? "";
  const result = inspectInitData(raw, botToken(), maxAgeSeconds);
  if (result.ok) return result.user;
  if (result.reason !== "missing") console.error(JSON.stringify({ level: "warn", msg: "telegram_identity_rejected", where, reason: result.reason, length: raw.length }));
  return null;
}

const botToken = (): string => (process.env.TELEGRAM_BOT_TOKEN ?? "").trim();

/** The customer's Telegram identity, if the app was opened inside Telegram. Never required. */
export function customerFromRequest(request: Request): TelegramUser | null {
  return checked(request, 7 * ADMIN_MAX_AGE, "customer");
}

export const adminIds = (): Set<string> =>
  new Set(
    (process.env.ADMIN_TELEGRAM_IDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );

export type AdminCheck = { ok: true; user: TelegramUser | null } | { ok: false; reason: "not_in_telegram" | "not_admin" | "not_configured" };

/**
 * Staff screens are open only to the Telegram accounts in ADMIN_TELEGRAM_IDS.
 * On a developer's machine with no bot token set, they are open so the app can be tried locally.
 */
export function checkAdmin(request: Request): AdminCheck {
  const token = botToken();
  if (!token) {
    return process.env.NODE_ENV !== "production" ? { ok: true, user: null } : { ok: false, reason: "not_configured" };
  }
  const user = checked(request, ADMIN_MAX_AGE, "admin");
  if (!user) return { ok: false, reason: "not_in_telegram" };
  if (!adminIds().has(user.id)) return { ok: false, reason: "not_admin" };
  return { ok: true, user };
}

interface InlineButton {
  text: string;
  url?: string;
  web_app?: { url: string };
}

/** Sends a bot message. Best effort: failures are logged, never thrown. */
export async function sendMessage(chatId: string, text: string, buttons?: InlineButton[][]): Promise<void> {
  const token = botToken();
  if (!token) return;
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true, ...(buttons ? { reply_markup: { inline_keyboard: buttons } } : {}) }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) console.error(JSON.stringify({ level: "warn", msg: "telegram_send_failed", status: response.status, body: (await response.text()).slice(0, 200) }));
  } catch (error) {
    console.error(JSON.stringify({ level: "warn", msg: "telegram_send_error", error: String(error) }));
  }
}

export const escapeHtml = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
