import { hasLocale, type Locale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { use } from "react";
import { routing } from "./routing";

export interface LocalePageProps {
  params: Promise<{ locale: string }>;
}

/** Call first in every page: validates the locale and enables static rendering. */
export function usePageLocale(params: Promise<{ locale: string }>): Locale {
  const { locale } = use(params);
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return locale;
}
