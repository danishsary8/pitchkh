import { cn } from "@/lib/utils";

/** The mark: a top-down pitch with its centre circle, bound by a strip of krama check. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9 shrink-0", className)} aria-hidden>
      <defs>
        <pattern id="pk-krama" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="#fff" />
          <rect width="3" height="6" fill="#c2242b" opacity="0.62" />
          <rect width="6" height="3" fill="#c2242b" opacity="0.62" />
        </pattern>
        <clipPath id="pk-clip">
          <rect width="40" height="40" rx="11" />
        </clipPath>
      </defs>
      <g clipPath="url(#pk-clip)">
        <rect width="40" height="40" fill="#0a7446" />
        <rect x="20" width="20" height="40" fill="#09693f" />
        <rect width="9" height="40" fill="url(#pk-krama)" />
        <g fill="none" stroke="#fff" strokeWidth="2.2">
          <path d="M24.5 0v40" />
          <circle cx="24.5" cy="20" r="7" />
        </g>
        <circle cx="24.5" cy="20" r="1.8" fill="#fff" />
      </g>
    </svg>
  );
}

export function Wordmark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={compact ? "size-8" : "size-9"} />
      <span lang="en" className="font-display text-[1.15rem] leading-none tracking-[-0.04em] text-foreground">
        Pitch<span className="text-primary">KH</span>
      </span>
    </span>
  );
}
