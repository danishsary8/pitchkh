import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const messages = locale === "km" ? (await import("@pitchkh/shared/i18n/km.json")).default : (await import("@pitchkh/shared/i18n/en.json")).default;
  return { locale, messages, timeZone: "Asia/Phnom_Penh" };
});
