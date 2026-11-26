"use client";

import { planBounds, resolveLayout, type Field, type FieldLayout, type Sport } from "@pitchkh/shared";
import { useTranslations } from "next-intl";
import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { PitchDefs, PitchShape, type PitchState } from "./pitch-shape";
import { PARKING_DEPTH, Scenery } from "./scenery";

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
 * tap it, or Tab into the map, move with the arrow keys and press Enter/Space.
 */
export function PitchMap({ fields, selectedId, states, sport, onSelect, compact, showStateLabels = true, className, label }: PitchMapProps) {
  const t = useTranslations("pitchMap");
  const [ref, size] = useSize<SVGSVGElement>();
  const layouts = useMemo(() => resolveLayout(fields), [fields]);
  const site = planBounds(layouts.values());
  // The full-size map adds the car park and entrance under the site.
  const parking = !compact;
  const bounds = { width: site.width, height: site.height + (parking ? PARKING_DEPTH : 0) };
  // The plan is scaled to fit both the width and the capped height ("meet").
  const metresPerPx = size.width > 0 && size.height > 0 ? Math.max(bounds.width / size.width, bounds.height / size.height) : bounds.width / 360;
  const interactive = !!onSelect && !compact;

  const stateOf = (field: Field): PitchState => (field.status !== "active" ? "closed" : (states?.[field.id] ?? "free"));
  const canPick = (field: Field): boolean => (!sport || field.sport === sport) && stateOf(field) !== "closed";

  // Keyboard: the map is one Tab stop. Arrow keys move between pickable pitches in reading
  // order (top to bottom, then left to right); Enter or Space picks. Arrows only move focus,
  // because picking can navigate away (e.g. on Home).
  const [focusId, setFocusId] = useState<string | null>(null);
  const order = interactive
    ? fields.filter(canPick).sort((a, b) => {
        const la = layouts.get(a.id) as FieldLayout;
        const lb = layouts.get(b.id) as FieldLayout;
        return la.y - lb.y || la.x - lb.x;
      })
    : [];
  const tabStop = [focusId, selectedId].find((id) => order.some((f) => f.id === id)) ?? order[0]?.id;
  const moveFocus = (id: string | undefined): void => {
    if (!id) return;
    setFocusId(id);
    ref.current?.querySelector<SVGGElement>(`[data-field-id="${id}"]`)?.focus();
  };

  const onKey = (event: KeyboardEvent, field: Field): void => {
    const at = order.findIndex((f) => f.id === field.id);
    const step: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (event.key in step) {
      event.preventDefault();
      moveFocus(order[(at + (step[event.key] ?? 0) + order.length) % order.length]?.id);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      moveFocus((event.key === "Home" ? order[0] : order.at(-1))?.id);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (canPick(field)) onSelect?.(field.id);
    }
  };

  return (
    <div className={cn("relative w-full overflow-hidden rounded-2xl bg-[#cfe0bf] dark:bg-[#17261b]", className)}>
      <svg
        ref={ref}
        viewBox={`0 0 ${bounds.width} ${bounds.height}`}
        className={cn("block h-auto w-full select-none", compact ? "max-h-56" : "max-h-[min(82vh,48rem)]")}
        role={interactive ? "radiogroup" : "img"}
        aria-label={label}
        style={{ touchAction: "manipulation" }}
      >
        <PitchDefs />
        <Scenery pitches={fields.map((f) => ({ layout: layouts.get(f.id) as FieldLayout, indoor: f.indoor }))} width={site.width} height={site.height} parking={parking} metresPerPx={metresPerPx} labels={{ parking: t("parking"), entrance: t("entrance") }} />
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
              tabIndex={interactive ? (field.id === tabStop ? 0 : -1) : undefined}
              onClick={pickable ? () => onSelect?.(field.id) : undefined}
              onKeyDown={pickable ? (e) => onKey(e, field) : undefined}
              onFocus={pickable ? () => setFocusId(field.id) : undefined}
              className={cn("group outline-none", pickable && "cursor-pointer active:opacity-90")}
              data-pitch={field.name}
              data-field-id={field.id}
            >
              {/* Re-keyed on select so the bounce replays each time this pitch is picked. */}
              <g key={selected ? "on" : "off"} className={cn(selected && interactive && "motion-safe:animate-pitch-pop")} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
              <PitchShape field={field} layout={layout} state={state} selected={selected} dimmed={dimmed} metresPerPx={metresPerPx} roofOutline={false} showLabel={!compact || selected} stateLabel={stateLabel} />
              </g>
              {pickable ? (
                <>
                  <rect x={layout.x} y={layout.y} width={layout.w} height={layout.h} fill="transparent" stroke="transparent" strokeWidth={3} vectorEffect="non-scaling-stroke" className="transition-[stroke] group-hover:stroke-white/60" />
                  {/* Keyboard focus: a dark outline with a white inner line, visible on any pitch colour and theme. */}
                  <rect x={layout.x} y={layout.y} width={layout.w} height={layout.h} fill="none" stroke="transparent" strokeWidth={7} vectorEffect="non-scaling-stroke" className="group-focus-visible:stroke-[#0b1510]" />
                  <rect x={layout.x} y={layout.y} width={layout.w} height={layout.h} fill="none" stroke="transparent" strokeWidth={3} vectorEffect="non-scaling-stroke" className="group-focus-visible:stroke-white" />
                </>
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
      <li className="flex items-center gap-1.5"><span className="size-3.5 rounded border border-[#9aa1a9] bg-[#d5d8dc] dark:border-[#56616d] dark:bg-[#36404a]" />{t("indoor")}</li>
    </ul>
  );
}
