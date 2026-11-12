"use client";

import { REPORT_REASONS, type CreateReportDto } from "@pitchkh/shared";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { useErrorMessage } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { api } from "@/lib/api";

/** Report a venue, user, review or match to the platform admins. */
export function ReportSheet({ open, onOpenChange, targetType, targetId }: { open: boolean; onOpenChange: (open: boolean) => void; targetType: CreateReportDto["targetType"]; targetId: string }) {
  const t = useTranslations("report");
  const tc = useTranslations("common");
  const errorMessage = useErrorMessage();
  const [reason, setReason] = useState<CreateReportDto["reason"]>("wrong_info");
  const [details, setDetails] = useState("");
  const mutation = useMutation({
    mutationFn: () => api.venues.report({ targetType, targetId, reason, details }),
    onSuccess: () => {
      toast.success(t("sent"));
      setDetails("");
      onOpenChange(false);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      description={t("body")}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>{tc("cancel")}</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? <Spinner /> : null}
            {t("send")}
          </Button>
        </>
      }
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="report-reason">{t("reason")}</FieldLabel>
          <Select id="report-reason" value={reason} onChange={(e) => setReason(e.target.value as CreateReportDto["reason"])}>
            {REPORT_REASONS.map((r) => (
              <option key={r} value={r}>{t(`reasons.${r}`)}</option>
            ))}
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="report-details">{t("details")}</FieldLabel>
          <Textarea id="report-details" value={details} maxLength={600} onChange={(e) => setDetails(e.target.value)} placeholder={t("detailsPlaceholder")} />
        </Field>
      </FieldGroup>
    </Sheet>
  );
}
