import type { Field, FieldLayout, Sport, Surface } from "@pitchkh/shared";

/** How a pitch looks on the map. "free"/"full" come from availability, "closed" from maintenance. */
export type PitchState = "free" | "full" | "closed";

/** Real-world-ish colours per surface. Fixed in both themes: they are "photos", not UI chrome. */
const SURFACE: Record<Surface, { base: string; stripe: string | null; line: string }> = {
  artificial_turf: { base: "#1d8a4a", stripe: "#1a7c43", line: "#ffffff" },
  natural_grass: { base: "#2e9440", stripe: "#29853a", line: "#ffffff" },
  futsal_court: { base: "#2f6ea8", stripe: null, line: "#ffffff" },
  sand: { base: "#dcbb72", stripe: null, line: "#ffffff" },
  hard_court: { base: "#3a7fc2", stripe: null, line: "#ffffff" },
  clay: { base: "#c4623a", stripe: null, line: "#ffffff" },
  parquet: { base: "#c79a5c", stripe: "#bd9053", line: "#ffffff" },
};

/** Court lines in local coordinates: length L along x, width W along y. */
function Markings({ sport, L, W }: { sport: Sport; L: number; W: number }) {
  const line = { fill: "none", stroke: "currentColor", strokeWidth: 1.25, vectorEffect: "non-scaling-stroke" as const };
  const inset = Math.min(L, W) * 0.04;
  const l = L - inset * 2;
  const w = W - inset * 2;
  if (sport === "football") {
    const box = { d: l * 0.15, w: w * 0.56 };
    const small = { d: l * 0.06, w: w * 0.28 };
    return (
      <g transform={`translate(${inset} ${inset})`}>
        <rect width={l} height={w} {...line} />
        <line x1={l / 2} y1={0} x2={l / 2} y2={w} {...line} />
        <circle cx={l / 2} cy={w / 2} r={Math.min(w * 0.16, 9.15)} {...line} />
        <circle cx={l / 2} cy={w / 2} r={0.6} fill="currentColor" />
        {[0, 1].map((end) => (
          <g key={end} transform={end ? `translate(${l} 0) scale(-1 1)` : undefined}>
            <rect y={(w - box.w) / 2} width={box.d} height={box.w} {...line} />
            <rect y={(w - small.w) / 2} width={small.d} height={small.w} {...line} />
          </g>
        ))}
      </g>
    );
  }
  if (sport === "volleyball") {
    return (
      <g transform={`translate(${inset} ${inset})`}>
        <rect width={l} height={w} {...line} />
        <line x1={l / 2} y1={-inset} x2={l / 2} y2={w + inset} {...line} strokeWidth={2.5} />
        <line x1={l / 2 - l / 6} y1={0} x2={l / 2 - l / 6} y2={w} {...line} />
        <line x1={l / 2 + l / 6} y1={0} x2={l / 2 + l / 6} y2={w} {...line} />
      </g>
    );
  }
  // Tennis: doubles box, singles sidelines, service boxes, net.
  const single = w * 0.125;
  const service = l * 0.27;
  return (
    <g transform={`translate(${inset} ${inset})`}>
      <rect width={l} height={w} {...line} />
      <line x1={0} y1={single} x2={l} y2={single} {...line} />
      <line x1={0} y1={w - single} x2={l} y2={w - single} {...line} />
      <line x1={l / 2 - service} y1={single} x2={l / 2 - service} y2={w - single} {...line} />
      <line x1={l / 2 + service} y1={single} x2={l / 2 + service} y2={w - single} {...line} />
      <line x1={l / 2 - service} y1={w / 2} x2={l / 2 + service} y2={w / 2} {...line} />
      <line x1={l / 2} y1={-inset} x2={l / 2} y2={w + inset} {...line} strokeWidth={2.5} />
    </g>
  );
}

export interface PitchShapeProps {
  field: Pick<Field, "id" | "name" | "format" | "sport" | "surface" | "indoor">;
  layout: FieldLayout;
  state?: PitchState;
  selected?: boolean;
  dimmed?: boolean;
  /** Metres per CSS pixel at the current zoom, so labels keep a readable on-screen size. */
  metresPerPx: number;
  showLabel?: boolean;
  /** Short word drawn under the name, e.g. "Full". */
  stateLabel?: string;
  warn?: boolean;
}

/** One pitch: surface, stripes, lines, roof outline when indoor, label, and state overlays. */
export function PitchShape({ field, layout, state = "free", selected, dimmed, metresPerPx, showLabel = true, stateLabel, warn }: PitchShapeProps) {
  const { x, y, w, h } = layout;
  const vertical = h > w;
  const L = vertical ? h : w;
  const W = vertical ? w : h;
  const colours = SURFACE[field.surface];
  const stripes = colours.stripe ? Math.max(4, Math.round(L / 6)) : 0;
  const roof = Math.max(1, metresPerPx * 5);
  // Label sized in screen pixels, but never wider than the pitch.
  const nameSize = Math.min(metresPerPx * 15, W * 0.3, (w / Math.max(4, field.name.length)) * 1.6);
  const subSize = Math.min(metresPerPx * 11.5, nameSize * 0.85, (w / 11) * 1.6);
  const muted = state !== "free" || dimmed;

  return (
    <g opacity={dimmed ? 0.28 : 1} className="transition-opacity duration-200">
      {field.indoor ? <rect x={x - roof} y={y - roof} width={w + roof * 2} height={h + roof * 2} rx={roof} fill="none" stroke="var(--muted-foreground)" strokeDasharray="5 4" strokeWidth={1.25} vectorEffect="non-scaling-stroke" /> : null}
      <g transform={vertical ? `translate(${x + w} ${y}) rotate(90)` : `translate(${x} ${y})`} style={{ color: colours.line }}>
        <rect width={L} height={W} rx={Math.min(L, W) * 0.03} fill={colours.base} />
        {Array.from({ length: stripes }, (_, i) => (i % 2 ? <rect key={i} x={(L / stripes) * i} width={L / stripes} height={W} fill={colours.stripe ?? undefined} /> : null))}
        <Markings sport={field.sport} L={L} W={W} />
      </g>
      {muted && !dimmed ? <rect x={x} y={y} width={w} height={h} fill={state === "closed" ? "url(#pitch-closed)" : "#0b1510"} fillOpacity={state === "closed" ? 1 : 0.58} /> : null}
      {warn ? <rect x={x} y={y} width={w} height={h} fill="var(--destructive)" fillOpacity={0.35} /> : null}
      {selected ? (
        <>
          <rect x={x} y={y} width={w} height={h} fill="none" stroke="var(--accent)" strokeWidth={4} vectorEffect="non-scaling-stroke" />
          <circle cx={x + w - metresPerPx * 14} cy={y + metresPerPx * 14} r={metresPerPx * 10} fill="var(--accent)" />
          <path d={`M ${x + w - metresPerPx * 18.5} ${y + metresPerPx * 14} l ${metresPerPx * 3} ${metresPerPx * 3} l ${metresPerPx * 6} ${-metresPerPx * 6}`} fill="none" stroke="var(--accent-foreground)" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </>
      ) : null}
      {showLabel ? (
        <g pointerEvents="none" textAnchor="middle" fontFamily="inherit" stroke="#0b1510" strokeOpacity={0.6} strokeWidth={metresPerPx * 3} paintOrder="stroke" strokeLinejoin="round">
          <text x={x + w / 2} y={y + h / 2} dy="-0.1em" fontSize={nameSize} fontWeight={800} fill="#fff">
            {field.name}
          </text>
          <text x={x + w / 2} y={y + h / 2} dy="1.2em" fontSize={subSize} fontWeight={700} fill="#fff" className="font-num">
            {field.format}
            {stateLabel ? <tspan fill={state === "free" ? "#b9f5cf" : "#ffffff"}>{` · ${stateLabel}`}</tspan> : null}
          </text>
        </g>
      ) : null}
    </g>
  );
}

/** Shared <defs> (maintenance hatch). Render once inside each map's <svg>. */
export function PitchDefs() {
  return (
    <defs>
      <pattern id="pitch-closed" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="6" height="6" fill="#0b1510" fillOpacity={0.45} />
        <rect width="3" height="6" fill="#ffc629" fillOpacity={0.55} />
      </pattern>
    </defs>
  );
}

