"use client";

import type { ConversationDetail, Message } from "@pitchkh/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Headset, MessageCircle, Send, Store, Swords } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Link } from "@/components/common/link";
import { EmptyState, ErrorState, useErrorMessage } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-provider";
import { api } from "@/lib/api";
import { useDates } from "@/lib/format";
import { qk } from "@/lib/query";
import { cn } from "@/lib/utils";

const KIND_ICON = { match: Swords, venue: Store, support: Headset } as const;

export function ConversationList() {
  const t = useTranslations("chat");
  const dates = useDates();
  const { data, isPending, isError, error, refetch } = useQuery({ queryKey: qk.conversations, queryFn: api.chat.list, refetchInterval: 20_000 });
  if (isPending) return <div className="flex flex-col gap-2" aria-busy>{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (data.length === 0) return <EmptyState icon={<MessageCircle />} title={t("emptyTitle")} body={t("emptyBody")} />;
  return (
    <ul className="flex flex-col gap-2">
      {data.map((c) => {
        const Icon = KIND_ICON[c.kind];
        return (
          <li key={c.id}>
            <Link href={`/account/messages/${c.id}`} className="press flex items-center gap-3 rounded-2xl bg-card p-3.5 outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-secondary text-primary"><Icon className="size-5.5" /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={cn("truncate", c.unreadCount ? "font-bold" : "font-semibold")}>{c.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{dates.ago(c.lastMessageAt)}</span>
                </span>
                <span className="flex items-center justify-between gap-2">
                  <span className={cn("truncate text-sm", c.unreadCount ? "text-foreground" : "text-muted-foreground")}>{c.lastMessage ?? t("noMessages")}</span>
                  {c.unreadCount ? <span className="font-num grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">{c.unreadCount}</span> : null}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** A simple chat thread. New messages appear at once (optimistic) and the thread polls for replies. */
export function ChatThread({ id }: { id: string }) {
  const t = useTranslations("chat");
  const dates = useDates();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const [body, setBody] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const { data, isPending, isError, error, refetch } = useQuery({ queryKey: qk.conversation(id), queryFn: () => api.chat.get(id), refetchInterval: 8_000 });
  const count = data?.messages.length ?? 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
    if (count > 0) void api.chat.markRead(id).then(() => queryClient.invalidateQueries({ queryKey: qk.conversations }));
  }, [count, id, queryClient]);

  const send = useMutation({
    mutationFn: (text: string) => api.chat.send(id, text),
    onMutate: async (text) => {
      await queryClient.cancelQueries({ queryKey: qk.conversation(id) });
      const previous = queryClient.getQueryData<ConversationDetail>(qk.conversation(id));
      const optimistic: Message = { id: `temp-${Date.now()}`, conversationId: id, senderId: user?.id ?? "", senderName: user?.name ?? "", body: text, createdAt: new Date().toISOString() };
      if (previous) queryClient.setQueryData(qk.conversation(id), { ...previous, messages: [...previous.messages, optimistic] });
      setBody("");
      return { previous, text };
    },
    onError: (e, _text, context) => {
      if (context?.previous) queryClient.setQueryData(qk.conversation(id), context.previous);
      setBody(context?.text ?? "");
      toast.error(errorMessage(e));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.conversation(id) }),
  });
  const submit = (event: React.FormEvent): void => {
    event.preventDefault();
    const text = body.trim();
    if (text) send.mutate(text);
  };

  return (
    <div className="mx-auto flex h-[calc(100dvh-var(--header-h))] w-full max-w-3xl flex-col lg:h-[calc(100dvh-4rem)]">
      <div className="flex items-center gap-2 px-2 py-2">
        <Button asChild variant="ghost" size="icon"><Link href="/account/messages" aria-label={t("back")}><ChevronLeft /></Link></Button>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold">{data?.title ?? t("title")}</h1>
          {data ? <p className="truncate text-xs text-muted-foreground">{data.participants.map((p) => p.name).join(", ")}</p> : null}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-4 py-3" role="log" aria-live="polite" aria-label={t("title")}>
        {isPending ? [0, 1, 2].map((i) => <Skeleton key={i} className={cn("h-12 w-2/3", i % 2 && "self-end")} />) : null}
        {isError ? <ErrorState error={error} onRetry={() => void refetch()} /> : null}
        {data?.messages.length === 0 ? <p className="my-auto text-center text-muted-foreground">{t("startHint")}</p> : null}
        {data?.messages.map((m, i) => {
          const own = m.senderId === user?.id;
          const first = data.messages[i - 1]?.senderId !== m.senderId;
          return (
            <div key={m.id} className={cn("flex max-w-[82%] flex-col gap-0.5", own ? "self-end items-end" : "self-start items-start", first && i > 0 && "mt-2")}>
              {first && !own ? <span className="px-1 text-xs font-semibold text-muted-foreground">{m.senderName}</span> : null}
              <p className={cn("rounded-2xl px-3.5 py-2.5 text-[0.95rem] text-pretty break-words whitespace-pre-wrap", own ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-card", m.id.startsWith("temp-") && "opacity-70")}>{m.body}</p>
              <span className="font-num px-1 text-[0.7rem] text-muted-foreground">{dates.dateTime(m.createdAt)}</span>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={submit} className="flex items-end gap-2 bg-card px-3 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] shadow-[0_-1px_0_var(--border)]">
        <label htmlFor="chat-input" className="sr-only">{t("placeholder")}</label>
        <textarea id="chat-input" rows={1} value={body} maxLength={1000} enterKeyHint="send" onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) submit(e); }} placeholder={t("placeholder")} className="max-h-32 min-h-11 flex-1 resize-none rounded-3xl bg-secondary px-4 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        <Button type="submit" size="icon" disabled={!body.trim()} aria-label={t("send")}><Send /></Button>
      </form>
    </div>
  );
}
