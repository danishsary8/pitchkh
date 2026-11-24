"use client";

import { autoLayout, findLayoutOverlap, LAYOUT_GAP, PLAN_MAX_METRES, planBounds, resolveLayout, type FieldLayout, type VenueDetail } from "@pitchkh/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutGrid, Move, RotateCw, Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page";
import { EmptyState, ErrorState, useErrorMessage } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, Spinner } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { PitchDefs, PitchShape } from "@/features/pitch-map/pitch-shape";
import { useSize } from "@/features/pitch-map/pitch-map";
import { api } from "@/lib/api";
import { qk } from "@/lib/query";
import { cn } from "@/lib/utils";

type Layouts = Record<string, FieldLayout>;

/** Room around the pitches so they can be dragged outwards, in metres. */
const ROOM = 30;
const clamp = (value: number, max: number): number => Math.max(0, Math.min(max, Math.round(value)));
const fromMap = (map: Map<string, FieldLayout>): Layouts => Object.fromEntries(map);

function Editor({ venue }: { venue: VenueDetail }) {
  const t = useTranslations("owner.layout");
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const initial = fromMap(resolveLayout(venue.fields));
  const [layouts, setLayouts] = useState<Layouts>(initial);
  const [saved, setSaved] = useState<Layouts>(initial);
  const [selectedId, setSelectedId] = useState<string | null>(venue.fields[0]?.id ?? null);
  const [svgRef, size] = useSize<SVGSVGElement>();
  // The canvas size is frozen while dragging so the drawing doesn't jump under the finger.
  const drag = useRef<{ id: string; startX: number; startY: number; orig: FieldLayout; plan: { width: number; height: number } } | null>(null);
  const [frozenPlan, setFrozenPlan] = useState<{ width: number; height: number } | null>(null);

  const bounds = planBounds(Object.values(layouts));
  const plan = frozenPlan ?? { width: Math.min(PLAN_MAX_METRES, Math.max(120, bounds.width + ROOM)), height: Math.min(PLAN_MAX_METRES, Math.max(80, bounds.height + ROOM)) };
  const metresPerPx = size.width > 0 ? plan.width / size.width : plan.width / 360;
  const items = venue.fields.map((f) => ({ id: f.id, layout: layouts[f.id] as FieldLayout }));
  const overlap = findLayoutOverlap(items);
  const dirty = JSON.stringify(layouts) !== JSON.stringify(saved);
  const selected = venue.fields.find((f) => f.id === selectedId);
  const selectedLayout = selectedId ? layouts[selectedId] : undefined;

  const move = (id: string, patch: Partial<FieldLayout>): void =>
    setLayouts((prev) => {
      const current = prev[id] as FieldLayout;
      const next = { ...current, ...patch };
      next.w = Math.max(4, Math.min(PLAN_MAX_METRES, Math.round(next.w)));
      next.h = Math.max(4, Math.min(PLAN_MAX_METRES, Math.round(next.h)));
      next.x = clamp(next.x, PLAN_MAX_METRES - next.w);
      next.y = clamp(next.y, PLAN_MAX_METRES - next.h);
      return { ...prev, [id]: next };
    });
  const rotate = (id: string): void => {
    const l = layouts[id] as FieldLayout;
    // Turn around the centre.
    move(id, { w: l.h, h: l.w, x: l.x + (l.w - l.h) / 2, y: l.y + (l.h - l.w) / 2 });
  };

  /** Pointer position in plan metres. */
  const toPlan = (event: PointerEvent): { x: number; y: number } => {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return { x: 0, y: 0 };
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: point.x, y: point.y };
  };
  const onPointerDown = (event: PointerEvent<SVGGElement>, id: string): void => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const start = toPlan(event);
    drag.current = { id, startX: start.x, startY: start.y, orig: layouts[id] as FieldLayout, plan };
    setFrozenPlan(plan);
    setSelectedId(id);
  };
  const onPointerMove = (event: PointerEvent<SVGGElement>): void => {
    const d = drag.current;
    if (!d) return;
    const p = toPlan(event);
    move(d.id, { x: d.orig.x + p.x - d.startX, y: d.orig.y + p.y - d.startY });
  };
  const endDrag = (): void => {
    drag.current = null;
    setFrozenPlan(null);
  };
  const onKey = (event: KeyboardEvent, id: string): void => {
    const step = event.shiftKey ? 5 : 1;
    const l = layouts[id] as FieldLayout;
    const delta: Record<string, Partial<FieldLayout>> = { ArrowLeft: { x: l.x - step }, ArrowRight: { x: l.x + step }, ArrowUp: { y: l.y - step }, ArrowDown: { y: l.y + step } };
    if (delta[event.key]) {
      event.preventDefault();
      move(id, delta[event.key] as Partial<FieldLayout>);
    } else if (event.key === "r" || event.key === "R") rotate(id);
  };

  const save = useMutation({
    mutationFn: () => api.owner.saveLayout(venue.id, { items: items.map((i) => ({ fieldId: i.id, layout: i.layout })) }),
    onSuccess: async () => {
      setSaved(layouts);
      toast.success(t("saved"));
      await Promise.all([queryClient.invalidateQueries({ queryKey: qk.owner.venues }), queryClient.invalidateQueries({ queryKey: qk.venue(venue.slug) }), queryClient.invalidateQueries({ queryKey: qk.venue(venue.id) })]);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const overlapNames = overlap ? overlap.map((id) => venue.fields.find((f) => f.id === id)?.name ?? "").join(" + ") : null;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="overflow-hidden rounded-2xl bg-[#d9e4d2] dark:bg-[#16261d]">
          <svg ref={svgRef} viewBox={`0 0 ${plan.width} ${plan.height}`} className="block h-auto w-full touch-none select-none" role="application" aria-label={t("canvasLabel", { name: venue.name })}>
            <PitchDefs />
            <g className="text-foreground/10" stroke="currentColor">
              {Array.from({ length: Math.floor(plan.width / 10) }, (_, i) => <line key={`x${i}`} x1={(i + 1) * 10} y1={0} x2={(i + 1) * 10} y2={plan.height} vectorEffect="non-scaling-stroke" />)}
              {Array.from({ length: Math.floor(plan.height / 10) }, (_, i) => <line key={`y${i}`} x1={0} y1={(i + 1) * 10} x2={plan.width} y2={(i + 1) * 10} vectorEffect="non-scaling-stroke" />)}
            </g>
            {venue.fields.map((field) => {
              const layout = layouts[field.id] as FieldLayout;
              const isSelected = field.id === selectedId;
              return (
                <g
                  key={field.id}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isSelected}
                  aria-label={t("pitchLabel", { name: field.name, x: layout.x, y: layout.y, w: layout.w, h: layout.h })}
                  onPointerDown={(e) => onPointerDown(e, field.id)}
                  onPointerMove={onPointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  onFocus={() => setSelectedId(field.id)}
                  onKeyDown={(e) => onKey(e, field.id)}
                  className="group cursor-grab outline-none active:cursor-grabbing"
                >
                  <PitchShape field={field} layout={layout} selected={isSelected} metresPerPx={metresPerPx} warn={!!overlap?.includes(field.id)} state={field.status === "active" ? "free" : "closed"} />
                  <rect x={layout.x} y={layout.y} width={layout.w} height={layout.h} fill="transparent" stroke="transparent" strokeWidth={3} vectorEffect="non-scaling-stroke" className="group-focus-visible:stroke-[var(--ring)]" />
                </g>
              );
            })}
          </svg>
        </div>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Move className="size-4 shrink-0" aria-hidden />
          {t("hint")}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {overlapNames ? <Alert variant="destructive" title={t("overlapTitle")}>{t("overlapBody", { names: overlapNames })}</Alert> : null}
        {selected && selectedLayout ? (
          <div className="flex flex-col gap-3 rounded-2xl bg-card p-4">
            <p className="text-lg font-bold">{selected.name} <span className="font-num text-sm font-semibold text-muted-foreground">{selected.format}</span></p>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="lay-l">{t("length")}</FieldLabel>
                <Input id="lay-l" type="number" inputMode="numeric" min={4} max={PLAN_MAX_METRES} className="font-num" value={Math.max(selectedLayout.w, selectedLayout.h)} onChange={(e) => { const v = Number(e.target.value); if (v >= 4) move(selected.id, selectedLayout.w >= selectedLayout.h ? { w: v } : { h: v }); }} />
              </Field>
              <Field>
                <FieldLabel htmlFor="lay-w">{t("width")}</FieldLabel>
                <Input id="lay-w" type="number" inputMode="numeric" min={4} max={PLAN_MAX_METRES} className="font-num" value={Math.min(selectedLayout.w, selectedLayout.h)} onChange={(e) => { const v = Number(e.target.value); if (v >= 4) move(selected.id, selectedLayout.w >= selectedLayout.h ? { h: v } : { w: v }); }} />
              </Field>
            </div>
            <Button variant="secondary" onClick={() => rotate(selected.id)}>
              <RotateCw />
              {t("rotate")}
            </Button>
          </div>
        ) : null}
        <div className="flex flex-col gap-2 rounded-2xl bg-card p-4">
          <Button variant="secondary" onClick={() => { setLayouts(fromMap(autoLayout(venue.fields))); toast(t("arranged")); }}>
            <LayoutGrid />
            {t("autoArrange")}
          </Button>
          <Button variant="ghost" disabled={!dirty} onClick={() => setLayouts(saved)}>
            <Undo2 />
            {t("undo")}
          </Button>
          <Button size="lg" disabled={!dirty || !!overlap || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? <Spinner /> : null}
            {t("save")}
          </Button>
          <p className={cn("text-center text-sm", dirty ? "text-foreground" : "text-muted-foreground")} aria-live="polite">{dirty ? t("unsaved") : t("upToDate")}</p>
        </div>
        <p className="text-sm text-muted-foreground">{t("gapTip", { gap: LAYOUT_GAP })}</p>
      </div>
    </div>
  );
}

/** Owner page: drag pitches into place so players see the real venue on the booking map. */
export function LayoutEditor({ venueId }: { venueId: string }) {
  const t = useTranslations("owner.layout");
  const { data, isPending, isError, error, refetch } = useQuery({ queryKey: qk.owner.venues, queryFn: api.owner.venues });
  const venue = data?.find((v) => v.id === venueId);
  return (
    <>
      <PageHeader back="/owner/venues" title={t("title")} subtitle={venue ? `${venue.name} · ${t("subtitle")}` : t("subtitle")} />
      {isPending ? (
        <Skeleton className="h-96" />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !venue || venue.fields.length === 0 ? (
        <EmptyState icon={<LayoutGrid />} title={t("emptyTitle")} body={t("emptyBody")} />
      ) : (
        <Editor key={venue.id} venue={venue} />
      )}
    </>
  );
}
