import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div data-slot="skeleton" aria-hidden className={cn("relative overflow-hidden rounded-xl bg-foreground/8", className)} {...props}>
      <div className="absolute inset-0 animate-shimmer bg-linear-to-r from-transparent via-background/50 to-transparent" />
    </div>
  );
}
