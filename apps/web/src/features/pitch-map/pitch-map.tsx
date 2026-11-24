"use client";

import { planBounds, resolveLayout, type Field, type FieldLayout, type Sport } from "@pitchkh/shared";
import { useTranslations } from "next-intl";
import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { PitchDefs, PitchShape, type PitchState } from "./pitch-shape";

export type { PitchState };

/** Measures an element's CSS size (0 × 0 until mounted). */
export function useSize<T extends Element>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry?.contentRect.width ?? 0, height: entry?.contentRect.height ?? 0 }));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}

export interface PitchMapProps {
  fields: Field[];
  selectedId?: string | null;
  /** Availability per field id. Missing = free. Maintenance fields are always "closed". */
  states?: Record<string, PitchState | undefined>;
  /** Other sports are faded and can't be picked. */
  sport?: Sport | null;
  onSelect?: (fieldId: string) => void;
  /** Small, label-less preview (e.g. on the confirm screen). */
  compact?: boolean;
  showStateLabels?: boolean;
  className?: string;
  label: string;
}

/**
 * Top-down plan of a venue. Every pitch is drawn at its real size and place
 * (or auto-arranged if the owner hasn't placed it), and is a radio button:
 * tap or press Enter/Space to pick it.
 */
export function PitchMap({ fields, selectedId, states, sport, onSelect, compact, showStateLabels = true, className, label }: PitchMapProps) {
  const t = useTranslations("pitchMap");
  const [ref, size] = useSize<SVGSVGElement>();
  const layouts = useMemo(() => resolveLayout(fields), [fields]);
  const bounds = planBounds(layouts.values());
  // The plan is scaled to fit both the width and the capped height ("meet").
  const metresPerPx = size.width > 0 && size.height > 0 ? Math.max(bounds.width / size.width, bounds.height / size.height) : bounds.width / 360;
  const interactive = !!onSelect && !compact;

  const stateOf = (field: Field): PitchState => (field.status !== "active" ? "closed" : (states?.[field.id] ?? "free"));
  const canPick = (field: Field): boolean => (!sport || field.sport === sport) && stateOf(field) !== "closed";

  const onKey = (event: KeyboardEvent, field: Field): void => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (canPick(field)) onSelect?.(field.id);
  };

  return (
    <div className={cn("relative w-full overflow-hidden rounded-2xl bg-[#d9e4d2] dark:bg-[#16261d]", className)}>
      <svg
        ref={ref}
        viewBox={`0 0 ${bounds.width} ${bounds.height}`}
        className={cn("block h-auto w-full select-none", compact ? "max-h-56" : "max-h-[min(68vh,30rem)]")}
        role={interactive ? "radiogroup" : "img"}
        aria-label={label}
        style={{ touchAction: "manipulation" }}
      >
        <PitchDefs />
        {/* Faint ground grid, 10 m squares. */}
        <g stroke="currentColor" className="text-foreground/[0.06]" strokeWidth={1} vectorEffect="non-scaling-stroke">
          {Array.from({ length: Math.floor(bounds.width / 10) }, (_, i) => <line key={`x${i}`} x1={(i + 1) * 10} y1={0} x2={(i + 1) * 10} y2={bounds.height} vectorEffect="non-scaling-stroke" />)}
          {Array.from({ length: Math.floor(bounds.height / 10) }, (_, i) => <line key={`y${i}`} x1={0} y1={(i + 1) * 10} x2={bounds.width} y2={(i + 1) * 10} vectorEffect="non-scaling-stroke" />)}
        </g>
        {fields.map((field) => {
          const layout = layouts.get(field.id) as FieldLayout;
          const state = stateOf(field);
          const selected = field.id === selectedId;
          const dimmed = !!sport && field.sport !== sport;
          const pickable = interactive && canPick(field);
          const stateLabel = showStateLabels && !compact ? t(`state.${state}`) : undefined;
          return (
            <g
              key={field.id}
              role={interactive ? "radio" : undefined}
              aria-checked={interactive ? selected : undefined}
              aria-disabled={interactive && !pickable ? true : undefined}
              aria-label={interactive ? t("pitchLabel", { name: field.name, format: field.format, state: t(`state.${state}`) }) : undefined}
              tabIndex={pickable ? 0 : interactive ? -1 : undefined}
              onClick={pickable ? () => onSelect?.(field.id) : undefined}
              onKeyDown={pickable ? (e) => onKey(e, field) : undefined}
              className={cn("group outline-none", pickable && "cursor-pointer")}
              data-pitch={field.name}
            >
              <PitchShape field={field} layout={layout} state={state} selected={selected} dimmed={dimmed} metresPerPx={metresPerPx} showLabel={!compact || selected} stateLabel={stateLabel} />
              {pickable ? (
                <rect x={layout.x} y={layout.y} width={layout.w} height={layout.h} fill="transparent" stroke="transparent" strokeWidth={3} vectorEffect="non-scaling-stroke" className="transition-[stroke] group-hover:stroke-white/60 group-focus-visible:stroke-[var(--ring)]" />
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Colour key under the map. */
export function PitchLegend({ className }: { className?: string }) {
  const t = useTranslations("pitchMap");
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground", className)} aria-label={t("legend")}>
      <li className="flex items-center gap-1.5"><span className="size-3.5 rounded bg-[#1d8a4a]" />{t("state.free")}</li>
      <li className="flex items-center gap-1.5"><span className="size-3.5 rounded bg-[#1d8a4a] ring-2 ring-accent ring-inset" />{t("selected")}</li>
      <li className="flex items-center gap-1.5"><span className="size-3.5 rounded bg-[#2b3a32]" />{t("state.full")}</li>
      <li className="flex items-center gap-1.5"><span className="size-3.5 rounded bg-[repeating-linear-gradient(45deg,#0b1510_0_3px,#c9a227_3px_5px)]" />{t("state.closed")}</li>
      <li className="flex items-center gap-1.5"><span className="size-3.5 rounded border border-dashed border-muted-foreground" />{t("indoor")}</li>
    </ul>
  );
}
