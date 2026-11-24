"use client";

import type { PriceBreakdown } from "@pitchkh/shared";
import { useTranslations } from "next-intl";
import { CountUp } from "@/components/common/count-up";
import { useMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Itemised price: every line the player pays for, then the total in USD and KHR. */
export function PriceLines({ price, className }: { price: PriceBreakdown; className?: string }) {
  const t = useTranslations("booking");
  const money = useMoney();
  return (
    <dl className={cn("flex flex-col gap-2 text-[0.95rem]", className)}>
      {price.lines.map((line) => (
        <div key={line.key} className="flex items-baseline justify-between gap-4">
          <dt className="text-muted-foreground">
            {t(`line.${line.key}`)}
            {line.key !== "service_fee" && line.key !== "weekend" && line.key !== "ball" && line.key !== "bibs" ? (
              <span className="font-num"> · {line.key === "water" ? `${line.quantity} × ${money.usd(line.unitUsd)}` : `${t("hoursShort", { count: line.quantity })} × ${money.usd(line.unitUsd)}`}</span>
            ) : null}
          </dt>
          <dd className="font-num font-semibold">{money.usd(line.amountUsd)}</dd>
        </div>
      ))}
      <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-dashed border-foreground/25 pt-3">
        <dt className="text-base font-bold">{t("total")}</dt>
        <dd className="text-right">
          <span className="font-num block text-2xl leading-none font-bold"><CountUp value={price.totalUsd} format={money.usd} /></span>
          <span className="font-num text-sm text-muted-foreground"><CountUp value={price.totalUsd} format={money.khr} /></span>
        </dd>
      </div>
    </dl>
  );
}
