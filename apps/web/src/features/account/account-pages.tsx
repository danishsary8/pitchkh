"use client";

import { PROVINCES, type BookingDetail, type NotificationType, type Province } from "@pitchkh/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CalendarCheck, CalendarDays, CalendarX2, CheckCheck, ChevronRight, Heart, LayoutDashboard, LogOut, MapPin, MessageCircle, RotateCcw, ShieldCheck, Star, Swords, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Link, useNavigate } from "@/components/common/link";
import { Stagger, StaggerItem } from "@/components/common/motion";
import { PageHeader, SportBadge, Stars } from "@/components/common/page";
import { Price } from "@/components/common/price";
import { EmptyState, ErrorState, useErrorMessage } from "@/components/common/states";
import { LocaleToggle, ThemeToggle } from "@/components/layout/controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Avatar, Spinner } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/features/auth/auth-provider";
import { BOOKING_STATUS_VARIANT } from "@/features/booking/booking-detail";
import { ConversationList } from "@/features/chat/chat";
import { MatchCard, MatchCardSkeleton } from "@/features/matches/match-card";
import { TeamForm, TeamSummary, useMyTeam } from "@/features/matches/team";
import { useVenueText } from "@/features/venues/text";
import { VenueCard, VenueCardSkeleton } from "@/features/venues/venue-card";
import { api } from "@/lib/api";
import { useDates } from "@/lib/format";
import { qk } from "@/lib/query";
import { cn } from "@/lib/utils";
import { useAccountLinks } from "./account-shell";

const ListSkeleton = ({ rows = 3, className = "h-28" }: { rows?: number; className?: string }) => (
  <div className="flex flex-col gap-3" aria-busy>{Array.from({ length: rows }, (_, i) => <Skeleton key={i} className={className} />)}</div>
);

/* ------------------------------- bookings ------------------------------- */
export function BookingCard({ booking, href }: { booking: BookingDetail; href?: string }) {
  const t = useTranslations();
  const dates = useDates();
  const text = useVenueText();
  return (
    <article className="relative flex gap-3 rounded-2xl bg-card p-3 sm:gap-4 sm:p-4">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-pitch sm:size-24">
        {booking.venue.photo ? <Image src={booking.venue.photo} alt="" fill sizes="96px" className="object-cover" /> : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={BOOKING_STATUS_VARIANT[booking.status]}>{t(`status.booking.${booking.status}`)}</Badge>
          <SportBadge sport={booking.sport} />
        </div>
        <h3 className="truncate text-base leading-snug font-bold sm:text-lg">
          <Link href={href ?? `/booking/${booking.id}`} className="rounded outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-ring">{text.name(booking.venue)}</Link>
        </h3>
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate">{dates.day(booking.date)} · <span className="font-num">{dates.range(booking.startAt, booking.endAt)}</span></span>
        </p>
        <p className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <span className="truncate">{booking.field.name} · <span className="font-num">{booking.code}</span></span>
          <Price usd={booking.price.totalUsd} className="shrink-0 text-foreground" khrClassName="hidden sm:inline" />
        </p>
      </div>
      <ChevronRight className="size-5 shrink-0 self-center text-muted-foreground" aria-hidden />
    </article>
  );
}

export function MyBookings() {
  const t = useTranslations();
  // ?tab=past opens the Past tab (e.g. from "See past bookings" on the reviews page).
  const [scope, setScope] = useState<"upcoming" | "past">(useSearchParams().get("tab") === "past" ? "past" : "upcoming");
  const query = { scope, pageSize: 30 };
  const { data, isPending, isError, error, refetch } = useQuery({ queryKey: qk.bookings(query), queryFn: () => api.bookings.list(query) });
  return (
    <>
      <PageHeader title={t("nav.myBookings")} />
      <Tabs value={scope} onValueChange={(v) => setScope(v as typeof scope)} className="pb-4">
        <TabsList className="sm:w-fit">
          <TabsTrigger value="upcoming">{t("account.upcoming")}</TabsTrigger>
          <TabsTrigger value="past">{t("account.past")}</TabsTrigger>
        </TabsList>
      </Tabs>
      {isPending ? <ListSkeleton /> : isError ? <ErrorState error={error} onRetry={() => void refetch()} /> : data.data.length === 0 ? (
        <EmptyState icon={scope === "upcoming" ? <CalendarCheck /> : <CalendarX2 />} title={t(scope === "upcoming" ? "account.noUpcomingTitle" : "account.noPastTitle")} body={t(scope === "upcoming" ? "account.noUpcomingBody" : "account.noPastBody")}>
          <Button asChild><Link href="/venues">{t("home.searchCta")}</Link></Button>
        </EmptyState>
      ) : (
        <Stagger key={scope} className="flex flex-col gap-3">
          {data.data.map((b) => <StaggerItem key={b.id}><BookingCard booking={b} /></StaggerItem>)}
        </Stagger>
      )}
    </>
  );
}

/* ------------------------------- favorites ------------------------------ */
export function MyFavorites() {
  const t = useTranslations();
  const query = { favorites: true, pageSize: 50 };
  const { data, isPending, isError, error, refetch } = useQuery({ queryKey: qk.venues(query), queryFn: () => api.venues.list(query) });
  return (
    <>
      <PageHeader title={t("nav.favorites")} />
      {isPending ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <VenueCardSkeleton key={i} />)}</div> : isError ? <ErrorState error={error} onRetry={() => void refetch()} /> : data.data.length === 0 ? (
        <EmptyState icon={<Heart />} title={t("account.noFavoritesTitle")} body={t("account.noFavoritesBody")}>
          <Button asChild><Link href="/venues">{t("home.searchCta")}</Link></Button>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{data.data.map((v) => <VenueCard key={v.id} venue={v} layout="auto" />)}</div>
      )}
    </>
  );
}

/* -------------------------------- matches ------------------------------- */
export function MyMatches() {
  const t = useTranslations();
  const query = { mine: true, pageSize: 30, sort: "soonest" as const };
  const { data, isPending, isError, error, refetch } = useQuery({ queryKey: qk.matches(query), queryFn: () => api.matches.list(query) });
  return (
    <>
      <PageHeader title={t("nav.myMatches")} action={<Button asChild variant="secondary"><Link href="/matches/new">{t("matches.post")}</Link></Button>} />
      {isPending ? <div className="grid gap-3 md:grid-cols-2">{[0, 1].map((i) => <MatchCardSkeleton key={i} />)}</div> : isError ? <ErrorState error={error} onRetry={() => void refetch()} /> : data.data.length === 0 ? (
        <EmptyState icon={<Swords />} title={t("account.noMatchesTitle")} body={t("account.noMatchesBody")}>
          <Button asChild><Link href="/matches">{t("home.matchCta")}</Link></Button>
        </EmptyState>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.data.map((m) => (
            <div key={m.id} className="flex flex-col gap-1.5">
              <p className="px-1 text-sm font-semibold text-muted-foreground">{m.isHost ? t("account.youHost") : t(`status.join.${m.myJoinRequest?.status ?? "pending"}`)}</p>
              <MatchCard match={m} className="flex-1" />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* -------------------------------- reviews ------------------------------- */
export function MyReviews() {
  const t = useTranslations();
  const dates = useDates();
  const { user } = useAuth();
  const mine = useQuery({ queryKey: qk.reviews({ authorId: user?.id, pageSize: 50 }), queryFn: () => api.reviews.list({ authorId: user?.id, pageSize: 50 }), enabled: !!user });
  const toRate = useQuery({ queryKey: qk.bookings({ scope: "past", status: "completed", pageSize: 20 }), queryFn: () => api.bookings.list({ scope: "past", status: "completed", pageSize: 20 }) });
  const pending = toRate.data?.data.filter((b) => !b.reviewed) ?? [];
  return (
    <>
      <PageHeader title={t("nav.reviews")} subtitle={t("account.reviewsBody")} />
      {pending.length > 0 ? (
        <section className="flex flex-col gap-3 pb-8" aria-labelledby="to-rate">
          <h2 id="to-rate" className="font-display text-xl">{t("account.waitingForRating")}</h2>
          {pending.map((b) => <BookingCard key={b.id} booking={b} />)}
        </section>
      ) : null}
      <section className="flex flex-col gap-3" aria-labelledby="written">
        <h2 id="written" className="font-display text-xl">{t("account.reviewsWritten")}</h2>
        {mine.isPending ? <ListSkeleton className="h-24" /> : mine.isError ? <ErrorState error={mine.error} onRetry={() => void mine.refetch()} /> : mine.data.data.length === 0 ? (
          <EmptyState icon={<Star />} title={t("account.noReviewsTitle")} body={t("account.noReviewsBody")}>
            <Button asChild variant="secondary"><Link href="/account/bookings?tab=past">{t("account.seePastBookings")}</Link></Button>
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {mine.data.data.map((r) => (
              <li key={r.id} className="flex flex-col gap-1.5 rounded-2xl bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold">{r.targetName} <Badge variant="secondary" className="ml-1">{t(r.targetType === "venue" ? "account.venueReview" : "account.teamReview")}</Badge></p>
                  <Stars value={r.rating} />
                </div>
                {r.comment ? <p className="text-[0.95rem] text-pretty">{r.comment}</p> : null}
                <p className="text-xs text-muted-foreground">{dates.ago(r.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

/* ----------------------------- notifications ---------------------------- */
const NOTIF_ICON: Partial<Record<NotificationType, typeof Bell>> = { booking_confirmed: CalendarCheck, booking_pending: CalendarDays, booking_rejected: CalendarX2, booking_cancelled: CalendarX2, join_request: Swords, join_accepted: Trophy, message: MessageCircle, review: Star, venue_approved: ShieldCheck };

export function Notifications() {
  const t = useTranslations();
  const dates = useDates();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isPending, isError, error, refetch } = useQuery({ queryKey: qk.notifications, queryFn: api.notifications.list });
  const readAll = useMutation({ mutationFn: api.notifications.markAllRead, onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.notifications }) });
  const open = useMutation({ mutationFn: (id: string) => api.notifications.markRead(id), onSettled: () => queryClient.invalidateQueries({ queryKey: qk.notifications }) });
  const unread = data?.filter((n) => !n.read).length ?? 0;
  return (
    <>
      <PageHeader title={t("nav.notifications")} action={unread > 0 ? <Button variant="secondary" size="sm" className="h-10" disabled={readAll.isPending} onClick={() => readAll.mutate()}><CheckCheck />{t("account.markAllRead")}</Button> : undefined} />
      {isPending ? <ListSkeleton rows={4} className="h-18" /> : isError ? <ErrorState error={error} onRetry={() => void refetch()} /> : data.length === 0 ? (
        <EmptyState icon={<Bell />} title={t("account.noNotificationsTitle")} body={t("account.noNotificationsBody")} />
      ) : (
        <ul className="flex flex-col gap-2">
          {data.map((n) => {
            const Icon = NOTIF_ICON[n.type] ?? Bell;
            return (
              <li key={n.id}>
                <button type="button" onClick={() => { if (!n.read) open.mutate(n.id); navigate(n.href); }} className={cn("press flex w-full items-center gap-3 rounded-2xl p-3.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring", n.read ? "bg-transparent" : "bg-card")}>
                  <span className={cn("grid size-11 shrink-0 place-items-center rounded-full", n.read ? "bg-secondary text-muted-foreground" : "bg-primary/12 text-primary")}><Icon className="size-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-[0.95rem] text-pretty", !n.read && "font-semibold")}>{t(`notif.${n.type}`, n.params as Record<string, string>)}</span>
                    <span className="block text-xs text-muted-foreground">{dates.ago(n.createdAt)}</span>
                  </span>
                  {!n.read ? <span className="size-2.5 shrink-0 rounded-full bg-primary" aria-label={t("account.unread")} /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

/* -------------------------------- messages ------------------------------ */
export function Messages() {
  const t = useTranslations("chat");
  return (
    <>
      <PageHeader title={t("title")} />
      <ConversationList />
    </>
  );
}

/* ---------------------------------- team -------------------------------- */
export function MyTeam() {
  const t = useTranslations();
  const { user } = useAuth();
  const team = useMyTeam(!!user);
  return (
    <>
      <PageHeader title={t("nav.myTeam")} subtitle={t("team.createBody")} />
      {team.isPending ? <Skeleton className="h-72" /> : (
        <div className="grid gap-5 lg:grid-cols-2">
          {team.data ? <TeamSummary team={team.data} className="self-start" /> : null}
          <div className="rounded-3xl bg-card p-5"><TeamForm key={team.data?.id ?? "new"} team={team.data ?? null} submitLabel={team.data ? undefined : t("team.createCta")} /></div>
        </div>
      )}
    </>
  );
}

/* --------------------------------- profile ------------------------------ */
export function Profile() {
  const t = useTranslations();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const links = useAccountLinks().filter((l) => l.href !== "/account");
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [province, setProvince] = useState<Province>(user?.homeProvince ?? "phnom_penh");
  const save = useMutation({ mutationFn: () => api.auth.updateProfile({ name, phone, homeProvince: province }), onSuccess: () => toast.success(t("common.saved")), onError: (e) => toast.error(errorMessage(e)) });
  const reset = useMutation({
    mutationFn: async () => { await api.resetMockData(); await api.auth.logout(); },
    onSuccess: () => { queryClient.clear(); toast(t("account.demoReset")); navigate("/"); },
  });
  if (!user) return null;
  return (
    <>
      <PageHeader title={t("nav.profile")} />
      <div className="flex flex-col gap-5">
        <section className="flex items-center gap-4 rounded-3xl bg-card p-4 sm:p-5">
          <Avatar name={user.name} src={user.avatarUrl} className="size-16 text-xl" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-bold">{user.name}</p>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            <Badge variant="success" className="mt-1.5">{t(`account.role.${user.role}`)}</Badge>
          </div>
        </section>

        {user.role !== "player" ? (
          <Button asChild size="lg" variant="accent">
            <Link href={user.role === "admin" ? "/admin" : "/owner"}>
              {user.role === "admin" ? <ShieldCheck /> : <LayoutDashboard />}
              {user.role === "admin" ? t("nav.adminPanel") : t("nav.ownerDashboard")}
            </Link>
          </Button>
        ) : null}

        <nav aria-label={t("nav.account")} className="overflow-hidden rounded-3xl bg-card lg:hidden">
          <ul className="divide-y divide-border">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="flex min-h-14 items-center gap-3 px-4 font-semibold outline-none focus-visible:bg-secondary">
                  <link.icon className="size-5 text-primary" />
                  <span className="flex-1">{link.label}</span>
                  <ChevronRight className="size-5 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <form className="rounded-3xl bg-card p-5" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <FieldGroup>
            <h2 className="text-lg font-bold">{t("account.details")}</h2>
            <Field>
              <FieldLabel htmlFor="p-name">{t("auth.name")}</FieldLabel>
              <Input id="p-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
            </Field>
            <Field>
              <FieldLabel htmlFor="p-phone">{t("auth.phone")}</FieldLabel>
              <Input id="p-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required minLength={8} />
            </Field>
            <Field>
              <FieldLabel htmlFor="p-province">{t("account.homeProvince")}</FieldLabel>
              <Select id="p-province" value={province} onChange={(e) => setProvince(e.target.value as Province)}>
                {PROVINCES.map((p) => <option key={p} value={p}>{t(`province.${p}`)}</option>)}
              </Select>
            </Field>
            <Button type="submit" disabled={save.isPending} className="sm:w-fit">
              {save.isPending ? <Spinner /> : null}
              {t("common.save")}
            </Button>
          </FieldGroup>
        </form>

        <section className="flex flex-col divide-y divide-border rounded-3xl bg-card px-5">
          <div className="flex min-h-16 items-center justify-between gap-3"><span className="font-semibold">{t("common.language")}</span><LocaleToggle className="bg-secondary" /></div>
          <div className="flex min-h-16 items-center justify-between gap-3"><span className="font-semibold">{t("common.theme")}</span><ThemeToggle className="bg-secondary" /></div>
          {api.mode === "mock" ? (
            <div className="flex min-h-16 items-center justify-between gap-3 py-3">
              <span><span className="block font-semibold">{t("account.demoData")}</span><span className="block text-sm text-muted-foreground">{t("account.demoDataBody")}</span></span>
              <Button variant="secondary" size="sm" className="h-10 shrink-0" disabled={reset.isPending} onClick={() => reset.mutate()}>{reset.isPending ? <Spinner /> : <RotateCcw />}{t("account.reset")}</Button>
            </div>
          ) : null}
        </section>

        <Button variant="outline" size="lg" onClick={() => void logout().then(() => { toast(t("nav.signedOut")); navigate("/"); })}>
          <LogOut />
          {t("nav.signOut")}
        </Button>
        <p className="flex items-center justify-center gap-1 text-sm text-muted-foreground"><MapPin className="size-4" />{t("footer.rate")}</p>
      </div>
    </>
  );
}
