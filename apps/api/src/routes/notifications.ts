import { notFound } from "@pitchkh/shared/mock";
import { and, desc, eq } from "drizzle-orm";
import { toNotification } from "../db/mappers";
import { notifications } from "../db/schema";
import type { Route } from "../http";

export function registerNotificationRoutes(route: Route): void {
  route("GET", "/notifications", "auth", async ({ db, requireUser }) => {
    const user = requireUser();
    return (await db.select().from(notifications).where(eq(notifications.userId, user.id)).orderBy(desc(notifications.createdAt)).limit(50)).map(toNotification);
  });

  // Declared before /:id/read so "read-all" is not taken for an id.
  route("POST", "/notifications/read-all", "auth", async ({ db, requireUser }) => {
    await db.update(notifications).set({ read: true }).where(eq(notifications.userId, requireUser().id));
    return undefined;
  });

  route("POST", "/notifications/:id/read", "auth", async ({ db, params, requireUser }) => {
    const user = requireUser();
    if (!/^[0-9a-f-]{36}$/i.test(params.id ?? "")) throw notFound("Notification");
    const [row] = await db.update(notifications).set({ read: true }).where(and(eq(notifications.id, params.id ?? ""), eq(notifications.userId, user.id))).returning();
    if (!row) throw notFound("Notification");
    return toNotification(row);
  });
}
