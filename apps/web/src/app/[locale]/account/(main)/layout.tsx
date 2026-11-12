import type { ReactNode } from "react";
import { AccountShell } from "@/features/account/account-shell";
import { RequireAuth } from "@/features/auth/require-auth";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <AccountShell>{children}</AccountShell>
    </RequireAuth>
  );
}
