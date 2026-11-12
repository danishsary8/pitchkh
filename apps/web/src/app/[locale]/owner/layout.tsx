import type { ReactNode } from "react";
import { RequireAuth } from "@/features/auth/require-auth";
import { OwnerShell } from "@/features/owner/owner-shell";

export default function OwnerLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth roles={["owner", "admin"]}>
      <OwnerShell>{children}</OwnerShell>
    </RequireAuth>
  );
}
