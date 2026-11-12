"use client";

import { Check, Loader2 } from "lucide-react";
import { Avatar as AvatarPrimitive, Checkbox as CheckboxPrimitive, Separator as SeparatorPrimitive, Switch as SwitchPrimitive } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Separator({ className, orientation = "horizontal", ...props }: ComponentProps<typeof SeparatorPrimitive.Root>) {
  return <SeparatorPrimitive.Root data-slot="separator" decorative orientation={orientation} className={cn("shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px", className)} {...props} />;
}

export function Spinner({ className, ...props }: ComponentProps<"svg">) {
  return <Loader2 role="status" aria-label="Loading" className={cn("size-4 animate-spin", className)} {...props} />;
}

export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn("peer inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-input transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-50 data-[state=checked]:bg-primary", className)}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-5.5 translate-x-0.75 rounded-full bg-white transition-transform duration-150 ease-out data-[state=checked]:translate-x-5.75" />
    </SwitchPrimitive.Root>
  );
}

export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn("peer grid size-6 shrink-0 place-items-center rounded-md border-2 border-input bg-card transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground", className)}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check className="size-4" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

const AVATAR_COLORS = ["#0a7446", "#1a5fb4", "#c24a0c", "#8a3fb0", "#b0271f", "#0e7c86", "#7a5c0b"];

/** Initials avatar with a stable colour per name (no photo uploads in the mock). */
export function Avatar({ name, src, color, className }: { name: string; src?: string | null; color?: string; className?: string }) {
  const initials = name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  const background = color ?? AVATAR_COLORS[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % AVATAR_COLORS.length];
  return (
    <AvatarPrimitive.Root data-slot="avatar" className={cn("relative inline-flex size-10 shrink-0 overflow-hidden rounded-full", className)}>
      {src ? <AvatarPrimitive.Image src={src} alt="" className="size-full object-cover" /> : null}
      <AvatarPrimitive.Fallback delayMs={src ? 300 : 0} className="grid size-full place-items-center text-[0.8em] font-bold text-white" style={{ background }}>
        {initials}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

const ALERT_STYLES = {
  info: "bg-secondary text-secondary-foreground",
  warning: "bg-warning-surface text-warning",
  destructive: "bg-destructive/10 text-destructive",
  success: "bg-primary/10 text-primary",
} as const;

export function Alert({ variant = "info", icon, title, children, className }: { variant?: keyof typeof ALERT_STYLES; icon?: ReactNode; title?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div data-slot="alert" role={variant === "destructive" ? "alert" : "status"} className={cn("flex gap-3 rounded-xl p-3.5 text-sm", ALERT_STYLES[variant], className)}>
      {icon ? <span className="mt-0.5 shrink-0 [&_svg]:size-4.5">{icon}</span> : null}
      <div className="flex min-w-0 flex-col gap-0.5">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="text-foreground/85">{children}</div> : null}
      </div>
    </div>
  );
}
