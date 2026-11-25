import type { Field, FieldLayout, Sport } from "../types";

export type { FieldLayout };

/** Space around and between pitches on an auto-arranged plan, in metres. */
export const LAYOUT_GAP = 4;
const MIN_ROW_WIDTH = 110;

/** Typical playing-area size for a sport and format ("6v6", "11v11", "Singles/Doubles"). */
export function pitchSize(sport: Sport, format: string): { length: number; width: number } {
  if (sport === "football") {
    // Pitch size by players per side: [length, width] in metres. Kept inside the
    // function so bundles that reorder module code (render script) still see it.
    const FOOTBALL_SIZES: Record<number, [number, number]> = { 5: [30, 18], 6: [36, 22], 7: [52, 32], 8: [60, 40], 9: [66, 44], 10: [75, 48], 11: [100, 64] };
    const players = Number(/^(\d+)/.exec(format)?.[1] ?? 5);
    const [length, width] = FOOTBALL_SIZES[Math.min(11, Math.max(5, players))] ?? [30, 18];
    return { length, width };
  }
  if (sport === "volleyball") return format.startsWith("4") ? { length: 16, width: 8 } : { length: 18, width: 9 };
  return { length: 23.77, width: 10.97 };
}

const SPORT_ORDER: Record<Sport, number> = { football: 0, volleyball: 1, tennis: 2 };

/**
 * Packs pitches into rows ("shelves"), grouped by sport and biggest first,
 * every pitch drawn landscape. A starting point for owners, and the fallback
 * for pitches nobody has placed yet.
 */
export function autoLayout(fields: readonly Pick<Field, "id" | "sport" | "format">[], top = LAYOUT_GAP): Map<string, FieldLayout> {
  const sized = fields
    .map((f) => ({ id: f.id, sport: f.sport, ...pitchSize(f.sport, f.format) }))
    .sort((a, b) => SPORT_ORDER[a.sport] - SPORT_ORDER[b.sport] || b.length * b.width - a.length * a.width);
  const rowLimit = Math.max(MIN_ROW_WIDTH, ...sized.map((p) => p.length));

  // 1. Split into rows: one sport per row, wrapping when the row is full.
  const rows: (typeof sized)[] = [];
  for (const p of sized) {
    const row = rows.at(-1);
    const rowWidth = row ? row.reduce((sum, q) => sum + q.length + LAYOUT_GAP, 0) : 0;
    if (!row || row[0]?.sport !== p.sport || rowWidth + p.length > rowLimit) rows.push([p]);
    else row.push(p);
  }

  // 2. Centre every row across the plan, and every pitch within its row's height,
  //    so the plan reads like a tidy site rather than a left-packed list.
  const widthOf = (row: typeof sized): number => row.reduce((sum, q) => sum + q.length, 0) + LAYOUT_GAP * (row.length - 1);
  const planInner = Math.max(...rows.map(widthOf));
  const map = new Map<string, FieldLayout>();
  let y = top;
  for (const row of rows) {
    const rowHeight = Math.max(...row.map((q) => q.width));
    let x = LAYOUT_GAP + (planInner - widthOf(row)) / 2;
    for (const p of row) {
      map.set(p.id, { x, y: y + (rowHeight - p.width) / 2, w: p.length, h: p.width });
      x += p.length + LAYOUT_GAP;
    }
    y += rowHeight + LAYOUT_GAP;
  }
  return map;
}

/** Saved layouts as they are, plus unplaced pitches auto-arranged below them. */
export function resolveLayout(fields: readonly Pick<Field, "id" | "sport" | "format" | "layout">[]): Map<string, FieldLayout> {
  const map = new Map<string, FieldLayout>();
  for (const f of fields) if (f.layout) map.set(f.id, f.layout);
  const unplaced = fields.filter((f) => !f.layout);
  if (unplaced.length === 0) return map;
  const bottom = Math.max(0, ...[...map.values()].map((l) => l.y + l.h));
  for (const [id, layout] of autoLayout(unplaced, bottom + LAYOUT_GAP)) map.set(id, layout);
  return map;
}

/** The first pair of pitches whose areas overlap (shared edges are fine), or null. */
export function findLayoutOverlap(items: readonly { id: string; layout: FieldLayout }[]): [string, string] | null {
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = (items[i] as (typeof items)[number]).layout;
      const b = (items[j] as (typeof items)[number]).layout;
      if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) return [(items[i] as { id: string }).id, (items[j] as { id: string }).id];
    }
  }
  return null;
}

/** Size of the drawing area that holds every pitch, with a margin. */
export function planBounds(layouts: Iterable<FieldLayout>): { width: number; height: number } {
  const list = [...layouts];
  if (list.length === 0) return { width: 40, height: 24 };
  return {
    width: Math.max(...list.map((l) => l.x + l.w)) + LAYOUT_GAP,
    height: Math.max(...list.map((l) => l.y + l.h)) + LAYOUT_GAP,
  };
}
