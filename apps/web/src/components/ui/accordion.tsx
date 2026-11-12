"use client";

import { Plus } from "lucide-react";
import { Accordion as Primitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Accordion = Primitive.Root;

export function AccordionItem({ className, ...props }: ComponentProps<typeof Primitive.Item>) {
  return <Primitive.Item data-slot="accordion-item" className={cn("rounded-2xl bg-card", className)} {...props} />;
}

export function AccordionTrigger({ className, children, ...props }: ComponentProps<typeof Primitive.Trigger>) {
  return (
    <Primitive.Header className="flex">
      <Primitive.Trigger
        data-slot="accordion-trigger"
        className={cn("group flex min-h-14 flex-1 items-center justify-between gap-4 rounded-2xl px-4 py-3 text-left text-base font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
        {...props}
      >
        {children}
        <Plus className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 ease-out group-data-[state=open]:rotate-45" />
      </Primitive.Trigger>
    </Primitive.Header>
  );
}

export function AccordionContent({ className, children, ...props }: ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Content data-slot="accordion-content" className="overflow-hidden text-[0.95rem] text-foreground/85 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down" {...props}>
      <div className={cn("px-4 pb-4", className)}>{children}</div>
    </Primitive.Content>
  );
}
