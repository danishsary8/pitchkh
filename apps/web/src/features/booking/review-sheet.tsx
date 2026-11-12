"use client";

import type { CreateReviewDto } from "@pitchkh/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { useErrorMessage } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Rate a venue (after playing) or an opponent team's sportsmanship (after a match). */
export function ReviewSheet({ open, onOpenChange, targetType, targetId, targetName, bookingId = null }: { open: boolean; onOpenChange: (open: boolean) => void; targetType: CreateReviewDto["targetType"]; targetId: string; targetName: string; bookingId?: string | null }) {
  const t = useTranslations("review");
  const tc = useTranslations("common");
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const mutation = useMutation({
    mutationFn: () => api.reviews.create({ targetType, targetId, bookingId, rating, comment }),
    onSuccess: async () => {
      toast.success(t("thanks"));
      onOpenChange(false);
      setRating(0);
      setComment("");
      await queryClient.invalidateQueries();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={targetType === "venue" ? t("venueTitle", { name: targetName }) : t("teamTitle", { name: targetName })}
      description={targetType === "venue" ? t("venueBody") : t("teamBody")}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>{tc("cancel")}</Button>
          <Button disabled={rating === 0 || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? <Spinner /> : null}
            {t("submit")}
          </Button>
        </>
      }
    >
      <FieldGroup>
        <div role="radiogroup" aria-label={t("rating")} className="flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={t("stars", { count: n })} onClick={() => setRating(n)} className="press grid size-12 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Star className={cn("size-9 transition-colors duration-150", n <= rating ? "fill-accent text-accent" : "fill-muted text-muted")} />
            </button>
          ))}
        </div>
        <Field>
          <FieldLabel htmlFor="review-comment">{t("comment")}</FieldLabel>
          <Textarea id="review-comment" value={comment} maxLength={600} onChange={(e) => setComment(e.target.value)} placeholder={t(targetType === "venue" ? "venuePlaceholder" : "teamPlaceholder")} />
        </Field>
      </FieldGroup>
    </Sheet>
  );
}
