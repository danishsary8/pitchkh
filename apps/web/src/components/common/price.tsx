"use client";

import { useMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/** USD amount with its riel equivalent. Latin digits in both languages, as on Cambodian receipts. */
export function Price({ usd, className, khrClassName, stacked = false }: { usd: number; className?: string; khrClassName?: string; stacked?: boolean }) {
  const money = useMoney();
  return (
    <span className={cn("inline-flex items-baseline gap-x-1.5", stacked && "flex-col gap-0", className)}>
      <span className="font-num font-bold">{money.usd(usd)}</span>
      <span className={cn("font-num text-[0.8em] font-medium text-muted-foreground", khrClassName)}>{money.khr(usd)}</span>
    </span>
  );
}
