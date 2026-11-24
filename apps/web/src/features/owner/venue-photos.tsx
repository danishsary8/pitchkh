"use client";

import { schemas, type VenueDetail } from "@pitchkh/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Star, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { toast } from "sonner";
import { useErrorMessage } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import { api } from "@/lib/api";
import { qk } from "@/lib/query";

/** Shrinks a photo in the browser (max 1600 px, WebP) so uploads stay small on mobile data. */
async function toUploadDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/webp", 0.82);
}

/** Owner: add, order (the first is the cover) and remove a venue's photos. */
export function VenuePhotos({ venue }: { venue: VenueDetail }) {
  const t = useTranslations("owner.photos");
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const input = useRef<HTMLInputElement>(null);
  const refresh = (): void => {
    void queryClient.invalidateQueries({ queryKey: qk.owner.venues });
    void queryClient.invalidateQueries({ queryKey: qk.venue(venue.slug) });
  };
  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      for (const file of files.slice(0, schemas.MAX_VENUE_PHOTOS - venue.photos.length)) await api.owner.uploadPhoto(venue.id, await toUploadDataUrl(file));
    },
    onSuccess: () => {
      refresh();
      toast.success(t("added"));
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const reorder = useMutation({ mutationFn: (photos: string[]) => api.owner.setPhotos(venue.id, photos), onSuccess: refresh, onError: (e) => toast.error(errorMessage(e)) });
  const full = venue.photos.length >= schemas.MAX_VENUE_PHOTOS;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold">{t("title")} <span className="font-num text-sm font-normal text-muted-foreground">{venue.photos.length}/{schemas.MAX_VENUE_PHOTOS}</span></h3>
        <Button variant="ghost" size="sm" className="h-10" disabled={full || upload.isPending} onClick={() => input.current?.click()}>
          {upload.isPending ? <Spinner /> : <ImagePlus />}
          {t("add")}
        </Button>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          if (files.length) upload.mutate(files);
        }} />
      </div>
      {venue.photos.length === 0 ? (
        <button type="button" onClick={() => input.current?.click()} className="press flex h-28 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-sm font-semibold text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ImagePlus className="size-5" />
          {t("empty")}
        </button>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {venue.photos.map((photo, i) => (
            <li key={photo} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-pitch">
              {/* eslint-disable-next-line @next/next/no-img-element -- owner previews may be data URLs or any API host */}
              <img src={photo} alt={t("alt", { n: i + 1 })} className="size-full object-cover" loading="lazy" />
              {i === 0 ? <span className="absolute top-1.5 left-1.5 rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">{t("cover")}</span> : null}
              <span className="absolute right-1 bottom-1 flex gap-1">
                {i > 0 ? (
                  <Button size="icon" variant="secondary" className="size-11 rounded-full bg-black/55 text-white hover:bg-black/70" disabled={reorder.isPending} aria-label={t("makeCover", { n: i + 1 })} onClick={() => reorder.mutate([photo, ...venue.photos.filter((p) => p !== photo)])}>
                    <Star />
                  </Button>
                ) : null}
                <Button size="icon" variant="secondary" className="size-11 rounded-full bg-black/55 text-white hover:bg-destructive" disabled={reorder.isPending} aria-label={t("remove", { n: i + 1 })} onClick={() => reorder.mutate(venue.photos.filter((p) => p !== photo))}>
                  <Trash2 />
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
