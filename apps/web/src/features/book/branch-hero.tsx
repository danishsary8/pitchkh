"use client";

import { Clock, MapPin, Navigation } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { KramaStrip } from "@/components/brand/pitch-art";
import { Link } from "@/components/common/link";
import { Button } from "@/components/ui/button";
import { type Branch, branchName } from "@/lib/branches";
import { OwnerChatButton } from "./owner-chat";

/** The branch's photo with its name, address, hours and the two ways to reach it. */
export function BranchHero({ branch }: { branch: Branch }) {
  const t = useTranslations();
  const locale = useLocale();
  const name = branchName(branch, locale);
  return (
    <>
      <header className="relative isolate overflow-hidden bg-[#0c1f1a] text-white">
        {branch.photos[0] ? <Image src={branch.photos[0]} alt="" fill priority sizes="100vw" className="-z-10 object-cover opacity-80" /> : null}
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(7_18_14/0.45)_0%,rgb(7_18_14/0.92)_100%)]" />
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 pt-5 pb-6 lg:px-6 lg:pt-8 lg:pb-9">
          <Link href="/" className="w-fit rounded-full bg-white/12 px-3 py-1 text-sm font-semibold text-white/90 backdrop-blur-md hover:bg-white/20">
            ← {t("book.branch.allBranches")}
          </Link>
          <h1 className="font-display mt-10 text-[clamp(2.25rem,9vw,4.25rem)] sm:mt-16">{name}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/80">
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4" aria-hidden />
              {branch.address}, {branch.district}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden />
              <span className="font-num">{branch.open}–{branch.close}</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild variant="inverse" size="sm">
              <a href={branch.mapsUrl} target="_blank" rel="noopener noreferrer">
                <Navigation />
                {t("book.branch.directions")}
              </a>
            </Button>
            <OwnerChatButton size="sm" variant="accent" message={t("book.chat.hello", { branch: name })} />
          </div>
        </div>
      </header>
      <KramaStrip />
    </>
  );
}
