"use client";

import type { JoinRequestDetail, JoinStatus } from "@pitchkh/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Check, Coins, Flag, MapPin, MessageCircle, Star, X } from "lucide-react";
import { useNow, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Link, useNavigate } from "@/components/common/link";
import { Container, PageHeader, SportBadge } from "@/components/common/page";
import { ErrorState, useErrorMessage } from "@/components/common/states";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { Alert, Avatar, Spinner } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-provider";
import { ReviewSheet } from "@/features/booking/review-sheet";
import { ReportSheet } from "@/features/venues/report-sheet";
import { useVenueText } from "@/features/venues/text";
import { api } from "@/lib/api";
import { useDates } from "@/lib/format";
import { qk } from "@/lib/query";
import { TeamProfileSheet, TeamSummary } from "./team";

const JOIN_VARIANT: Record<JoinStatus, BadgeVariant> = { pending: "warning", accepted: "success", declined: "muted" };

export function MatchDetail({ id }: { id: string }) {
  const t = useTranslations();
  const dates = useDates();
  const text = useVenueText();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const now = useNow();
  const [joinOpen, setJoinOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [profileTeam, setProfileTeam] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const { data: match, isPending, isError, error, refetch } = useQuery({ queryKey: qk.match(id), queryFn: () => api.matches.get(id) });

  const settle = { onSuccess: async (updated: NonNullable<typeof match>) => { queryClient.setQueryData(qk.match(id), updated); await queryClient.invalidateQueries({ queryKey: ["matches", "list"] }); await queryClient.invalidateQueries({ queryKey: qk.conversations }); }, onError: (e: unknown) => { toast.error(errorMessage(e)); } };
  const join = useMutation({ mutationFn: () => api.matches.join(id, message), ...settle, onSuccess: async (m) => { await settle.onSuccess(m); setJoinOpen(false); toast.success(t("matches.requestSent")); } });
  const withdraw = useMutation({ mutationFn: () => api.matches.withdraw(id), ...settle });
  const cancel = useMutation({ mutationFn: () => api.matches.cancel(id), ...settle });
  // Optimistic accept/decline: the row updates instantly and rolls back on failure.
  const decide = useMutation({
    mutationFn: (v: { requestId: string; decision: "accept" | "decline" }) => api.matches.decide(id, v.requestId, v.decision),
    onMutate: async (v) => {
      await queryClient.cancelQueries({ queryKey: qk.match(id) });
      const previous = queryClient.getQueryData<typeof match>(qk.match(id));
      if (previous) queryClient.setQueryData(qk.match(id), { ...previous, joinRequests: previous.joinRequests.map((j) => (j.id === v.requestId ? { ...j, status: v.decision === "accept" ? "accepted" : "declined" } : j)) });
      return { previous };
    },
    onError: (e, _v, context) => { if (context?.previous) queryClient.setQueryData(qk.match(id), context.previous); toast.error(errorMessage(e)); },
    onSuccess: async (updated, v) => { await settle.onSuccess(updated); toast.success(t(v.decision === "accept" ? "matches.accepted" : "matches.declined")); },
  });

  if (isPending) return <Container size="md" className="flex flex-col gap-4 py-8"><Skeleton className="h-9 w-2/3" /><Skeleton className="h-48" /><Skeleton className="h-40" /></Container>;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} className="my-auto" />;

  const ended = Date.parse(match.endAt) < now.getTime();
  const mine = match.myJoinRequest;
  const rival = match.isHost ? match.opponentTeam : match.hostTeam;
  const canRate = match.status === "matched" && ended && rival && (match.isHost || mine?.status === "accepted");

  const requestRow = (j: JoinRequestDetail) => (
    <li key={j.id} className="flex flex-col gap-3 rounded-2xl bg-card p-4">
      <div className="flex items-center gap-3">
        <Avatar name={j.team.name} color={j.team.color} className="size-11" />
        <div className="min-w-0 flex-1">
          <button type="button" onClick={() => setProfileTeam(j.teamId)} className="block max-w-full truncate rounded text-left font-bold underline-offset-4 hover:underline">{j.team.name}</button>
          <p className="text-sm text-muted-foreground">{t(`level.${j.team.level}`)} · {t("team.fairPlay")} <span className="font-num">{j.team.sportsmanshipCount ? j.team.sportsmanship.toFixed(1) : "–"}</span> · {dates.ago(j.createdAt)}</p>
        </div>
        {j.status !== "pending" ? <Badge variant={JOIN_VARIANT[j.status]}>{t(`status.join.${j.status}`)}</Badge> : null}
      </div>
      {j.message ? <p className="rounded-xl bg-secondary p-3 text-[0.95rem]">{j.message}</p> : null}
      {j.status === "pending" && match.status === "open" ? (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" disabled={decide.isPending} onClick={() => decide.mutate({ requestId: j.id, decision: "decline" })}><X />{t("matches.decline")}</Button>
          <Button disabled={decide.isPending} onClick={() => decide.mutate({ requestId: j.id, decision: "accept" })}><Check />{t("matches.accept")}</Button>
        </div>
      ) : null}
    </li>
  );

  return (
    <Container size="md" className="pb-8">
      <PageHeader title={match.opponentTeam ? `${match.hostTeam.name} ${t("matches.vs")} ${match.opponentTeam.name}` : t("matches.detailTitle", { team: match.hostTeam.name })} back="/matches" />
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <section className="flex flex-col gap-4 rounded-3xl bg-card p-5">
            <div className="flex flex-wrap gap-1.5">
              <SportBadge sport={match.sport} />
              <Badge variant="secondary">{t(`level.${match.level}`)}</Badge>
              <Badge variant="outline" className="font-num">{t("matches.aSide", { count: match.teamSize })}</Badge>
              <Badge variant={match.status === "open" ? "success" : match.status === "matched" ? "accent" : "muted"}>{t(`status.match.${match.status}`)}</Badge>
            </div>
            <dl className="flex flex-col gap-3 text-[0.95rem]">
              <div className="flex gap-3"><dt><CalendarDays className="size-5 text-primary" aria-label={t("common.date")} /></dt><dd className="font-semibold">{dates.dayLong(match.date)}<br /><span className="font-num">{dates.range(match.startAt, match.endAt)}</span></dd></div>
              <div className="flex gap-3"><dt><MapPin className="size-5 text-primary" aria-hidden /></dt><dd><Link href={`/venues/${match.venue.slug}`} className="font-semibold underline-offset-4 hover:underline">{text.name(match.venue)}</Link><br /><span className="text-muted-foreground">{match.fieldName ? `${match.fieldName} · ` : ""}{match.venue.district}, {t(`province.${match.venue.province}`)}</span></dd></div>
              <div className="flex gap-3"><dt><Coins className="size-5 text-primary" aria-hidden /></dt><dd><span className="font-semibold">{t(`matches.costSplit.${match.costSplit}`)}</span><br /><span className="text-muted-foreground">{match.bookingId ? t("matches.fieldBooked") : t("matches.fieldNotBooked")}</span></dd></div>
            </dl>
            {match.note ? <p className="rounded-2xl bg-secondary p-3.5 text-[0.95rem] text-pretty">“{match.note}”</p> : null}
            <p className="text-sm text-muted-foreground">{t("matches.hostedBy", { name: match.hostName })}</p>
          </section>

          {match.conversationId ? (
            <Button asChild size="lg" variant="accent"><Link href={`/account/messages/${match.conversationId}`}><MessageCircle />{t("matches.openChat")}</Link></Button>
          ) : null}
          {canRate && rival ? <Button size="lg" variant="secondary" onClick={() => setReviewOpen(true)}><Star />{t("matches.rateOpponent", { team: rival.name })}</Button> : null}

          {match.isHost ? (
            <section className="flex flex-col gap-3" aria-labelledby="req-title">
              <h2 id="req-title" className="font-display text-xl">{t("matches.joinRequests")} <span className="font-num text-muted-foreground">({match.joinRequests.length})</span></h2>
              {match.joinRequests.length === 0 ? <p className="rounded-2xl bg-card p-4 text-muted-foreground">{t("matches.noRequests")}</p> : <ul className="flex flex-col gap-3">{match.joinRequests.map(requestRow)}</ul>}
              {match.status === "open" ? <Button variant="ghost" className="w-fit text-destructive" disabled={cancel.isPending} onClick={() => cancel.mutate()}>{t("matches.cancelMatch")}</Button> : null}
            </section>
          ) : mine ? (
            <Alert variant={mine.status === "accepted" ? "success" : mine.status === "declined" ? "destructive" : "warning"} title={t(`matches.myRequest.${mine.status}`)}>
              {mine.status === "pending" ? <button type="button" className="font-semibold underline underline-offset-4" disabled={withdraw.isPending} onClick={() => withdraw.mutate()}>{t("matches.withdraw")}</button> : null}
            </Alert>
          ) : match.status === "open" && !ended ? (
            <Button size="lg" onClick={() => (user ? setJoinOpen(true) : navigate(`/login?next=/matches/${id}`))}>{t("matches.askToJoin")}</Button>
          ) : null}
        </div>

        <aside className="flex flex-col gap-3">
          <h2 className="font-display text-xl">{t("matches.hostTeam")}</h2>
          <TeamSummary team={match.hostTeam} onOpen={() => setProfileTeam(match.hostTeamId)} />
          {match.opponentTeam ? (<><h2 className="font-display pt-2 text-xl">{t("matches.opponent")}</h2><TeamSummary team={match.opponentTeam} onOpen={() => setProfileTeam(match.opponentTeam?.id ?? null)} /></>) : null}
          {!match.isHost ? <Button variant="ghost" size="sm" className="h-10 w-fit" onClick={() => (user ? setReportOpen(true) : navigate(`/login?next=/matches/${id}`))}><Flag />{t("matches.report")}</Button> : null}
        </aside>
      </div>

      <Sheet open={joinOpen} onOpenChange={setJoinOpen} title={t("matches.joinTitle", { team: match.hostTeam.name })} description={t("matches.joinBody")} footer={<><Button variant="secondary" onClick={() => setJoinOpen(false)}>{t("common.cancel")}</Button><Button disabled={join.isPending} onClick={() => join.mutate()}>{join.isPending ? <Spinner /> : null}{t("matches.sendRequest")}</Button></>}>
        <Textarea aria-label={t("matches.joinMessage")} value={message} maxLength={300} onChange={(e) => setMessage(e.target.value)} placeholder={t("matches.joinPlaceholder")} />
        {user && !user.teamId ? <Alert variant="warning">{t("matches.needTeam")} <Link href="/account/team" className="font-semibold underline">{t("team.createCta")}</Link></Alert> : null}
      </Sheet>
      <TeamProfileSheet teamId={profileTeam} open={!!profileTeam} onOpenChange={(o) => !o && setProfileTeam(null)} />
      <ReportSheet open={reportOpen} onOpenChange={setReportOpen} targetType="match" targetId={match.id} />
      {rival ? <ReviewSheet open={reviewOpen} onOpenChange={setReviewOpen} targetType="team" targetId={rival.id} targetName={rival.name} /> : null}
    </Container>
  );
}
