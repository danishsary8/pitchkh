import { defineRouting } from "next-intl/routing";
import { LOCALES } from "@pitchkh/shared";

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: "en",
  localePrefix: "always",
});
