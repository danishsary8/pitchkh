import { ApiError, type TelegramStatus, type User } from "@pitchkh/shared";
import { eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { telegramLinks } from "../db/schema";
import { insertNotification, type Route } from "../http";
import { newLinkCode, ownerByChat, telegramText, type TelegramClient } from "../telegram";
import { decideBooking } from "./owner";

const OWNER = ["owner", "admin"] as const;

async function statusFor(db: Database, telegram: TelegramClient | undefined, user: User): Promise<TelegramStatus> {
  if (!telegram) return { enabled: false, linked: false, linkUrl: null };
  const [link] = await db.select().from(telegramLinks).where(eq(telegramLinks.userId, user.id));
  if (link?.chatId) return { enabled: true, linked: true, linkUrl: null };
  let code = link?.linkCode;
  if (!code) {
    code = newLinkCode();
    await db.insert(telegramLinks).values({ userId: user.id, linkCode: code, chatId: null });
  }
  return { enabled: true, linked: false, linkUrl: `https://t.me/${telegram.config.username}?start=${code}` };
}

interface TelegramUpdate {
  message?: { chat: { id: number }; text?: string };
  callback_query?: { id: string; data?: string; message?: { chat: { id: number }; message_id: number; text?: string } };
}

export function registerTelegramRoutes(route: Route, telegram: TelegramClient | undefined): void {
  route("GET", "/owner/telegram", OWNER, ({ db, requireUser }) => statusFor(db, telegram, requireUser()));

  route("DELETE", "/owner/telegram", OWNER, async ({ db, requireUser }) => {
    const user = requireUser();
    await db.delete(telegramLinks).where(eq(telegramLinks.userId, user.id));
    return statusFor(db, telegram, user);
  });

  // Telegram calls this for every message to the bot and every button press.
  route("POST", "/telegram/webhook", "public", async ({ db, body, header, now }) => {
    if (!telegram || header("x-telegram-bot-api-secret-token") !== telegram.config.webhookSecret || !telegram.config.webhookSecret) {
      throw new ApiError(403, "forbidden", "Not a Telegram call.");
    }
    const update = body as TelegramUpdate;

    const start = update.message?.text?.match(/^\/start\s+(\S+)/);
    if (update.message && start) {
      const chatId = update.message.chat.id;
      // The code works once: linking swaps in a fresh code so a leaked link can't hijack alerts.
      const [linked] = await db.update(telegramLinks).set({ chatId, linkCode: newLinkCode() }).where(eq(telegramLinks.linkCode, start[1] as string)).returning();
      const owner = linked ? await ownerByChat(db, chatId) : null;
      await telegram.call("sendMessage", { chat_id: chatId, text: telegramText(owner?.locale)[linked ? "linked" : "unknownCode"] });
      return { ok: true };
    }

    const press = update.callback_query;
    const action = press?.data?.match(/^(accept|reject):([0-9a-f-]{36})$/);
    if (press && action && press.message) {
      const owner = await ownerByChat(db, press.message.chat.id);
      const tx = telegramText(owner?.locale);
      let note: string;
      try {
        if (!owner) throw new ApiError(403, "forbidden", "This chat is not linked to a PitchKH owner.");
        const decision = action[1] as "accept" | "reject";
        await decideBooking(
          {
            db,
            requireUser: () => owner,
            notify: async (t, userId, type, params, href) => insertNotification(t, now, userId, type, params, href),
          },
          action[2],
          decision,
        );
        note = decision === "accept" ? tx.accepted : tx.declined;
      } catch (e) {
        note = e instanceof ApiError ? e.message : "Something went wrong.";
      }
      await telegram.call("answerCallbackQuery", { callback_query_id: press.id, text: note });
      // Replace the buttons with the outcome so nobody presses twice.
      await telegram.call("editMessageText", { chat_id: press.message.chat.id, message_id: press.message.message_id, text: `${press.message.text ?? ""}\n\n${note}` });
    }
    return { ok: true };
  });
}
