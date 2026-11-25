import type { FieldLayout } from "@pitchkh/shared";

/** Depth of the car park strip under the plan, in metres. */
export const PARKING_DEPTH = 12;
/** Paved border around each pitch, in metres. */
const APRON = 1.6;
/** Extra roof overhang around indoor pitches, in metres. */
const ROOF = 1.6;
const TREE_R = 2.4;
const TREE_STEP = 6.5;

interface Pitch { layout: FieldLayout; indoor: boolean }

const grow = (l: FieldLayout, by: number): FieldLayout => ({ x: l.x - by, y: l.y - by, w: l.w + by * 2, h: l.h + by * 2 });

/** Distance from a point to a rectangle (0 inside). */
function distance(px: number, py: number, r: FieldLayout): number {
  const dx = Math.max(r.x - px, 0, px - (r.x + r.w));
  const dy = Math.max(r.y - py, 0, py - (r.y + r.h));
  return Math.hypot(dx, dy);
}

/** Small deterministic wobble so trees don't stand on a perfect grid. */
const wobble = (i: number): number => ((Math.sin(i * 12.9898) * 43758.5453) % 1) * 1.4;

/** Trees on every free patch of ground: anywhere a canopy fits clear of pitches and their borders. */
export function treeSpots(pitches: readonly Pitch[], width: number, height: number): { x: number; y: number; r: number }[] {
  const blocked = pitches.map((p) => grow(p.layout, (p.indoor ? ROOF : APRON) + 0.8));
  const spots: { x: number; y: number; r: number }[] = [];
  let i = 0;
  for (let y = TREE_R + 1.5; y <= height - TREE_R - 1.5; y += TREE_STEP) {
    for (let x = TREE_R + 1.5; x <= width - TREE_R - 1.5; x += TREE_STEP) {
      i += 1;
      const tx = x + wobble(i);
      const ty = y + wobble(i + 7);
      const r = TREE_R * (0.8 + Math.abs(wobble(i + 3)) / 3);
      if (blocked.every((b) => distance(tx, ty, b) > r)) spots.push({ x: tx, y: ty, r });
    }
  }
  return spots;
}

/**
 * The site around the pitches, drawn like a map seen from above: grass, a
 * perimeter fence, paved borders, roofs over indoor courts, trees in the free
 * space and (full size only) the car park and entrance along the bottom.
 */
export function Scenery({ pitches, width, height, parking, metresPerPx, labels }: { pitches: readonly Pitch[]; width: number; height: number; parking: boolean; metresPerPx: number; labels: { parking: string; entrance: string } }) {
  const trees = treeSpots(pitches, width, height);
  const text = Math.min(metresPerPx * 12, PARKING_DEPTH * 0.32);
  const gate = Math.min(14, width * 0.2);
  const bays = Math.floor(width / 3.2);
  return (
    <g aria-hidden>
      {/* Grass, with faint mowing bands. */}
      <rect width={width} height={height + (parking ? PARKING_DEPTH : 0)} className="fill-[#cfe0bf] dark:fill-[#17261b]" />
      {Array.from({ length: Math.ceil(width / 8) }, (_, i) => (i % 2 ? <rect key={i} x={i * 8} width={8} height={height} className="fill-[#c6d9b5] dark:fill-[#1a2a1f]" /> : null))}

      {/* Paved borders and roofs. */}
      {pitches.map((p, i) => {
        const r = grow(p.layout, p.indoor ? ROOF : APRON);
        return p.indoor ? (
          <g key={i}>
            <rect x={r.x + 0.7} y={r.y + 0.9} width={r.w} height={r.h} rx={0.8} fill="#000" fillOpacity={0.12} />
            <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={0.8} className="fill-[#d5d8dc] stroke-[#9aa1a9] dark:fill-[#36404a] dark:stroke-[#56616d]" strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
          </g>
        ) : (
          <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx={0.6} className="fill-[#e7e2d4] dark:fill-[#2b372f]" />
        );
      })}

      {/* Trees: shadow, canopy, light side. */}
      {trees.map((t, i) => (
        <g key={i}>
          <circle cx={t.x + 0.6} cy={t.y + 0.8} r={t.r} fill="#000" fillOpacity={0.13} />
          <circle cx={t.x} cy={t.y} r={t.r} className="fill-[#5c9a52] dark:fill-[#2c5532]" />
          <circle cx={t.x - t.r * 0.3} cy={t.y - t.r * 0.3} r={t.r * 0.5} className="fill-[#7db66f] dark:fill-[#3a6a40]" fillOpacity={0.7} />
        </g>
      ))}

      {/* Perimeter fence, open at the gate. */}
      <path
        d={`M ${width / 2 - gate / 2} ${height - 1} H 1 V 1 H ${width - 1} V ${height - 1} H ${width / 2 + gate / 2}`}
        fill="none"
        className="stroke-[#5d6e60] dark:stroke-[#7d8f80]"
        strokeWidth={1.5}
        strokeDasharray="6 3"
        vectorEffect="non-scaling-stroke"
      />

      {parking ? (
        <g>
          <rect y={height} width={width} height={PARKING_DEPTH} className="fill-[#6a7077] dark:fill-[#2a2f34]" />
          {Array.from({ length: bays }, (_, i) => {
            const x = (width - bays * 3.2) / 2 + i * 3.2;
            const nearGate = Math.abs(x + 1.6 - width / 2) < gate / 2 + 2;
            return nearGate ? null : <line key={i} x1={x} y1={height + 0.6} x2={x} y2={height + PARKING_DEPTH * 0.36} stroke="#fff" strokeOpacity={0.7} strokeWidth={1} vectorEffect="non-scaling-stroke" />;
          })}
          {/* Driveway from the gate. */}
          <rect x={width / 2 - gate / 2} y={height - 1} width={gate} height={PARKING_DEPTH + 1} className="fill-[#7a8088] dark:fill-[#30363c]" />
          <g fill="#fff" fontFamily="inherit" fontWeight={800} textAnchor="middle" pointerEvents="none">
            <text x={width / 2} y={height + PARKING_DEPTH * 0.72} fontSize={text}>▲ {labels.entrance}</text>
            <g transform={`translate(${Math.min(width * 0.12 + text, width / 2 - gate / 2 - text * 2)} ${height + PARKING_DEPTH * 0.68})`}>
              <rect x={-text * 0.75} y={-text * 0.95} width={text * 1.5} height={text * 1.3} rx={text * 0.2} fill="#2f6ea8" />
              <text fontSize={text}>P</text>
            </g>
            <text x={Math.min(width * 0.12 + text, width / 2 - gate / 2 - text * 2) + text * 1.1} y={height + PARKING_DEPTH * 0.68} fontSize={text * 0.8} fontWeight={600} textAnchor="start" fillOpacity={0.9}>{labels.parking}</text>
          </g>
        </g>
      ) : null}
    </g>
  );
}
