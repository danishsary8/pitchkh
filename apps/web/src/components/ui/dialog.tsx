"use client";

import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { Drawer as Vaul } from "vaul";
import { useMediaQuery } from "@/lib/hooks";
import { cn } from "@/lib/utils";

/* ------------------------------ Dialog (desktop) ------------------------------ */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({ className, children, ...props }: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/55 duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex max-h-[min(88dvh,46rem)] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-3xl bg-popover p-6 text-popover-foreground shadow-2xl duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute top-3 right-3 grid size-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" aria-label="Close">
          <X className="size-5" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("pr-8 text-xl leading-snug font-bold", className)} {...props} />;
}
export function DialogDescription({ className, ...props }: ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

/* --------------------------- Drawer (bottom sheet) --------------------------- */
export const Drawer = Vaul.Root;
export const DrawerTrigger = Vaul.Trigger;
export const DrawerClose = Vaul.Close;

export function DrawerContent({ className, children, ...props }: ComponentProps<typeof Vaul.Content>) {
  return (
    <Vaul.Portal>
      <Vaul.Overlay className="fixed inset-0 z-50 bg-black/55" />
      <Vaul.Content
        data-slot="drawer-content"
        className={cn("fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-3xl bg-popover text-popover-foreground outline-none", className)}
        {...props}
      >
        <div aria-hidden className="mx-auto mt-2.5 h-1.5 w-11 shrink-0 rounded-full bg-foreground/20" />
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">{children}</div>
      </Vaul.Content>
    </Vaul.Portal>
  );
}
export function DrawerTitle({ className, ...props }: ComponentProps<typeof Vaul.Title>) {
  return <Vaul.Title className={cn("text-xl leading-snug font-bold", className)} {...props} />;
}
export function DrawerDescription({ className, ...props }: ComponentProps<typeof Vaul.Description>) {
  return <Vaul.Description className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

/* ------------------- Sheet: bottom sheet on phones, dialog on desktop ------------------- */
export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** Sticky action row at the bottom of the sheet. */
  footer?: ReactNode;
  className?: string;
}

export function Sheet({ open, onOpenChange, title, description, children, footer, className }: SheetProps) {
  const desktop = useMediaQuery("(min-width: 768px)");
  if (desktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={className} aria-describedby={description ? undefined : undefined}>
          <div className="flex flex-col gap-1">
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : <DialogDescription className="sr-only">{title}</DialogDescription>}
          </div>
          {children}
          {footer ? <div className="flex flex-wrap justify-end gap-2 pt-2">{footer}</div> : null}
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Drawer open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <DrawerContent className={className}>
        <div className="flex flex-col gap-1">
          <DrawerTitle>{title}</DrawerTitle>
          {description ? <DrawerDescription>{description}</DrawerDescription> : <DrawerDescription className="sr-only">{title}</DrawerDescription>}
        </div>
        {children}
        {footer ? <div className="sticky bottom-0 -mx-5 -mb-5 flex gap-2 bg-popover px-5 pt-3 pb-5 *:flex-1">{footer}</div> : null}
      </DrawerContent>
    </Drawer>
  );
}
