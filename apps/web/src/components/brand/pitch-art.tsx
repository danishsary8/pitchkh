import type { Sport } from "@pitchkh/shared";
import { cn } from "@/lib/utils";

/** Chalk line markings of a pitch, seen from above. Purely decorative. */
export function PitchLines({ className, sport = "football" }: { className?: string; sport?: Sport }) {
  return (
    <svg viewBox="0 0 600 380" fill="none" stroke="currentColor" strokeWidth="3" className={cn("pointer-events-none", className)} aria-hidden preserveAspectRatio="xMidYMid slice">
      <rect x="20" y="20" width="560" height="340" />
      {sport === "football" ? (
        <>
          <path d="M300 20v340" />
          <circle cx="300" cy="190" r="56" />
          <circle cx="300" cy="190" r="4" fill="currentColor" />
          <rect x="20" y="100" width="92" height="180" />
          <rect x="20" y="145" width="36" height="90" />
          <path d="M112 152a56 56 0 0 1 0 76" />
          <rect x="488" y="100" width="92" height="180" />
          <rect x="544" y="145" width="36" height="90" />
          <path d="M488 152a56 56 0 0 0 0 76" />
          <path d="M20 34a14 14 0 0 0 14-14M566 20a14 14 0 0 0 14 14M580 346a14 14 0 0 0-14 14M34 360a14 14 0 0 0-14-14" />
        </>
      ) : sport === "volleyball" ? (
        <>
          <path d="M300 8v364" strokeWidth="5" strokeDasharray="2 7" />
          <path d="M206 20v340M394 20v340" />
        </>
      ) : (
        <>
          <path d="M20 62h560M20 318h560M300 20v340" />
          <path d="M150 62v256M450 62v256M150 190h300" />
        </>
      )}
    </svg>
  );
}

/** A band of krama gingham used as the brand's divider. */
export function KramaStrip({ className }: { className?: string }) {
  return <div aria-hidden className={cn("krama h-3 w-full", className)} />;
}

const SPORT_PATHS: Record<Sport, string> = {
  // football: ball with a pentagon
  football: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 5.2 3.6 2.6-1.4 4.2H9.8L8.4 9.8 12 7.2ZM12 2v5.2M3 9.5l5.4.3M21 9.500l-5.400.300M6.200 19.300l3.600-5.300M17.800 19.300l-3.600-5.300",
  // volleyball: three curved panels
  volleyball: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 10c-1-4 0-7.500 2.500-9.700M12 12c4-1 7.300.300 9.600 2.800M12 12c-3 3-6.500 3.700-9.700 2.700M12 12c3.500 1.500 5.400 4.500 5.700 8M12 12C8.800 9.800 7 6.800 7.100 3.300",
  // tennis: ball with two seams
  tennis: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM5 4.900c3.900 3.900 3.900 10.300 0 14.200M19 4.900c-3.900 3.900-3.900 10.300 0 14.200",
};

export function SportIcon({ sport, className }: { sport: Sport; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={cn("size-5 shrink-0", className)} aria-hidden>
      <path d={SPORT_PATHS[sport]} />
    </svg>
  );
}
