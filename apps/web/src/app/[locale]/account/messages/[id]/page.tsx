import { use } from "react";
import { RequireAuth } from "@/features/auth/require-auth";
import { ChatThread } from "@/features/chat/chat";
import { usePageLocale } from "@/i18n/page";

export default function Page({ params }: { params: Promise<{ locale: string; id: string }> }) {
  usePageLocale(params);
  const { id } = use(params);
  return (
    <RequireAuth>
      <ChatThread id={id} />
    </RequireAuth>
  );
}
