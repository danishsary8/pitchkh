"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Check, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useErrorMessage } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { qk } from "@/lib/query";

/**
 * Booking alerts in Telegram. "Connect" opens the bot with a one-time code;
 * the status refreshes when the owner comes back to this tab.
 */
export function TelegramCard() {
  const t = useTranslations("owner.telegram");
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const { data, isPending } = useQuery({ queryKey: qk.owner.telegram, queryFn: api.owner.telegram, refetchOnWindowFocus: true });
  const unlink = useMutation({
    mutationFn: api.owner.unlinkTelegram,
    onSuccess: (next) => {
      queryClient.setQueryData(qk.owner.telegram, next);
      toast(t("disconnected"));
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (isPending) return <Skeleton className="h-24" />;
  if (!data?.enabled) return null;
  return (
    <section aria-labelledby="tg-title" className="flex flex-col gap-3 rounded-3xl bg-card p-5 sm:flex-row sm:items-center">
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#229ED9] text-white" aria-hidden>
        {data.linked ? <BellRing className="size-6" /> : <Send className="size-6" />}
      </span>
      <div className="min-w-0 flex-1">
        <h2 id="tg-title" className="flex items-center gap-2 font-bold">
          {t("title")}
          {data.linked ? <span className="flex items-center gap-1 rounded-full bg-primary/12 px-2 py-0.5 text-xs font-bold text-primary"><Check className="size-3.5" />{t("on")}</span> : null}
        </h2>
        <p className="text-sm text-pretty text-muted-foreground">{data.linked ? t("linkedBody") : t("body")}</p>
      </div>
      {data.linked ? (
        <Button variant="ghost" disabled={unlink.isPending} onClick={() => unlink.mutate()}>{t("disconnect")}</Button>
      ) : data.linkUrl ? (
        <Button asChild className="bg-[#229ED9] text-white hover:bg-[#1c8cc2]">
          <a href={data.linkUrl} target="_blank" rel="noopener noreferrer">
            <Send />
            {t("connect")}
          </a>
        </Button>
      ) : null}
    </section>
  );
}
