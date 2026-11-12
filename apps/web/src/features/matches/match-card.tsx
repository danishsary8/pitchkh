"use client";

import type { MatchRequestDetail } from "@pitchkh/shared";
import { CalendarDays, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/components/common/link";
import { SportBadge } from "@/components/common/page";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { useVenueText } from "@/features/venues/text";
import { useDates } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_VARIANT = { open: "success", matched: "accent", cancelled: "muted", expired: "muted" } as const;

/** One row on the match board: who is playing, when, where, and on what terms. */
export function MatchCard({ match, compact = false, className }: { match: MatchRequestDetail; compact?: boolean; className?: string }) {
  const t = useTranslations();
  const dates = useDates();
  const text = useVenueText();
  return (
    <article className={cn("relative flex flex-col gap-3 rounded-2xl bg-card p-4", className)}>
      <div className="flex flex-wrap items-center gap-1.5">
        <SportBadge sport={match.sport} />
        <Badge variant="secondary">{t(`level.${match.level}`)}</Badge>
        <Badge variant="outline" className="font-num">{t("matches.aSide", { count: match.teamSize })}</Badge>
        {match.status !== "open" || !compact ? <Badge variant={STATUS_VARIANT[match.status]} className="ml-auto">{t(`status.match.${match.status}`)}</Badge> : null}
      </div>
      <div className="flex items-center gap-3">
        <Avatar name={match.hostTeam.name} color={match.hostTeam.color} className="size-11" />
        <h3 className="min-w-0 flex-1 text-lg leading-snug font-bold">
          <Link href={`/matches/${match.id}`} className="rounded-md outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-ring">
            {match.hostTeam.name}
          </Link>
          <span className="block text-sm font-normal text-muted-foreground">
            {match.opponentTeam ? `${t("matches.vs")} ${match.opponentTeam.name}` : t("matches.lookingForOpponent")}
          </span>
        </h3>
      </div>
      <dl className="flex flex-col gap-1.5 text-sm">
        <div className="flex items-center gap-2">
          <dt><CalendarDays className="size-4 text-muted-foreground" aria-label={t("common.date")} /></dt>
          <dd className="font-semibold">
            {dates.day(match.date)} · <span className="font-num">{dates.range(match.startAt, match.endAt)}</span>
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <dt><MapPin className="size-4 text-muted-foreground" aria-hidden /></dt>
          <dd className="truncate text-muted-foreground">
            {text.name(match.venue)} · {match.venue.district}
          </dd>
        </div>
      </dl>
      {compact ? null : (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">{t(`matches.costSplit.${match.costSplit}`)} · {match.bookingId ? t("matches.fieldBooked") : t("matches.fieldNotBooked")}</span>
          {match.status === "open" ? <span className="font-semibold text-primary">{t("matches.requests", { count: match.pendingCount })}</span> : null}
        </div>
      )}
    </article>
  );
}

export function MatchCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-card p-4" aria-hidden>
      <div className="flex gap-2"><Skeleton className="h-6 w-20 rounded-full" /><Skeleton className="h-6 w-24 rounded-full" /></div>
      <div className="flex items-center gap-3"><Skeleton className="size-11 rounded-full" /><Skeleton className="h-6 w-1/2" /></div>
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}
