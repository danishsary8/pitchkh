"use client";

import type { Field } from "@pitchkh/shared";
import { Box, Hand, Moon, Sun, Sunset } from "lucide-react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import { useIsClient, useMediaQuery } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import type { FieldSceneOptions, TimeOfDay } from "./scene";

const FieldCanvas = dynamic(() => import("./field-canvas"), { ssr: false });

/** Pre-rendered still of this exact field type, shown before (and instead of) WebGL. */
export function fieldPosterPath(field: Pick<Field, "sport" | "surface" | "indoor" | "format">): string {
  return `/assets/fields/${field.sport}-${field.surface}-${field.indoor ? "in" : "out"}-${field.format.replace(/[^a-z0-9]/gi, "").toLowerCase()}.webp`;
}

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

const TIMES: { value: TimeOfDay; icon: typeof Sun }[] = [
  { value: "day", icon: Sun },
  { value: "dusk", icon: Sunset },
  { value: "night", icon: Moon },
];

/**
 * Interactive 3D field. Phones see a static poster and a "View in 3D" button
 * (3D loads only when asked for); desktops load it automatically. Devices
 * without WebGL keep the poster, and slower devices get the low-poly scene.
 */
export function FieldViewer({ field, className }: { field: Field; className?: string }) {
  const t = useTranslations("viewer");
  const desktop = useMediaQuery("(min-width: 1024px) and (pointer: fine)");
  const [requested, setRequested] = useState(false);
  const [ready, setReady] = useState(false);
  const [time, setTime] = useState<TimeOfDay>("day");
  const [poster, setPoster] = useState(fieldPosterPath(field));
  const client = useIsClient();
  const coarse = useMediaQuery("(pointer: coarse)");
  // Capability checks only make sense in the browser; assume the best while rendering on the server.
  const webgl = useMemo(() => (client ? supportsWebGL() : true), [client]);
  const lowPower = client ? (navigator.hardwareConcurrency ?? 8) <= 4 || coarse : false;

  const active = webgl && (requested || desktop);
  const options = useMemo<FieldSceneOptions>(
    () => ({ sport: field.sport, surface: field.surface, indoor: field.indoor, format: field.format, time, quality: lowPower ? "low" : "high", seed: 7 }),
    [field.sport, field.surface, field.indoor, field.format, time, lowPower],
  );
  const handleReady = useCallback(() => setReady(true), []);

  return (
    <div className={cn("relative isolate aspect-[4/3] overflow-hidden rounded-2xl bg-pitch sm:aspect-[16/10]", className)}>
      <Image src={poster} alt={t("posterAlt", { name: field.name })} fill sizes="(min-width: 1024px) 720px, 100vw" className={cn("object-cover transition-opacity duration-500", active && ready ? "opacity-0" : "opacity-100")} onError={() => setPoster(`/assets/fields/${field.sport}.webp`)} />
      {active ? <FieldCanvas options={options} onReady={handleReady} /> : null}

      {!active ? (
        <div className="absolute inset-0 grid place-items-center bg-black/25">
          {webgl ? (
            <Button variant="inverse" size="lg" onClick={() => setRequested(true)}>
              <Box />
              {t("view3d")}
            </Button>
          ) : (
            <p className="rounded-full bg-black/60 px-4 py-2 text-sm font-medium text-white">{t("unsupported")}</p>
          )}
        </div>
      ) : !ready ? (
        <div className="absolute inset-0 grid place-items-center bg-black/25" role="status">
          <span className="flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-sm font-medium text-white">
            <Spinner />
            {t("loading")}
          </span>
        </div>
      ) : (
        <>
          <p className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white">
            <Hand className="size-3.5" />
            {t("hint")}
          </p>
          <div className="absolute top-3 right-3 flex rounded-full bg-black/55 p-1" role="group" aria-label={t("timeOfDay")}>
            {TIMES.map(({ value, icon: Icon }) => (
              <button key={value} type="button" aria-pressed={time === value} aria-label={t(`time.${value}`)} onClick={() => setTime(value)} className="grid size-9 place-items-center rounded-full text-white/75 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white aria-pressed:bg-white aria-pressed:text-black">
                <Icon className="size-4.5" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
