"use client";

import { ROLES, type Report, type Role, type User, type VenueDetail } from "@pitchkh/shared";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CalendarCheck, Check, Flag, Inbox, Search, ShieldAlert, Star, Swords, Users, Wallet, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Link } from "@/components/common/link";
import { PageHeader, Pagination, SportBadge } from "@/components/common/page";
import { EmptyState, ErrorState, useErrorMessage } from "@/components/common/states";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Avatar, Spinner, Switch } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminLinks } from "@/features/dashboard/nav";
import { BarChart, DashboardShell, Kpi, Panel, ResponsiveTable, ShareBars } from "@/features/dashboard/shared";
import { api } from "@/lib/api";
import { useDates, useMoney } from "@/lib/format";
import { qk } from "@/lib/query";

export function AdminShell({ children }: { children: ReactNode }) {
  const t = useTranslations("admin");
  return (
    <DashboardShell title={t("title")} links={useAdminLinks()}>
      {children}
    </DashboardShell>
  );
}

const SPORT_COLOR = { football: "var(--sport-football)", volleyball: "var(--sport-volleyball)", tennis: "var(--sport-tennis)" } as const;

export function AdminAnalytics() {
  const t = useTranslations();
  const money = useMoney();
  const dates = useDates();
  const { data, isPending, isError, error, refetch } = useQuery({ queryKey: qk.admin.analytics, queryFn: api.admin.analytics });
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;
  return (
    <>
      <PageHeader title={t("admin.nav.analytics")} subtitle={t("admin.analyticsBody")} />
      {isPending ? <div className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-busy>{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-28" />)}</div> : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Kpi tone="primary" icon={Wallet} label={t("admin.kpi.gmv")} value={money.usd(Math.round(data.gmvUsd))} hint={t("admin.kpi.fees", { amount: money.usd(data.platformFeesUsd) })} />
            <Kpi icon={CalendarCheck} label={t("admin.kpi.bookings")} value={data.bookings} />
            <Kpi icon={Users} label={t("admin.kpi.users")} value={data.users} hint={t("admin.kpi.usersHint", { players: data.players, owners: data.owners })} />
            <Kpi icon={Building2} label={t("admin.kpi.venues")} value={data.venues} />
            <Kpi tone={data.pendingVenues ? "accent" : "default"} icon={Inbox} label={t("admin.kpi.pendingVenues")} value={data.pendingVenues} />
            <Kpi tone={data.openReports ? "accent" : "default"} icon={ShieldAlert} label={t("admin.kpi.openReports")} value={data.openReports} />
            <Kpi icon={Swords} label={t("admin.kpi.openMatches")} value={data.openMatches} />
            <Kpi icon={Star} label={t("admin.kpi.avgBooking")} value={money.usd(data.bookings ? Math.round((data.gmvUsd / data.bookings) * 100) / 100 : 0)} />
          </div>
          <Panel title={t("admin.bookings14")}>
            <BarChart label={t("admin.bookings14")} format={(v) => String(v)} data={data.byDay.map((d) => ({ label: dates.dayOfMonth(d.date), hint: dates.day(d.date, false), value: d.bookings }))} />
          </Panel>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title={t("admin.bySport")}><ShareBars format={money.usd} rows={data.bySport.map((s) => ({ label: `${t(`sport.${s.sport}`)} · ${s.bookings}`, value: Math.round(s.revenueUsd), color: SPORT_COLOR[s.sport] }))} /></Panel>
            <Panel title={t("admin.byProvince")}><ShareBars format={(v) => String(v)} rows={data.byProvince.filter((p) => p.venues > 0).map((p) => ({ label: t("admin.provinceRow", { province: t(`province.${p.province}`), venues: p.venues }), value: p.bookings }))} /></Panel>
          </div>
        </div>
      )}
    </>
  );
}

const VENUE_VARIANT: Record<VenueDetail["status"], BadgeVariant> = { approved: "success", pending: "warning", rejected: "destructive", suspended: "muted" };

export function AdminVenues() {
  const t = useTranslations();
  const dates = useDates();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const [status, setStatus] = useState<VenueDetail["status"]>("pending");
  const [rejecting, setRejecting] = useState<VenueDetail | null>(null);
  const [note, setNote] = useState("");
  const query = { status, pageSize: 50 };
  const { data, isPending, isError, error, refetch } = useQuery({ queryKey: qk.admin.venues(query), queryFn: () => api.admin.venues(query) });
  const refresh = async (): Promise<void> => { await queryClient.invalidateQueries({ queryKey: ["admin"] }); await queryClient.invalidateQueries({ queryKey: ["venues"] }); };
  const moderate = useMutation({
    mutationFn: (v: { id: string; status: "approved" | "rejected" | "suspended"; note?: string }) => api.admin.moderateVenue(v.id, { status: v.status, note: v.note }),
    onSuccess: async (_d, v) => { await refresh(); setRejecting(null); setNote(""); toast.success(t(`admin.venueNow.${v.status}`)); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const feature = useMutation({ mutationFn: (v: { id: string; featured: boolean }) => api.admin.featureVenue(v.id, v.featured), onSuccess: async (_d, v) => { await refresh(); toast(t(v.featured ? "admin.featuredOn" : "admin.featuredOff")); }, onError: (e) => toast.error(errorMessage(e)) });

  return (
    <>
      <PageHeader title={t("admin.nav.venues")} subtitle={t("admin.venuesBody")} />
      <Tabs value={status} onValueChange={(v) => setStatus(v as VenueDetail["status"])} className="pb-4">
        <TabsList className="sm:w-fit">{(["pending", "approved", "rejected", "suspended"] as const).map((s) => <TabsTrigger key={s} value={s}>{t(`status.venue.${s}`)}</TabsTrigger>)}</TabsList>
      </Tabs>
      {isPending ? <div className="grid gap-4 xl:grid-cols-2" aria-busy>{[0, 1].map((i) => <Skeleton key={i} className="h-72" />)}</div> : isError ? <ErrorState error={error} onRetry={() => void refetch()} /> : data.data.length === 0 ? (
        <EmptyState icon={<Inbox />} title={t(`admin.emptyVenues.${status === "pending" ? "pending" : "other"}`)} />
      ) : (
        <ul className="grid gap-4 xl:grid-cols-2">
          {data.data.map((venue) => (
            <li key={venue.id} className="flex flex-col overflow-hidden rounded-3xl bg-card">
              <div className="relative aspect-[16/7] bg-pitch">{venue.photos[0] ? <Image src={venue.photos[0]} alt="" fill sizes="(min-width: 1280px) 40vw, 100vw" className="object-cover" /> : null}</div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={VENUE_VARIANT[venue.status]}>{t(`status.venue.${venue.status}`)}</Badge>
                  {venue.sports.map((s) => <SportBadge key={s} sport={s} />)}
                </div>
                <div>
                  <h2 className="text-xl leading-snug font-bold">{venue.name}</h2>
                  <p className="text-sm text-muted-foreground">{venue.address}, {venue.district}, {t(`province.${venue.province}`)}</p>
                </div>
                <p className="line-clamp-3 text-[0.95rem] text-pretty text-foreground/85">{venue.description}</p>
                <dl className="grid grid-cols-3 gap-2 text-sm">
                  <div><dt className="text-xs text-muted-foreground">{t("admin.owner")}</dt><dd className="font-semibold">{venue.owner.name}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">{t("venue.fields")}</dt><dd className="font-num font-semibold">{venue.fields.length} · ${venue.priceFromUsd}+</dd></div>
                  <div><dt className="text-xs text-muted-foreground">{t("admin.submitted")}</dt><dd className="font-semibold">{dates.ago(venue.createdAt)}</dd></div>
                </dl>
                {venue.moderationNote ? <p className="rounded-xl bg-secondary p-3 text-sm">{venue.moderationNote}</p> : null}
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                  {venue.status === "approved" ? (
                    <>
                      <label className="flex min-h-11 flex-1 items-center justify-between gap-3 rounded-full bg-secondary px-4 text-sm font-semibold">{t("admin.feature")}<Switch checked={venue.featured} disabled={feature.isPending} onCheckedChange={(featured) => feature.mutate({ id: venue.id, featured })} /></label>
                      <Button asChild variant="secondary"><Link href={`/venues/${venue.slug}`}>{t("admin.view")}</Link></Button>
                      <Button variant="outline" className="text-destructive" disabled={moderate.isPending} onClick={() => moderate.mutate({ id: venue.id, status: "suspended" })}>{t("admin.suspend")}</Button>
                    </>
                  ) : (
                    <>
                      {venue.status === "pending" ? <Button variant="outline" className="flex-1" onClick={() => setRejecting(venue)}><X />{t("admin.reject")}</Button> : null}
                      <Button className="flex-1" disabled={moderate.isPending} onClick={() => moderate.mutate({ id: venue.id, status: "approved" })}>{moderate.isPending ? <Spinner /> : <Check />}{t(venue.status === "pending" ? "admin.approve" : "admin.reinstate")}</Button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Sheet open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)} title={t("admin.rejectTitle", { name: rejecting?.name ?? "" })} description={t("admin.rejectBody")}
        footer={<><Button variant="secondary" onClick={() => setRejecting(null)}>{t("common.cancel")}</Button><Button variant="destructive" disabled={note.trim().length < 5 || moderate.isPending} onClick={() => rejecting && moderate.mutate({ id: rejecting.id, status: "rejected", note })}>{t("admin.reject")}</Button></>}>
        <Textarea aria-label={t("admin.rejectNote")} value={note} maxLength={400} onChange={(e) => setNote(e.target.value)} placeholder={t("admin.rejectPlaceholder")} />
      </Sheet>
    </>
  );
}

export function AdminUsers() {
  const t = useTranslations();
  const dates = useDates();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const [q, setQ] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [page, setPage] = useState(1);
  const query = { q: q || undefined, role: role || undefined, page, pageSize: 10 };
  const { data, isPending, isError, error, refetch } = useQuery({ queryKey: qk.admin.users(query), queryFn: () => api.admin.users(query), placeholderData: keepPreviousData });
  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: User["status"] }) => api.admin.setUserStatus(v.id, v.status),
    onSuccess: async (_d, v) => { await queryClient.invalidateQueries({ queryKey: ["admin", "users"] }); toast.success(t(v.status === "suspended" ? "admin.userSuspended" : "admin.userRestored")); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <>
      <PageHeader title={t("admin.nav.users")} subtitle={t("admin.usersBody")} />
      <div className="flex gap-2 pb-4">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input type="search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder={t("admin.searchUsers")} aria-label={t("admin.searchUsers")} className="pl-10" />
        </div>
        <Select aria-label={t("admin.role")} value={role} onChange={(e) => { setRole(e.target.value as Role | ""); setPage(1); }} className="w-auto">
          <option value="">{t("admin.allRoles")}</option>
          {ROLES.map((r) => <option key={r} value={r}>{t(`account.role.${r}`)}</option>)}
        </Select>
      </div>
      {isPending ? <Skeleton className="h-96" /> : isError ? <ErrorState error={error} onRetry={() => void refetch()} /> : data.data.length === 0 ? <EmptyState icon={<Users />} title={t("admin.noUsers")} /> : (
        <>
          <ResponsiveTable
            caption={t("admin.nav.users")}
            rows={data.data}
            rowKey={(u) => u.id}
            columns={[
              { header: t("common.name"), primary: true, cell: (u) => <span className="flex items-center gap-2.5"><Avatar name={u.name} className="size-8" />{u.name}</span> },
              { header: t("common.email"), cell: (u) => u.email },
              { header: t("admin.role"), cell: (u) => t(`account.role.${u.role}`) },
              { header: t("admin.joined"), cell: (u) => dates.ago(u.createdAt) },
              { header: t("common.status"), cell: (u) => <Badge variant={u.status === "active" ? "success" : "destructive"}>{t(`status.user.${u.status}`)}</Badge> },
            ]}
            actions={(u) => u.role === "admin" ? null : (
              <Button variant={u.status === "active" ? "outline" : "secondary"} size="sm" className="h-10" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: u.id, status: u.status === "active" ? "suspended" : "active" })}>
                {t(u.status === "active" ? "admin.suspend" : "admin.reinstate")}
              </Button>
            )}
          />
          <Pagination page={page} totalPages={data.meta.totalPages} onChange={setPage} />
        </>
      )}
    </>
  );
}

export function AdminReports() {
  const t = useTranslations();
  const dates = useDates();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const [status, setStatus] = useState<Report["status"]>("open");
  const [active, setActive] = useState<{ report: Report; outcome: "resolved" | "dismissed" } | null>(null);
  const [resolution, setResolution] = useState("");
  const query = { status, pageSize: 50 };
  const { data, isPending, isError, error, refetch } = useQuery({ queryKey: qk.admin.reports(query), queryFn: () => api.admin.reports(query) });
  const resolve = useMutation({
    mutationFn: () => api.admin.resolveReport(active?.report.id ?? "", { status: active?.outcome ?? "resolved", resolution }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["admin"] }); toast.success(t("admin.reportClosed")); setActive(null); setResolution(""); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <>
      <PageHeader title={t("admin.nav.reports")} subtitle={t("admin.reportsBody")} />
      <Tabs value={status} onValueChange={(v) => setStatus(v as Report["status"])} className="pb-4">
        <TabsList className="sm:w-fit">{(["open", "resolved", "dismissed"] as const).map((s) => <TabsTrigger key={s} value={s}>{t(`status.report.${s}`)}</TabsTrigger>)}</TabsList>
      </Tabs>
      {isPending ? <div className="flex flex-col gap-3" aria-busy>{[0, 1].map((i) => <Skeleton key={i} className="h-40" />)}</div> : isError ? <ErrorState error={error} onRetry={() => void refetch()} /> : data.data.length === 0 ? <EmptyState icon={<Flag />} title={t("admin.noReports")} /> : (
        <ul className="grid gap-3 xl:grid-cols-2">
          {data.data.map((report) => (
            <li key={report.id} className="flex flex-col gap-3 rounded-2xl bg-card p-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant={report.status === "open" ? "warning" : "muted"}>{t(`status.report.${report.status}`)}</Badge>
                <Badge variant="destructive">{t(`report.reasons.${report.reason}`)}</Badge>
                <Badge variant="outline">{t(`admin.target.${report.targetType}`)}</Badge>
                <span className="ml-auto text-xs text-muted-foreground">{dates.ago(report.createdAt)}</span>
              </div>
              <h2 className="text-lg leading-snug font-bold">{report.targetName}</h2>
              <p className="text-[0.95rem] text-pretty">{report.details}</p>
              <p className="text-sm text-muted-foreground">{t("admin.reportedBy", { name: report.reporterName })}</p>
              {report.resolution ? <p className="rounded-xl bg-secondary p-3 text-sm"><span className="font-semibold">{t("admin.resolution")}:</span> {report.resolution}</p> : null}
              {report.status === "open" ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" onClick={() => setActive({ report, outcome: "dismissed" })}>{t("admin.dismiss")}</Button>
                  <Button onClick={() => setActive({ report, outcome: "resolved" })}><Check />{t("admin.resolve")}</Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)} title={t(active?.outcome === "dismissed" ? "admin.dismissTitle" : "admin.resolveTitle")} description={active?.report.targetName}
        footer={<><Button variant="secondary" onClick={() => setActive(null)}>{t("common.cancel")}</Button><Button disabled={resolve.isPending} onClick={() => resolve.mutate()}>{resolve.isPending ? <Spinner /> : null}{t("common.confirm")}</Button></>}>
        <Textarea aria-label={t("admin.resolution")} value={resolution} maxLength={400} onChange={(e) => setResolution(e.target.value)} placeholder={t("admin.resolutionPlaceholder")} />
      </Sheet>
    </>
  );
}
