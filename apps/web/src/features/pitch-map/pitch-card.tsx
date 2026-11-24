"use client";

import type { Field } from "@pitchkh/shared";
import { Box, Lightbulb, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { Price } from "@/components/common/price";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { FieldViewer } from "@/features/field3d/field-viewer";
import { cn } from "@/lib/utils";

/** Details of the picked pitch, with a "See in 3D" sheet. `action` adds a button (e.g. "Book this pitch"). */
export function PitchCard({ field, action, className, show3d = true }: { field: Field; action?: ReactNode; className?: string; show3d?: boolean }) {
  const t = useTranslations();
  const [viewer, setViewer] = useState(false);
  return (
    <div className={cn("flex flex-col gap-3 rounded-2xl bg-card p-4", className)} aria-live="polite">
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xl font-bold">{field.name}</h3>
          <Badge variant="outline" className="font-num">{field.format}</Badge>
          <Badge variant="secondary">{field.indoor ? t("common.indoor") : t("common.outdoor")}</Badge>
          {field.status === "maintenance" ? <Badge variant="warning">{t("status.field.maintenance")}</Badge> : null}
        </div>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {field.position ? (
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden />
              {field.position}
            </span>
          ) : null}
          <span>{t(`surface.${field.surface}`)}</span>
          <span>{t("common.players", { count: field.maxPlayers })}</span>
          {field.lit ? (
            <span className="flex items-center gap-1">
              <Lightbulb className="size-3.5" aria-hidden />
              {t("pitchMap.lit")}
            </span>
          ) : null}
        </p>
        <p className="text-sm">
          <Price usd={field.pricePerHourUsd} /> <span className="text-muted-foreground">/{t("venues.hr")}</span>
          {field.peakPricePerHourUsd !== field.pricePerHourUsd ? (
            <span className="text-muted-foreground">
              {" · "}
              {t("venue.peak")} <span className="font-num font-semibold text-foreground">${field.peakPricePerHourUsd}</span>
            </span>
          ) : null}
        </p>
      </div>
      {show3d || action ? (
        <div className="flex gap-2 *:flex-1 sm:*:flex-none">
          {show3d ? (
            <Button variant="secondary" onClick={() => setViewer(true)}>
              <Box />
              {t("venue.seeIn3d")}
            </Button>
          ) : null}
          {action}
        </div>
      ) : null}
      {show3d ? (
        <Sheet open={viewer} onOpenChange={setViewer} title={`${field.name} · ${field.format}`} description={`${t(`surface.${field.surface}`)} · ${field.indoor ? t("common.indoor") : t("common.outdoor")}`} className="md:max-w-3xl">
          {viewer ? <FieldViewer field={field} /> : null}
        </Sheet>
      ) : null}
    </div>
  );
}
