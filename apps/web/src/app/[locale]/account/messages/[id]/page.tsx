import { use } from "react";
import { RequireAuth } from "@/features/auth/require-auth";
import { ChatThread } from "@/features/chat/chat";
import { usePageLocale } from "@/i18n/page";
import { requireFeature } from "@/lib/features";

export default function Page({ params }: { params: Promise<{ locale: string; id: string }> }) {
  usePageLocale(params);
  requireFeature("chat");
  const { id } = use(params);
  return (
    <RequireAuth>
      <ChatThread id={id} />
    </RequireAuth>
  );
}
