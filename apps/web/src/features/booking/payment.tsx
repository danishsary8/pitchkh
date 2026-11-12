"use client";

import { PAYMENT_METHODS, type PaymentMethod } from "@pitchkh/shared";
import { Banknote, CheckCircle2, QrCode, Smartphone, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/misc";
import { useMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const ICONS: Record<PaymentMethod, typeof QrCode> = { khqr: QrCode, aba: Smartphone, wing: Wallet, cash: Banknote };

export function PaymentMethodPicker({ value, onChange }: { value: PaymentMethod; onChange: (method: PaymentMethod) => void }) {
  const t = useTranslations("payment");
  return (
    <div role="radiogroup" aria-label={t("khqr")} className="grid gap-2 sm:grid-cols-2">
      {PAYMENT_METHODS.map((method) => {
        const Icon = ICONS[method];
        const checked = value === method;
        return (
          <button key={method} type="button" role="radio" aria-checked={checked} onClick={() => onChange(method)} className={cn("press flex min-h-16 items-center gap-3 rounded-2xl border-2 bg-card p-3 text-left outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring", checked ? "border-primary" : "border-transparent")}>
            <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", checked ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground")}>
              <Icon className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">{t(method)}</span>
              <span className="block text-sm text-muted-foreground">{t(`${method}Hint`)}</span>
            </span>
            <span aria-hidden className={cn("grid size-5.5 shrink-0 place-items-center rounded-full border-2", checked ? "border-primary bg-primary text-primary-foreground" : "border-input")}>
              {checked ? <span className="size-2 rounded-full bg-current" /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** A QR-looking pattern (not a real KHQR payload: payments are mocked). */
function MockQr({ seed }: { seed: string }) {
  const cells = useMemo(() => {
    let h = 2166136261;
    const bits: boolean[] = [];
    for (let i = 0; i < 21 * 21; i++) {
      h ^= seed.charCodeAt(i % seed.length) + i;
      h = Math.imul(h, 16777619);
      bits.push(((h >>> 13) & 1) === 1);
    }
    return bits;
  }, [seed]);
  const finder = (x: number, y: number): boolean => (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
  const finderOn = (x: number, y: number): boolean => {
    const fx = x > 13 ? x - 14 : x;
    const fy = y > 13 ? y - 14 : y;
    return fx === 0 || fx === 6 || fy === 0 || fy === 6 || (fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4);
  };
  return (
    <svg viewBox="0 0 23 23" className="size-52 rounded-2xl bg-white p-2" role="img" aria-label="KHQR">
      {cells.map((on, i) => {
        const x = i % 21;
        const y = Math.floor(i / 21);
        const fill = finder(x, y) ? finderOn(x, y) : on;
        return fill ? <rect key={i} x={x + 1} y={y + 1} width="1" height="1" fill="#0c1f1a" /> : null;
      })}
    </svg>
  );
}

/** Simulated checkout for KHQR / ABA / Wing. Nothing is charged. */
export function PaymentSheet({ open, onOpenChange, method, totalUsd, reference, onPaid, pending }: { open: boolean; onOpenChange: (open: boolean) => void; method: PaymentMethod; totalUsd: number; reference: string; onPaid: () => void; pending: boolean }) {
  const t = useTranslations("booking");
  const tp = useTranslations("payment");
  const money = useMoney();
  const [seconds, setSeconds] = useState(180);
  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => {
      window.clearInterval(timer);
      setSeconds(180);
    };
  }, [open]);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => !pending && onOpenChange(next)}
      title={t("payWith", { method: tp(method) })}
      description={t("payDemo")}
      footer={
        <Button size="lg" onClick={onPaid} disabled={pending} className="w-full">
          {pending ? <Spinner /> : <CheckCircle2 />}
          {pending ? t("confirming") : t("simulatePaid")}
        </Button>
      }
    >
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        {method === "khqr" ? (
          <div className="rounded-3xl bg-krama p-3">
            <p className="pb-2 text-sm font-bold tracking-wide text-white">KHQR</p>
            <MockQr seed={reference} />
          </div>
        ) : (
          <div className="grid size-28 place-items-center rounded-3xl bg-secondary">{method === "aba" ? <Smartphone className="size-12 text-primary" /> : <Wallet className="size-12 text-primary" />}</div>
        )}
        <div>
          <p className="font-num text-4xl font-bold">{money.usd(totalUsd)}</p>
          <p className="font-num text-muted-foreground">{money.khr(totalUsd)}</p>
        </div>
        <p className="max-w-xs text-sm text-pretty text-muted-foreground">{t(method === "khqr" ? "scanHint" : "appHint", { method: tp(method) })}</p>
        <p className="font-num text-sm font-semibold" aria-live="off">
          {t("expiresIn", { time: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` })}
        </p>
      </div>
    </Sheet>
  );
}
