import type { Metadata, Viewport } from "next";
import { Archivo, Noto_Sans_Khmer } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Providers } from "@/components/layout/providers";
import { routing } from "@/i18n/routing";
import { siteUrl } from "@/lib/site";
import "../globals.css";

// One variable family does all the Latin work: width axis 62-125 gives the
// expanded display voice and the condensed numerals from a single download.
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });
const khmer = Noto_Sans_Khmer({ subsets: ["khmer"], variable: "--font-khmer", display: "swap", preload: false });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: hasLocale(routing.locales, locale) ? locale : "en", namespace: "meta" });
  return {
    metadataBase: new URL(siteUrl),
    title: { default: t("title"), template: `%s · PitchKH` },
    description: t("description"),
    applicationName: "PitchKH",
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, title: "PitchKH", statusBarStyle: "default" },
    formatDetection: { telephone: false },
    openGraph: { title: t("title"), description: t("description"), siteName: "PitchKH", type: "website", images: ["/assets/brand/og.png"] },
    alternates: { languages: { en: "/en", km: "/km" } },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f5ef" },
    { media: "(prefers-color-scheme: dark)", color: "#07120e" },
  ],
};

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    <html lang={locale} className={`${archivo.variable} ${khmer.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        <NextIntlClientProvider>
          <Providers>
            <AppShell>{children}</AppShell>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
