"use client";

import { Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { openTelegramLink } from "@/lib/telegram-webapp";

/** The business's Telegram username (without @). Set NEXT_PUBLIC_OWNER_TELEGRAM in Vercel. */
const OWNER = (process.env.NEXT_PUBLIC_OWNER_TELEGRAM ?? "").replace(/^@/, "").trim();

/** Opens a Telegram chat with the business, with the message typed in. Hidden until the username is set. */
export function OwnerChatButton({ message, size, variant = "secondary", className }: { message: string; size?: "sm" | "default" | "lg"; variant?: "secondary" | "default" | "accent"; className?: string }) {
  const t = useTranslations("book.chat");
  if (!OWNER) return null;
  const href = `https://t.me/${OWNER}?text=${encodeURIComponent(message)}`;
  return (
    <Button asChild size={size} variant={variant} className={className}>
      <a href={href} target="_blank" rel="noopener noreferrer" onClick={(e) => { if (openTelegramLink(href)) e.preventDefault(); }}>
        <Send />
        {t("button")}
      </a>
    </Button>
  );
}
