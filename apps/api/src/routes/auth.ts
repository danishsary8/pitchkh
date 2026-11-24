import { ApiError, schemas as s } from "@pitchkh/shared";
import { parse } from "@pitchkh/shared/mock";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { consumeRefreshToken, issueSession, revokeRefreshToken } from "../auth/tokens";
import { toUser } from "../db/mappers";
import { passwordResets, refreshTokens, users } from "../db/schema";
import { env } from "../env";
import { resetEmail, type Mailer } from "../mailer";

const RESET_TTL_MS = 30 * 60_000;
const sha256 = (v: string): string => createHash("sha256").update(v).digest("hex");
import type { Route } from "../http";

export function registerAuthRoutes(route: Route, mailer: Mailer): void {
  // Same answer whether or not the email exists, so accounts can't be discovered.
  route("POST", "/auth/forgot-password", "public", async ({ db, body, now, after }) => {
    const { email } = parse(s.ForgotPasswordDto, body);
    const [row] = await db.select().from(users).where(eq(sql`lower(${users.email})`, email.toLowerCase()));
    if (row && row.status === "active") {
      const token = randomBytes(24).toString("base64url");
      await db.insert(passwordResets).values({ tokenHash: sha256(token), userId: row.id, expiresAt: new Date(now.getTime() + RESET_TTL_MS) });
      const mail = resetEmail(row.locale, `${env.webUrl}/${row.locale}/reset-password?token=${token}`);
      after(() => void mailer.send(row.email, mail.subject, mail.text).catch((e: unknown) => console.error("reset email failed", e)));
    }
    return { sent: true };
  });

  route("POST", "/auth/reset-password", "public", async ({ db, body, now }) => {
    const dto = parse(s.ResetPasswordDto, body);
    return db.transaction(async (tx) => {
      // Single use: the token is deleted as it is checked.
      const [reset] = await tx.delete(passwordResets).where(and(eq(passwordResets.tokenHash, sha256(dto.token)), gt(passwordResets.expiresAt, now))).returning();
      if (!reset) throw new ApiError(400, "invalid_token", "This reset link has expired. Ask for a new one.");
      const [row] = await tx.update(users).set({ passwordHash: await bcrypt.hash(dto.password, 10) }).where(eq(users.id, reset.userId)).returning();
      // New password: every other session and reset link stops working.
      await tx.delete(refreshTokens).where(eq(refreshTokens.userId, reset.userId));
      await tx.delete(passwordResets).where(eq(passwordResets.userId, reset.userId));
      if (!row || row.status !== "active") throw new ApiError(403, "account_suspended", "This account is suspended.");
      return issueSession(tx, toUser(row), now);
    });
  });

  route("POST", "/auth/login", "public", async ({ db, body, now }) => {
    const dto = parse(s.LoginDto, body);
    const [row] = await db.select().from(users).where(eq(sql`lower(${users.email})`, dto.email.toLowerCase()));
    // Same message for a wrong email and a wrong password, so accounts can't be probed.
    if (!row || !(await bcrypt.compare(dto.password, row.passwordHash))) throw new ApiError(401, "invalid_credentials", "Email or password is incorrect.");
    if (row.status === "suspended") throw new ApiError(403, "account_suspended", "This account is suspended.");
    return issueSession(db, toUser(row), now);
  });

  route("POST", "/auth/register", "public", async ({ db, body, now, newId }) => {
    const dto = parse(s.RegisterDto, body);
    const [taken] = await db.select({ id: users.id }).from(users).where(eq(sql`lower(${users.email})`, dto.email.toLowerCase()));
    if (taken) throw new ApiError(409, "email_taken", "An account with this email already exists.", { email: ["Already registered"] });
    const [row] = await db.insert(users).values({
      id: newId(), role: dto.role, name: dto.name, email: dto.email, phone: dto.phone, passwordHash: await bcrypt.hash(dto.password, 10),
      avatarUrl: null, locale: "en", status: "active", teamId: null, homeProvince: "phnom_penh", createdAt: now,
    }).returning();
    return issueSession(db, toUser(row as typeof users.$inferSelect), now);
  });

  route("POST", "/auth/refresh", "public", async ({ db, body, now }) => {
    const { refreshToken } = parse(s.RefreshDto, body);
    return db.transaction(async (tx) => {
      const userId = await consumeRefreshToken(tx, refreshToken, now);
      const [row] = await tx.select().from(users).where(eq(users.id, userId));
      if (!row || row.status === "suspended") throw new ApiError(401, "unauthorized", "Session expired. Sign in again.");
      return issueSession(tx, toUser(row), now);
    });
  });

  // The client may send its refresh token so the server can revoke it.
  route("POST", "/auth/logout", "public", async ({ db, body }) => {
    const token = (body as { refreshToken?: unknown } | undefined)?.refreshToken;
    if (typeof token === "string") await revokeRefreshToken(db, token);
    return undefined;
  });

  route("GET", "/auth/me", "auth", ({ requireUser }) => requireUser());

  route("PATCH", "/auth/me", "auth", async ({ db, requireUser, body }) => {
    const user = requireUser();
    const dto = parse(s.UpdateProfileDto, body);
    const [row] = await db.update(users).set(dto).where(eq(users.id, user.id)).returning();
    return toUser(row as typeof users.$inferSelect);
  });
}
