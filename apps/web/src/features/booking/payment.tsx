"use client";

import { PAYMENT_METHODS, type PaymentIntent, type PaymentMethod } from "@pitchkh/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Banknote, CheckCircle2, QrCode, Smartphone, Wallet } from "lucide-react";
import { useNow, useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useErrorMessage } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/misc";
import { api } from "@/lib/api";
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

/**
 * Pays an online booking. The server made the payment (QR or app link); this
 * sheet shows it and polls until the provider confirms. With the sandbox
 * provider, "I've paid" stands in for the bank.
 */
export function PaymentSheet({ intent, open, onOpenChange, onPaid }: { intent: PaymentIntent; open: boolean; onOpenChange: (open: boolean) => void; onPaid: (intent: PaymentIntent) => void }) {
  const t = useTranslations("booking");
  const tp = useTranslations("payment");
  const money = useMoney();
  const errorMessage = useErrorMessage();
  const nowMs = useNow({ updateInterval: 1000 }).getTime();
  const { data } = useQuery({ queryKey: ["payment", intent.id], queryFn: () => api.bookings.payment(intent.id), initialData: intent, refetchInterval: open ? 2000 : false });
  const simulate = useMutation({ mutationFn: () => api.bookings.simulatePayment(intent.id), onError: (e) => toast.error(errorMessage(e)) });
  const current = simulate.data?.status === "paid" ? simulate.data : data;
  const done = current.status === "paid" && current.bookingStatus === "confirmed";
  useEffect(() => {
    if (done) onPaid(current);
  }, [done, current, onPaid]);

  const seconds = Math.max(0, Math.round((Date.parse(current.expiresAt) - nowMs) / 1000));
  const expired = current.status === "expired" || seconds === 0;
  const sandbox = current.provider === "sandbox";
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => !simulate.isPending && onOpenChange(next)}
      title={t("payWith", { method: tp(current.method) })}
      description={sandbox ? t("payDemo") : t("payReal")}
      footer={
        sandbox && !expired ? (
          <Button size="lg" onClick={() => simulate.mutate()} disabled={simulate.isPending || done} className="w-full">
            {simulate.isPending || done ? <Spinner /> : <CheckCircle2 />}
            {simulate.isPending || done ? t("confirming") : t("simulatePaid")}
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        {current.qrPayload ? (
          <div className="rounded-3xl bg-krama p-3">
            <p className="pb-2 text-sm font-bold tracking-wide text-white">KHQR</p>
            <MockQr seed={current.qrPayload} />
          </div>
        ) : (
          <div className="grid size-28 place-items-center rounded-3xl bg-secondary">{current.method === "aba" ? <Smartphone className="size-12 text-primary" /> : <Wallet className="size-12 text-primary" />}</div>
        )}
        <div>
          <p className="font-num text-4xl font-bold">{money.usd(current.amountUsd)}</p>
          <p className="font-num text-muted-foreground">{money.khr(current.amountUsd)}</p>
        </div>
        {current.deeplink && !expired ? (
          <Button asChild variant="secondary">
            <a href={current.deeplink}>{t("openApp", { method: tp(current.method) })}</a>
          </Button>
        ) : null}
        <p className="max-w-xs text-sm text-pretty text-muted-foreground">{t(current.method === "khqr" ? "scanHint" : "appHint", { method: tp(current.method) })}</p>
        {expired ? (
          <p className="rounded-xl bg-warning-surface px-3 py-2 text-sm font-semibold text-warning" role="alert">{t("paymentExpired")}</p>
        ) : (
          <p className="font-num flex items-center gap-2 text-sm font-semibold" aria-live="off">
            <Spinner className="size-3.5" />
            {t("waitingForPayment")} · {t("expiresIn", { time: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` })}
          </p>
        )}
      </div>
    </Sheet>
  );
}
