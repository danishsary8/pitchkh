"use client";

import { Check, RotateCcw, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Price } from "@/components/common/price";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { type Booking, type BookingStatus, hhmm } from "@/lib/booking-rules";
import { branchName, findBranch } from "@/lib/branches";
import { useDates } from "@/lib/format";
import { ContactButtons, STATUS_VARIANT } from "./admin-page";

/** Everything about one booking, with the actions that fit its status. */
export function BookingSheet({ booking, onClose, onStatus, busy }: { booking: Booking | null; onClose: () => void; onStatus: (id: string, s: BookingStatus) => void; busy: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const dates = useDates();
  if (!booking) return null;
  const branch = findBranch(booking.branch);
  const field = branch?.fields.find((f) => f.id === booking.fieldId);
  const act = (next: BookingStatus) => {
    onStatus(booking.id, next);
    onClose();
  };
  const rows: [string, React.ReactNode][] = [
    [t("staff.detail.status"), <Badge key="s" variant={STATUS_VARIANT[booking.status]}>{t(`book.status.${booking.status}`)}</Badge>],
    [t("staff.detail.place"), `${branch ? branchName(branch, locale) : booking.branch} · ${field ? `${field.name} (${field.format})` : booking.fieldId}`],
    [t("staff.detail.when"), <span key="w" className="font-num">{dates.day(booking.date, false)} · {hhmm(booking.startMin)}–{hhmm(booking.endMin)}</span>],
    [t("staff.detail.phone"), booking.phone || "—"],
    [t("staff.detail.telegram"), booking.telegramUsername ? `@${booking.telegramUsername}` : "—"],
    [t("staff.detail.players"), booking.players],
    [t("staff.detail.price"), <Price key="p" usd={booking.priceUsd} />],
    [t("staff.detail.source"), t(`staff.source.${booking.source}`)],
    [t("staff.detail.sent"), dates.dateTime(booking.createdAt)],
  ];
  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }} title={`${booking.name} · ${booking.code}`}>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
        {booking.note ? (
          <>
            <dt className="text-muted-foreground">{t("staff.detail.note")}</dt>
            <dd className="whitespace-pre-wrap">{booking.note}</dd>
          </>
        ) : null}
      </dl>
      <div className="flex flex-wrap gap-2 pt-2">
        {booking.status === "pending" ? <Button disabled={busy} onClick={() => act("confirmed")}><Check />{t("staff.confirm")}</Button> : null}
        {booking.status !== "cancelled" ? (
          <Button variant="secondary" disabled={busy} onClick={() => act("cancelled")}><X />{booking.status === "pending" ? t("staff.decline") : t("staff.cancel")}</Button>
        ) : (
          <Button variant="secondary" disabled={busy} onClick={() => act("confirmed")}><RotateCcw />{t("staff.restore")}</Button>
        )}
        <ContactButtons booking={booking} />
      </div>
    </Sheet>
  );
}
