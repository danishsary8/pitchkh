import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap [&_svg]:size-3.5", {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground",
      secondary: "bg-secondary text-secondary-foreground",
      accent: "bg-accent text-accent-foreground",
      outline: "border border-foreground/20 text-foreground",
      success: "bg-primary/12 text-primary",
      warning: "bg-warning-surface text-warning",
      destructive: "bg-destructive/12 text-destructive",
      muted: "bg-muted text-muted-foreground",
      football: "bg-football/12 text-football",
      volleyball: "bg-volleyball/12 text-volleyball",
      tennis: "bg-tennis/12 text-tennis",
    },
  },
  defaultVariants: { variant: "secondary" },
});

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

export function Badge({ className, variant, ...props }: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}
