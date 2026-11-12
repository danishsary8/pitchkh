"use client";

import { addDays, COST_SPLITS, MATCH_SPORTS, minutesOf, SKILL_LEVELS, timeOf, type CostSplit, type MatchSport, type SkillLevel } from "@pitchkh/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { SportIcon } from "@/components/brand/pitch-art";
import { useNavigate } from "@/components/common/link";
import { Container, PageHeader } from "@/components/common/page";
import { useErrorMessage } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Alert, Spinner } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAuth } from "@/features/auth/auth-provider";
import { useVenueText } from "@/features/venues/text";
import { api } from "@/lib/api";
import { useDates } from "@/lib/format";
import { qk } from "@/lib/query";
import { TeamForm, useMyTeam } from "./team";

const TIMES = Array.from({ length: 33 }, (_, i) => timeOf(6 * 60 + i * 30));

export function MatchCreate() {
  const t = useTranslations();
  const dates = useDates();
  const text = useVenueText();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const { user } = useAuth();
  const team = useMyTeam(!!user);
  const [sport, setSport] = useState<MatchSport | null>(null);
  const [venueId, setVenueId] = useState("");
  const [date, setDate] = useState(addDays(dates.today, 1));
  const [startTime, setStartTime] = useState("18:00");
  const [duration, setDuration] = useState(90);
  const [level, setLevel] = useState<SkillLevel | null>(null);
  const [teamSize, setTeamSize] = useState(7);
  const [costSplit, setCostSplit] = useState<CostSplit>("split");
  const [note, setNote] = useState("");

  const activeSport = sport ?? team.data?.sport ?? "football";
  const venues = useQuery({ queryKey: qk.venues({ sport: activeSport, pageSize: 50 }), queryFn: () => api.venues.list({ sport: activeSport, pageSize: 50 }) });
  const venue = venues.data?.data.find((v) => v.id === venueId) ?? venues.data?.data[0];
  const create = useMutation({
    mutationFn: () => api.matches.create({ sport: activeSport, venueId: venue?.id ?? "", date, startTime, endTime: timeOf(Math.min(24 * 60, minutesOf(startTime) + duration)), level: level ?? team.data?.level ?? "intermediate", teamSize, costSplit, note }),
    onSuccess: async (match) => {
      await queryClient.invalidateQueries({ queryKey: ["matches"] });
      toast.success(t("matches.posted"));
      navigate(`/matches/${match.id}`, { replace: true });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (team.isPending) return <Container size="sm" className="flex flex-col gap-4 py-8"><Skeleton className="h-9 w-1/2" /><Skeleton className="h-72" /></Container>;

  if (!team.data) {
    return (
      <Container size="sm" className="pb-8">
        <PageHeader title={t("team.createTitle")} subtitle={t("team.createBody")} back="/matches" />
        <div className="rounded-3xl bg-card p-5"><TeamForm team={null} submitLabel={t("team.createCta")} /></div>
      </Container>
    );
  }

  return (
    <Container size="sm" className="pb-8">
      <PageHeader title={t("matches.newTitle")} subtitle={t("matches.newBody", { team: team.data.name })} back="/matches" />
      <form className="rounded-3xl bg-card p-5" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
        <FieldGroup>
          <Field>
            <FieldLabel id="m-sport">{t("venues.filterSport")}</FieldLabel>
            <ToggleGroup type="single" value={activeSport} onValueChange={(v) => { if (v) { setSport(v as MatchSport); setVenueId(""); setTeamSize(v === "football" ? 7 : 6); } }} aria-labelledby="m-sport">
              {MATCH_SPORTS.map((s) => (
                <ToggleGroupItem key={s} value={s} className="flex-1"><SportIcon sport={s} />{t(`sport.${s}`)}</ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>
          <Field>
            <FieldLabel htmlFor="m-venue">{t("matches.venue")}</FieldLabel>
            {venues.isPending ? <Skeleton className="h-12" /> : (
              <Select id="m-venue" value={venue?.id ?? ""} onChange={(e) => setVenueId(e.target.value)}>
                {venues.data?.data.map((v) => <option key={v.id} value={v.id}>{text.name(v)} · {v.district}</option>)}
              </Select>
            )}
            <FieldDescription>{t("matches.venueHint")}</FieldDescription>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field className="col-span-2 sm:col-span-1">
              <FieldLabel htmlFor="m-date">{t("common.date")}</FieldLabel>
              <Select id="m-date" value={date} onChange={(e) => setDate(e.target.value)}>
                {Array.from({ length: 21 }, (_, i) => addDays(dates.today, i)).map((d) => <option key={d} value={d}>{dates.day(d)}</option>)}
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="m-start">{t("venues.startTime")}</FieldLabel>
              <Select id="m-start" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="font-num">
                {TIMES.map((time) => <option key={time} value={time}>{time}</option>)}
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="m-dur">{t("venues.duration")}</FieldLabel>
              <Select id="m-dur" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {[60, 90, 120].map((m) => <option key={m} value={m}>{t("common.hours", { count: m / 60 })}</option>)}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="m-level">{t("team.level")}</FieldLabel>
              <Select id="m-level" value={level ?? team.data.level} onChange={(e) => setLevel(e.target.value as SkillLevel)}>
                {SKILL_LEVELS.map((l) => <option key={l} value={l}>{t(`level.${l}`)}</option>)}
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="m-size">{t("matches.perSide")}</FieldLabel>
              <Input id="m-size" type="number" inputMode="numeric" min={1} max={11} value={teamSize} onChange={(e) => setTeamSize(Math.max(1, Math.min(11, Number(e.target.value) || 1)))} />
            </Field>
          </div>
          <Field>
            <FieldLabel id="m-cost">{t("matches.whoPays")}</FieldLabel>
            <ToggleGroup type="single" value={costSplit} onValueChange={(v) => v && setCostSplit(v as CostSplit)} aria-labelledby="m-cost">
              {COST_SPLITS.map((c) => <ToggleGroupItem key={c} value={c}>{t(`matches.costSplit.${c}`)}</ToggleGroupItem>)}
            </ToggleGroup>
          </Field>
          <Field>
            <FieldLabel htmlFor="m-note">{t("matches.note")}</FieldLabel>
            <Textarea id="m-note" value={note} maxLength={400} onChange={(e) => setNote(e.target.value)} placeholder={t("matches.notePlaceholder")} />
          </Field>
          <Alert variant="info">{t("matches.bookLater")}</Alert>
          <Button type="submit" size="lg" disabled={create.isPending || !venue}>
            {create.isPending ? <Spinner /> : null}
            {t("matches.post")}
          </Button>
        </FieldGroup>
      </form>
    </Container>
  );
}
