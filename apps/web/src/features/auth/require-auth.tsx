"use client";

import type { Role } from "@pitchkh/shared";
import { ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, type ReactNode } from "react";
import { Link } from "@/components/common/link";
import { EmptyState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useAuth } from "./auth-provider";

/** Role-based route guard. Signed-out visitors go to /login and come back afterwards. */
export function RequireAuth({ roles, children }: { roles?: readonly Role[]; children: ReactNode }) {
  const { user, status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("auth");

  useEffect(() => {
    if (status === "ready" && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, user, router, pathname]);

  if (status === "loading" || !user) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4" aria-busy>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  if (roles && !roles.includes(user.role)) {
    return (
      <EmptyState icon={<ShieldAlert />} title={t("noAccessTitle")} body={t("noAccessBody")}>
        <Button asChild>
          <Link href="/">{t("backHome")}</Link>
        </Button>
      </EmptyState>
    );
  }
  return <>{children}</>;
}
