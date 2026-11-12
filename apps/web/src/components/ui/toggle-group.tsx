"use client";

import { ToggleGroup as Primitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Pill-style single/multi choice. Wraps onto new lines instead of scrolling. */
export function ToggleGroup({ className, ...props }: ComponentProps<typeof Primitive.Root>) {
  return <Primitive.Root data-slot="toggle-group" className={cn("flex flex-wrap gap-2", className)} {...props} />;
}

export function ToggleGroupItem({ className, ...props }: ComponentProps<typeof Primitive.Item>) {
  return (
    <Primitive.Item
      data-slot="toggle-group-item"
      className={cn(
        "press inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border-2 border-transparent bg-secondary px-4 text-sm font-semibold text-secondary-foreground transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary [&_svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}
