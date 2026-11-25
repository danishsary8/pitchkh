"use client";

import { addDays, MATCH_SPORTS, PROVINCES, SKILL_LEVELS, type MatchSport, type Province, type SkillLevel } from "@pitchkh/shared";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Plus, Swords } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { SportIcon } from "@/components/brand/pitch-art";
import { Link } from "@/components/common/link";
import { Stagger, StaggerItem } from "@/components/common/motion";
import { Container, PageHeader, Pagination, StickyBar } from "@/components/common/page";
import { TelegramGroupBanner } from "@/features/telegram/telegram";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { api } from "@/lib/api";
import { useDates } from "@/lib/format";
import { qk } from "@/lib/query";
import { cn } from "@/lib/utils";
import { MatchCard, MatchCardSkeleton } from "./match-card";

export function MatchesBoard() {
  const t = useTranslations();
  const dates = useDates();
  const [sport, setSport] = useState<MatchSport | "all">("all");
  const [province, setProvince] = useState<Province | "">("");
  const [level, setLevel] = useState<SkillLevel | "">("");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const query = { sport: sport === "all" ? undefined : sport, province: province || undefined, level: level || undefined, date: date || undefined, page, pageSize: 9 };
  const { data, isPending, isError, error, refetch, isPlaceholderData } = useQuery({ queryKey: qk.matches(query), queryFn: () => api.matches.list(query), placeholderData: keepPreviousData });
  const reset = (): void => { setSport("all"); setProvince(""); setLevel(""); setDate(""); setPage(1); };
  const filtered = sport !== "all" || province || level || date;
  const days = Array.from({ length: 10 }, (_, i) => addDays(dates.today, i));
  const postButton = (
    <Button asChild size="lg" className="max-lg:flex-1">
      <Link href="/matches/new">
        <Plus />
        {t("matches.post")}
      </Link>
    </Button>
  );

  return (
    <Container className="pb-20 lg:pb-0">
      <PageHeader title={t("matches.title")} subtitle={t("matches.subtitle")} action={<div className="hidden lg:block">{postButton}</div>} />
      <TelegramGroupBanner className="mb-5" />
      <div className="flex flex-col gap-3 pb-5">
        <ToggleGroup type="single" value={sport} onValueChange={(v) => { if (v) { setSport(v as MatchSport | "all"); setPage(1); } }} aria-label={t("venues.filterSport")}>
          <ToggleGroupItem value="all">{t("common.all")}</ToggleGroupItem>
          {MATCH_SPORTS.map((s) => (
            <ToggleGroupItem key={s} value={s}>
              <SportIcon sport={s} />
              {t(`sport.${s}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="grid grid-cols-3 gap-2 sm:max-w-xl">
          <Select aria-label={t("venues.filterProvince")} value={province} onChange={(e) => { setProvince(e.target.value as Province | ""); setPage(1); }} className="px-3 pr-8 text-sm">
            <option value="">{t("province.all")}</option>
            {PROVINCES.map((p) => <option key={p} value={p}>{t(`province.${p}`)}</option>)}
          </Select>
          <Select aria-label={t("team.level")} value={level} onChange={(e) => { setLevel(e.target.value as SkillLevel | ""); setPage(1); }} className="px-3 pr-8 text-sm">
            <option value="">{t("level.all")}</option>
            {SKILL_LEVELS.map((l) => <option key={l} value={l}>{t(`level.${l}`)}</option>)}
          </Select>
          <Select aria-label={t("venues.filterWhen")} value={date} onChange={(e) => { setDate(e.target.value); setPage(1); }} className="px-3 pr-8 text-sm">
            <option value="">{t("venues.anyDay")}</option>
            {days.map((d) => <option key={d} value={d}>{dates.day(d)}</option>)}
          </Select>
        </div>
      </div>

      <h2 className="sr-only">{t("venues.results")}</h2>
      {isPending ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-busy>{Array.from({ length: 6 }, (_, i) => <MatchCardSkeleton key={i} />)}</div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data.data.length === 0 ? (
        <EmptyState icon={<Swords />} title={t("matches.emptyTitle")} body={t("matches.emptyBody")}>
          {filtered ? <Button variant="secondary" onClick={reset}>{t("venues.clearFilters")}</Button> : null}
          <Button asChild><Link href="/matches/new">{t("matches.post")}</Link></Button>
        </EmptyState>
      ) : (
        <>
          <Stagger key={JSON.stringify(query)} className={cn("grid gap-3 transition-opacity md:grid-cols-2 xl:grid-cols-3", isPlaceholderData && "opacity-60")}>
            {data.data.map((match) => (
              <StaggerItem key={match.id}><MatchCard match={match} className="h-full" /></StaggerItem>
            ))}
          </Stagger>
          <Pagination page={page} totalPages={data.meta.totalPages} onChange={setPage} />
        </>
      )}
      <StickyBar>{postButton}</StickyBar>
    </Container>
  );
}
