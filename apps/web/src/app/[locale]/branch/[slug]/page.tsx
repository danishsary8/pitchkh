import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { BranchBooking } from "@/features/book/branch-booking";
import { routing } from "@/i18n/routing";
import { BRANCHES, branchName, findBranch } from "@/lib/branches";

export function generateStaticParams() {
  return BRANCHES.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const branch = findBranch(slug);
  return branch ? { title: branchName(branch, locale), description: `${branch.address}, ${branch.district}` } : {};
}

export default async function Page({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  if (!findBranch(slug)) notFound();
  return <BranchBooking slug={slug} />;
}
