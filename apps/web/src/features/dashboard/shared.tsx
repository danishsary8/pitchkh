"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@/components/common/link";
import { Container } from "@/components/common/page";
import { usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export interface DashboardLink {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

/** Dashboard frame: sidebar on desktop, a scrollable pill row on phones. */
export function DashboardShell({ title, links, children }: { title: string; links: DashboardLink[]; children: ReactNode }) {
  const pathname = usePathname();
  const root = links[0]?.href ?? "";
  const isCurrent = (href: string): boolean => (href === root ? pathname === root : pathname.startsWith(href));
  return (
    <Container className="grid grid-cols-1 gap-x-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:pt-8">
      <nav aria-label={title} className="max-lg:sticky max-lg:top-(--header-h) max-lg:z-20 max-lg:-mx-4 max-lg:bg-background max-lg:py-2">
        <p className="font-display hidden px-4 pb-3 text-sm text-muted-foreground lg:block">{title}</p>
        <ul className="no-scrollbar flex gap-1.5 overflow-x-auto max-lg:px-4 lg:sticky lg:top-24 lg:flex-col lg:gap-1">
          {links.map((link) => (
            <li key={link.href} className="shrink-0">
              <Link href={link.href} aria-current={isCurrent(link.href) ? "page" : undefined} className="flex h-11 items-center gap-2.5 rounded-full px-4 text-[0.95rem] font-semibold whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:bg-foreground aria-[current=page]:text-background max-lg:bg-card lg:aria-[current=page]:bg-card lg:aria-[current=page]:text-foreground">
                <link.icon className="size-4.5" />
                {link.label}
                {link.badge ? <span className="font-num grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1.5 text-xs font-bold text-destructive-foreground">{link.badge}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="min-w-0 pb-6">{children}</div>
    </Container>
  );
}

export function Kpi({ label, value, hint, icon: Icon, tone = "default" }: { label: string; value: ReactNode; hint?: ReactNode; icon: LucideIcon; tone?: "default" | "primary" | "accent" }) {
  return (
    <div className={cn("flex flex-col gap-1 rounded-2xl p-4", tone === "primary" ? "bg-primary text-primary-foreground" : tone === "accent" ? "bg-accent text-accent-foreground" : "bg-card")}>
      <div className="flex items-center justify-between gap-2">
        <p className={cn("text-sm font-semibold", tone === "default" && "text-muted-foreground")}>{label}</p>
        <Icon className="size-4.5 opacity-70" aria-hidden />
      </div>
      <p className="font-num text-[1.7rem] leading-tight font-bold">{value}</p>
      {hint ? <p className={cn("text-xs", tone === "default" ? "text-muted-foreground" : "opacity-85")}>{hint}</p> : null}
    </div>
  );
}

/** Dependency-free bar chart. Screen readers get the same numbers as a table. */
export function BarChart({ data, format, label, className }: { data: { label: string; value: number; hint?: string }[]; format: (value: number) => string; label: string; className?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure className={cn("flex flex-col gap-2", className)}>
      <div className="flex h-44 items-end gap-1 sm:gap-1.5" aria-hidden>
        {data.map((d, i) => (
          <div key={`${d.label}-${i}`} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${d.hint ?? d.label}: ${format(d.value)}`}>
            <span className="font-num text-[0.65rem] font-semibold text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 max-sm:hidden">{format(d.value)}</span>
            <div className="w-full origin-bottom rounded-t-md bg-primary/85 transition-colors group-hover:bg-primary" style={{ height: `${Math.max(2, (d.value / max) * 100)}%` }} />
            <span className="font-num w-full truncate text-center text-[0.65rem] text-muted-foreground">{d.label}</span>
          </div>
        ))}
      </div>
      <figcaption className="sr-only">
        {label}
        <table>
          <tbody>{data.map((d, i) => <tr key={i}><th scope="row">{d.hint ?? d.label}</th><td>{format(d.value)}</td></tr>)}</tbody>
        </table>
      </figcaption>
    </figure>
  );
}

/** Horizontal share bars for small breakdowns (by sport, by payment method...). */
export function ShareBars({ rows, format }: { rows: { label: string; value: number; color?: string }[]; format: (value: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <li key={row.label} className="flex flex-col gap-1">
          <div className="flex justify-between gap-3 text-sm">
            <span className="truncate font-semibold">{row.label}</span>
            <span className="font-num shrink-0 text-muted-foreground">{format(row.value)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full" style={{ width: `${(row.value / max) * 100}%`, background: row.color ?? "var(--primary)" }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  /** Shown as the card title on phones. */
  primary?: boolean;
  align?: "right";
}

/** A real table on desktop; each row becomes a labelled card on phones. */
export function ResponsiveTable<T>({ columns, rows, rowKey, actions, caption }: { columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string; actions?: (row: T) => ReactNode; caption: string }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl bg-card md:block">
        <table className="w-full text-left text-[0.95rem]">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-border text-sm text-muted-foreground">
              {columns.map((c) => <th key={c.header} scope="col" className={cn("px-4 py-3 font-semibold", c.align === "right" && "text-right")}>{c.header}</th>)}
              {actions ? <th scope="col" className="px-4 py-3"><span className="sr-only">{caption}</span></th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((c) => <td key={c.header} className={cn("px-4 py-3 align-middle", c.align === "right" && "text-right", c.primary && "font-semibold")}>{c.cell(row)}</td>)}
                {actions ? <td className="px-4 py-2 text-right"><div className="flex justify-end gap-2">{actions(row)}</div></td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)} className="flex flex-col gap-3 rounded-2xl bg-card p-4">
            {columns.filter((c) => c.primary).map((c) => <div key={c.header} className="text-lg font-bold">{c.cell(row)}</div>)}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {columns.filter((c) => !c.primary).map((c) => (
                <div key={c.header} className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{c.header}</dt>
                  <dd className="font-semibold break-words">{c.cell(row)}</dd>
                </div>
              ))}
            </dl>
            {actions ? <div className="flex flex-wrap gap-2 *:flex-1">{actions(row)}</div> : null}
          </li>
        ))}
      </ul>
    </>
  );
}

export function Panel({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col gap-4 rounded-2xl bg-card p-4 sm:p-5", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
