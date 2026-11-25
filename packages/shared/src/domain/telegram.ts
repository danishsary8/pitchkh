/**
 * Telegram deep links. No bot and no backend: links open the Telegram app
 * (or web.telegram.org) and the person sends the message themselves.
 */

const KH_CODE = "855";

/**
 * A Cambodian phone number as digits with the 855 country code, e.g.
 * "012 345 678" -> "85512345678". Null when it is too short to be a number.
 */
export function toKhInternational(phone: string): string | null {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = KH_CODE + digits.slice(1);
  else if (!digits.startsWith(KH_CODE)) digits = KH_CODE + digits;
  // 855 + 8 or 9 digit subscriber number.
  return digits.length >= KH_CODE.length + 8 ? digits : null;
}

/** Opens a Telegram chat with whoever owns this phone number. */
export function telegramChatUrl(phone: string): string | null {
  const number = toKhInternational(phone);
  return number ? `https://t.me/+${number}` : null;
}

/** Telegram's share screen: pick a chat or group, the link and message are filled in. */
export function telegramShareUrl(url: string, text: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}
