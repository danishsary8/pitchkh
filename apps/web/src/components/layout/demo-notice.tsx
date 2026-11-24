"use client";

import { STORAGE_KEYS } from "@pitchkh/shared";
import { FlaskConical, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { isDemo } from "@/lib/api";

/**
 * Public demo only (mock API): says the data is sample data and payments are
 * simulated, and lets a visitor start over. Scrolls away with the page.
 */
export function DemoNotice() {
  const t = useTranslations("demo");
  if (!isDemo) return null;
  const reset = (): void => {
    try {
      window.localStorage.removeItem(STORAGE_KEYS.mockDb);
      window.localStorage.removeItem(STORAGE_KEYS.session);
    } catch {
      // Storage blocked: a reload still starts from fresh in-memory data.
    }
    window.location.reload();
  };
  return (
    <div data-demo-notice className="pt-safe bg-secondary text-secondary-foreground">
      <div className="mx-auto flex min-h-11 w-full max-w-7xl items-center gap-2 px-4 text-xs lg:px-6">
        <FlaskConical className="size-4 shrink-0 text-primary" aria-hidden />
        <p className="min-w-0 flex-1 leading-snug">{t("notice")}</p>
        <button type="button" onClick={reset} className="press -mr-2 flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3 font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <RotateCcw className="size-3.5" aria-hidden />
          {t("reset")}
        </button>
      </div>
    </div>
  );
}
