"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MATCH_SPORTS, schemas, SKILL_LEVELS, type Team, type UpsertTeamDto } from "@pitchkh/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Handshake, Trophy, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { SportBadge, Stars } from "@/components/common/page";
import { useErrorMessage } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Avatar, Spinner } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useDates } from "@/lib/format";
import { qk } from "@/lib/query";
import { cn } from "@/lib/utils";

/** Compact team summary: name, level, record and sportsmanship rating. */
export function TeamSummary({ team, onOpen, className }: { team: Team; onOpen?: () => void; className?: string }) {
  const t = useTranslations();
  return (
    <div className={cn("flex flex-col gap-3 rounded-2xl bg-card p-4", className)}>
      <div className="flex items-center gap-3">
        <Avatar name={team.name} color={team.color} className="size-12" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg leading-snug font-bold">{team.name}</p>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            <SportBadge sport={team.sport} />
            <Badge variant="secondary">{t(`level.${team.level}`)}</Badge>
          </div>
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-xl bg-secondary p-2">
          <dt className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><Users className="size-3.5" />{t("team.members")}</dt>
          <dd className="font-num text-lg font-bold">{team.memberCount}</dd>
        </div>
        <div className="rounded-xl bg-secondary p-2">
          <dt className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><Trophy className="size-3.5" />{t("team.record")}</dt>
          <dd className="font-num text-lg font-bold">{team.wins}/{team.matchesPlayed}</dd>
        </div>
        <div className="rounded-xl bg-secondary p-2">
          <dt className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><Handshake className="size-3.5" />{t("team.fairPlay")}</dt>
          <dd className="font-num text-lg font-bold">{team.sportsmanshipCount ? team.sportsmanship.toFixed(1) : "–"}</dd>
        </div>
      </dl>
      {team.bio ? <p className="text-[0.95rem] text-pretty text-foreground/85">{team.bio}</p> : null}
      {onOpen ? (
        <Button variant="secondary" onClick={onOpen}>
          {t("team.viewProfile")}
        </Button>
      ) : null}
    </div>
  );
}

/** Opponent team profile with what other captains said about them. */
export function TeamProfileSheet({ teamId, open, onOpenChange }: { teamId: string | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations();
  const dates = useDates();
  const { data, isPending } = useQuery({ queryKey: qk.team(teamId ?? ""), queryFn: () => api.matches.team(teamId ?? ""), enabled: open && !!teamId });
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={data?.team.name ?? t("team.profile")} description={data ? t("team.captain", { name: data.captainName }) : undefined}>
      {isPending || !data ? (
        <div className="flex flex-col gap-3"><Skeleton className="h-40" /><Skeleton className="h-20" /></div>
      ) : (
        <>
          <TeamSummary team={data.team} className="bg-secondary/60 p-0 [&_dl>div]:bg-card" />
          <section className="flex flex-col gap-2.5">
            <h3 className="font-bold">{t("team.sportsmanship")} <span className="font-num font-normal text-muted-foreground">({data.reviews.length})</span></h3>
            {data.reviews.length === 0 ? <p className="text-sm text-muted-foreground">{t("team.noReviews")}</p> : null}
            <ul className="flex flex-col gap-2">
              {data.reviews.map((review) => (
                <li key={review.id} className="rounded-xl bg-secondary p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold">{review.authorName}</span>
                    <Stars value={review.rating} />
                  </div>
                  <p className="pt-1 text-pretty">{review.comment}</p>
                  <p className="pt-1 text-xs text-muted-foreground">{dates.ago(review.createdAt)}</p>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </Sheet>
  );
}

/** Create or edit the signed-in captain's team. */
export function TeamForm({ team, onSaved, submitLabel }: { team: Team | null; onSaved?: (team: Team) => void; submitLabel?: string }) {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const form = useForm<UpsertTeamDto, unknown, UpsertTeamDto>({
    resolver: zodResolver(schemas.UpsertTeamDto) as never,
    defaultValues: { name: team?.name ?? "", sport: team?.sport ?? "football", level: team?.level ?? "intermediate", memberCount: team?.memberCount ?? 7, bio: team?.bio ?? "" },
  });
  const { errors } = form.formState;
  const save = useMutation({
    mutationFn: (dto: UpsertTeamDto) => api.auth.saveTeam(dto),
    onSuccess: async (saved) => {
      queryClient.setQueryData(qk.myTeam, saved);
      await queryClient.invalidateQueries({ queryKey: ["matches"] });
      toast.success(t("team.saved"));
      onSaved?.(saved);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <form onSubmit={form.handleSubmit((dto) => save.mutate(dto))} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="team-name">{t("team.name")}</FieldLabel>
          <Input id="team-name" aria-invalid={!!errors.name} {...form.register("name")} />
          <FieldError>{errors.name ? t("errors.required") : null}</FieldError>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="team-sport">{t("venues.filterSport")}</FieldLabel>
            <Select id="team-sport" {...form.register("sport")}>
              {MATCH_SPORTS.map((s) => <option key={s} value={s}>{t(`sport.${s}`)}</option>)}
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="team-level">{t("team.level")}</FieldLabel>
            <Select id="team-level" {...form.register("level")}>
              {SKILL_LEVELS.map((l) => <option key={l} value={l}>{t(`level.${l}`)}</option>)}
            </Select>
          </Field>
        </div>
        <Field data-invalid={!!errors.memberCount}>
          <FieldLabel htmlFor="team-members">{t("team.memberCount")}</FieldLabel>
          <Input id="team-members" type="number" inputMode="numeric" min={1} max={40} aria-invalid={!!errors.memberCount} {...form.register("memberCount")} />
          <FieldError>{errors.memberCount ? t("errors.required") : null}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="team-bio">{t("team.bio")}</FieldLabel>
          <Textarea id="team-bio" maxLength={400} placeholder={t("team.bioPlaceholder")} {...form.register("bio")} />
        </Field>
        <Button type="submit" size="lg" disabled={save.isPending}>
          {save.isPending ? <Spinner /> : null}
          {submitLabel ?? t("common.save")}
        </Button>
      </FieldGroup>
    </form>
  );
}

export function useMyTeam(enabled: boolean) {
  return useQuery({ queryKey: qk.myTeam, queryFn: api.auth.myTeam, enabled });
}
