"use client";

import type { Paginated, VenueDetail, VenueSummary } from "@pitchkh/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useNavigate } from "@/components/common/link";
import { useErrorMessage } from "@/components/common/states";
import { useAuth } from "@/features/auth/auth-provider";
import { usePathname } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Heart toggle with optimistic UI: the heart fills at once and rolls back if the request fails. */
export function FavoriteButton({ venueId, isFavorite, className }: { venueId: string; isFavorite: boolean; className?: string }) {
  const t = useTranslations("venues");
  const { user } = useAuth();
  const navigate = useNavigate();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();

  const patch = (favorite: boolean): void => {
    queryClient.setQueriesData<Paginated<VenueSummary> | VenueDetail>({ queryKey: ["venues"] }, (old) => {
      if (!old) return old;
      if ("data" in old) return { ...old, data: old.data.map((v) => (v.id === venueId ? { ...v, isFavorite: favorite } : v)) };
      return old.id === venueId ? { ...old, isFavorite: favorite } : old;
    });
  };
  const mutation = useMutation({
    mutationFn: (favorite: boolean) => api.venues.setFavorite(venueId, favorite),
    onMutate: (favorite) => patch(favorite),
    onError: (error, favorite) => {
      patch(!favorite);
      toast.error(errorMessage(error));
    },
    onSuccess: (_, favorite) => toast(favorite ? t("savedToFavorites") : t("removedFromFavorites")),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["venues", "list"] }),
  });

  return (
    <button
      type="button"
      aria-pressed={isFavorite}
      aria-label={isFavorite ? t("removeFavorite") : t("addFavorite")}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!user) return navigate(`/login?next=${encodeURIComponent(pathname)}`);
        mutation.mutate(!isFavorite);
      }}
      className={cn("press grid size-11 place-items-center rounded-full bg-white/95 text-[#0c1f1a] outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
    >
      <Heart className={cn("size-5 transition-transform duration-200 ease-out", isFavorite && "scale-110 fill-krama text-krama")} />
    </button>
  );
}
