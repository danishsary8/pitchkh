"use client";

import { Check } from "lucide-react";
import type { ReactNode, Ref } from "react";
import { cn } from "@/lib/utils";

/** Toggle tile used for days and time blocks. `aria-pressed` carries the state for screen readers. */
export function Chip({ active, disabled, onClick, children, className, label }: { active: boolean; disabled?: boolean; onClick: () => void; children: ReactNode; className?: string; label?: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "press flex shrink-0 flex-col items-center justify-center rounded-2xl px-3 py-2.5 text-sm font-semibold ring-1 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40",
        active ? "bg-primary text-primary-foreground ring-primary" : "bg-card text-foreground ring-border hover:ring-foreground/25",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Day → time → pitch is a real sequence, so each heading carries its number, then a tick once done. */
export function StepHeading({ id, n, done, children, aside }: { id: string; n: number; done: boolean; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <h2 id={id} className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
        <span aria-hidden className={cn("font-num grid size-7 place-items-center rounded-full text-sm transition-colors duration-200", done ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground")}>
          {done ? <Check className="size-4" strokeWidth={3} /> : n}
        </span>
        {children}
      </h2>
      {aside}
    </div>
  );
}

/** A small one-of-many switch (game length, sport filter). */
export function Segmented<T extends string | number | null>({ value, options, onChange, label, className }: { value: T; options: readonly { value: T; label: string }[]; onChange: (value: T) => void; label: string; className?: string }) {
  return (
    <div role="group" aria-label={label} className={cn("flex gap-1 rounded-full bg-card p-1 ring-1 ring-border", className)}>
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring",
            option.value === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Lets a row scroll sideways on phones and wrap on wide screens, edge to edge with the page padding. */
export function ScrollRow({ children, wrap = true, className, ref }: { children: ReactNode; wrap?: boolean; className?: string; ref?: Ref<HTMLDivElement> }) {
  return <div ref={ref} className={cn("no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1 lg:mx-0 lg:px-0", wrap && "lg:flex-wrap", className)}>{children}</div>;
}
