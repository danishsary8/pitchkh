import { z } from "zod";
import { Id, IsoDateTime } from "./common";

export const ConversationKind = z.enum(["match", "venue", "support"]);

export const Message = z.object({
  id: Id,
  conversationId: Id,
  senderId: Id,
  senderName: z.string(),
  body: z.string().min(1).max(1000),
  createdAt: IsoDateTime,
});

export const Conversation = z.object({
  id: Id,
  kind: ConversationKind,
  title: z.string(),
  matchRequestId: Id.nullable(),
  participantIds: z.array(Id),
  lastMessage: z.string().nullable(),
  lastMessageAt: IsoDateTime,
  unreadCount: z.number().int(),
});

export const ConversationDetail = Conversation.extend({
  messages: z.array(Message),
  participants: z.array(z.object({ id: Id, name: z.string() })),
});

export const SendMessageDto = z.object({ body: z.string().trim().min(1).max(1000) });

/** Opens (or reuses) a thread between the signed-in player and a venue owner. */
export const StartConversationDto = z.object({ venueId: Id });
