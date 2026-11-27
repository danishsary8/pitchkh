"use client";

import { Phone, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { Booking } from "@/lib/booking-rules";
import { callLink, chatLinks } from "@/lib/customer-contact";
import { getMiniApp } from "@/lib/telegram-webapp";

/** Badge colour for each booking status. */
export const STATUS_VARIANT = { pending: "warning", confirmed: "success", cancelled: "muted" } as const;

/**
 * Call and chat with the customer. Chat uses the best Telegram link we have
 * (@username, their Telegram account, or their phone number); when that is not
 * the phone number, a second "by phone" button covers privacy-blocked accounts.
 */
export function ContactButtons({ booking }: { booking: Booking }) {
  const t = useTranslations("staff");
  const call = callLink(booking.phone);
  const [best, ...rest] = chatLinks(booking);
  const byPhone = best && best.via !== "phone" ? rest.find((l) => l.via === "phone") : undefined;
  return (
    <>
      {call ? (
        <Button asChild size="sm" variant="ghost">
          <a href={call}><Phone />{t("call")}</a>
        </Button>
      ) : null}
      {best ? <ChatButton url={best.url} label={best.via === "phone" ? t("chatByPhone") : t("message")} /> : null}
      {byPhone ? <ChatButton url={byPhone.url} label={t("chatByPhone")} /> : null}
    </>
  );
}

/** Opens a Telegram chat; inside the Mini App t.me links stay in Telegram instead of leaving for a browser. */
function ChatButton({ url, label }: { url: string; label: string }) {
  const web = url.startsWith("https://");
  return (
    <Button asChild size="sm" variant="ghost">
      <a
        href={url}
        target={web ? "_blank" : undefined}
        rel={web ? "noopener noreferrer" : undefined}
        onClick={(e) => {
          const app = getMiniApp();
          if (app && web) {
            e.preventDefault();
            app.openTelegramLink(url);
          }
        }}
      >
        <Send />
        {label}
      </a>
    </Button>
  );
}

