import { createHash, randomBytes } from "node:crypto";
import { ApiError, isoInPP, type AuthSession, type User } from "@pitchkh/shared";
import { and, eq, gt } from "drizzle-orm";
import { errors as joseErrors, jwtVerify, SignJWT } from "jose";
import type { Tx } from "../db/client";
import { refreshTokens } from "../db/schema";
import { env } from "../env";

export const ACCESS_TTL_SECONDS = 60 * 60;
const REFRESH_TTL_MS = 30 * 86_400_000;
const secret = () => new TextEncoder().encode(env.jwtSecret);

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");

export async function signAccessToken(user: Pick<User, "id" | "role">, now: Date): Promise<string> {
  const iat = Math.floor(now.getTime() / 1000);
  return new SignJWT({ role: user.role }).setProtectedHeader({ alg: "HS256" }).setSubject(user.id).setIssuedAt(iat).setExpirationTime(iat + ACCESS_TTL_SECONDS).sign(secret());
}

/** Returns the user id in a valid access token. Expired tokens get 401 token_expired so the client refreshes. */
export async function verifyAccessToken(token: string, now: Date): Promise<string> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"], currentDate: now });
    if (!payload.sub) throw new ApiError(401, "unauthorized", "Invalid access token.");
    return payload.sub;
  } catch (e) {
    if (e instanceof joseErrors.JWTExpired) throw new ApiError(401, "token_expired", "Access token expired.");
    if (e instanceof ApiError) throw e;
    throw new ApiError(401, "unauthorized", "Invalid access token.");
  }
}

/** New session: a short-lived JWT plus a random refresh token (stored only as a hash). */
export async function issueSession(tx: Tx, user: User, now: Date): Promise<AuthSession> {
  const refreshToken = randomBytes(32).toString("base64url");
  await tx.insert(refreshTokens).values({ tokenHash: sha256(refreshToken), userId: user.id, expiresAt: new Date(now.getTime() + REFRESH_TTL_MS) });
  return { accessToken: await signAccessToken(user, now), refreshToken, expiresAt: isoInPP(new Date(now.getTime() + ACCESS_TTL_SECONDS * 1000)), user };
}

/** Uses up a refresh token (rotation: each one works once) and returns its user id. */
export async function consumeRefreshToken(tx: Tx, token: string, now: Date): Promise<string> {
  const [row] = await tx.delete(refreshTokens).where(and(eq(refreshTokens.tokenHash, sha256(token)), gt(refreshTokens.expiresAt, now))).returning();
  if (!row) throw new ApiError(401, "unauthorized", "Session expired. Sign in again.");
  return row.userId;
}

export async function revokeRefreshToken(tx: Tx, token: string): Promise<void> {
  await tx.delete(refreshTokens).where(eq(refreshTokens.tokenHash, sha256(token)));
}
