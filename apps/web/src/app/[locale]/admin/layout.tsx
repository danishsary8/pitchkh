import type { ReactNode } from "react";
import { AdminShell } from "@/features/admin/admin-pages";
import { RequireAuth } from "@/features/auth/require-auth";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth roles={["admin"]}>
      <AdminShell>{children}</AdminShell>
    </RequireAuth>
  );
}
